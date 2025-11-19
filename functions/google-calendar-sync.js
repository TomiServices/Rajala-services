/**
 * Google Calendar Synchronization Functions
 * 
 * This module contains Firebase Cloud Functions for syncing appointments
 * with Google Calendar via webhooks and scheduled tasks.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getCalendarEvents
} = require('./google-calendar-service');

/**
 * Sync changes from Google Calendar to Firebase
 * This function fetches recent changes and updates the database
 */
async function syncGoogleCalendarChanges() {
    try {
        // Get events from the last 7 days to catch any changes
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 60); // Next 60 days

        const googleEvents = await getCalendarEvents(startDate, endDate);
        console.log(`Fetched ${googleEvents.length} events from Google Calendar`);

        // Get all appointments from Firebase
        const appointmentsSnapshot = await admin.database().ref('appointments').once('value');
        const appointments = appointmentsSnapshot.val() || {};

        // Create a map of Google Calendar IDs to Firebase appointments
        const googleIdMap = {};
        Object.keys(appointments).forEach(appointmentId => {
            const appointment = appointments[appointmentId];
            if (appointment.googleCalendarId) {
                googleIdMap[appointment.googleCalendarId] = appointmentId;
            }
        });

        // Process each Google Calendar event
        for (const googleEvent of googleEvents) {
            const googleEventId = googleEvent.id;
            const appointmentId = googleIdMap[googleEventId];

            if (appointmentId) {
                // Event exists in Firebase - check for updates
                const appointment = appointments[appointmentId];
                const eventStart = new Date(googleEvent.start.dateTime || googleEvent.start.date);
                const currentStart = new Date(appointment.startTime);

                // Check if event was modified in Google Calendar
                if (eventStart.getTime() !== currentStart.getTime()) {
                    console.log(`Event ${googleEventId} was modified in Google Calendar`);
                    
                    // Update Firebase with new time
                    const endTime = new Date(eventStart.getTime() + 60 * 60 * 1000);
                    await admin.database().ref(`appointments/${appointmentId}`).update({
                        startTime: eventStart.toISOString(),
                        endTime: endTime.toISOString(),
                        updatedAt: new Date().toISOString(),
                        syncStatus: 'synced'
                    });
                }

                // Check if event was cancelled in Google Calendar
                if (googleEvent.status === 'cancelled') {
                    console.log(`Event ${googleEventId} was cancelled in Google Calendar`);
                    
                    // Update Firebase status
                    await admin.database().ref(`appointments/${appointmentId}`).update({
                        status: 'cancelled',
                        updatedAt: new Date().toISOString(),
                        syncStatus: 'synced'
                    });
                }
            }
        }

        // Check for deleted events (exist in Firebase but not in Google Calendar)
        const googleEventIds = new Set(googleEvents.map(e => e.id));
        for (const appointmentId in appointments) {
            const appointment = appointments[appointmentId];
            if (appointment.googleCalendarId && !googleEventIds.has(appointment.googleCalendarId)) {
                console.log(`Event ${appointment.googleCalendarId} was deleted from Google Calendar`);
                
                // Mark as deleted in Firebase
                await admin.database().ref(`appointments/${appointmentId}`).update({
                    status: 'deleted',
                    updatedAt: new Date().toISOString(),
                    syncStatus: 'synced'
                });
            }
        }

        // Update last sync time
        await admin.database().ref('calendar_sync/lastSyncTime').set(new Date().toISOString());
        console.log('Calendar sync completed successfully');

    } catch (error) {
        console.error('Error during calendar sync:', error);
        await admin.database().ref('calendar_sync/syncErrors').push({
            error: error.message,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Google Calendar Webhook Handler
 * Receives notifications when events change in Google Calendar
 */
exports.googleCalendarWebhook = functions.https.onRequest(async (req, res) => {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const resourceId = req.headers['x-goog-resource-id'];

    console.log('Webhook received:', {
        channelId,
        resourceState,
        resourceId
    });

    // Google sends a sync request to verify the webhook
    if (resourceState === 'sync') {
        console.log('Webhook sync request received');
        return res.status(200).send('OK');
    }

    // Handle actual change notifications
    if (resourceState === 'exists') {
        console.log('Calendar changes detected, syncing...');
        
        try {
            await syncGoogleCalendarChanges();
            res.status(200).send('OK');
        } catch (error) {
            console.error('Error syncing calendar changes:', error);
            res.status(500).send('Error');
        }
    } else {
        res.status(200).send('OK');
    }
});

/**
 * Scheduled function to sync Google Calendar every 5 minutes
 * This ensures changes are propagated even if webhooks fail
 */
exports.scheduledSync = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    console.log('Running scheduled calendar sync...');
    try {
        await syncGoogleCalendarChanges();
        console.log('Scheduled sync completed successfully');
    } catch (error) {
        console.error('Scheduled sync failed:', error);
    }
});

/**
 * Firebase Realtime Database trigger - sync to Google Calendar when appointments change
 */
exports.onAppointmentCreated = functions.database.ref('/appointments/{appointmentId}')
    .onCreate(async (snapshot, context) => {
        const appointmentId = context.params.appointmentId;
        const appointmentData = snapshot.val();

        // Skip if already has Google Calendar ID (already synced)
        if (appointmentData.googleCalendarId) {
            console.log('Appointment already has Google Calendar ID, skipping');
            return null;
        }

        try {
            console.log('Creating Google Calendar event for appointment:', appointmentId);
            const googleEventId = await createCalendarEvent(appointmentData);

            // Update appointment with Google Calendar ID
            await snapshot.ref.update({
                googleCalendarId: googleEventId,
                syncStatus: 'synced',
                updatedAt: new Date().toISOString()
            });

            console.log('Appointment synced to Google Calendar:', googleEventId);
        } catch (error) {
            console.error('Failed to sync appointment to Google Calendar:', error);
            
            // Update sync status
            await snapshot.ref.update({
                syncStatus: 'sync_failed',
                syncError: error.message,
                updatedAt: new Date().toISOString()
            });
        }

        return null;
    });

/**
 * Firebase Realtime Database trigger - update Google Calendar when appointments change
 */
exports.onAppointmentUpdated = functions.database.ref('/appointments/{appointmentId}')
    .onUpdate(async (change, context) => {
        const appointmentId = context.params.appointmentId;
        const oldData = change.before.val();
        const newData = change.after.val();

        // Skip if no Google Calendar ID
        if (!newData.googleCalendarId) {
            console.log('Appointment has no Google Calendar ID, skipping sync');
            return null;
        }

        // Skip if change came from sync (prevent infinite loops)
        if (newData.syncStatus === 'syncing') {
            console.log('Change came from sync, skipping');
            return null;
        }

        try {
            // Mark as syncing to prevent loops
            await change.after.ref.update({ syncStatus: 'syncing' });

            // Check what changed
            const timeChanged = oldData.startTime !== newData.startTime || oldData.endTime !== newData.endTime;
            const detailsChanged = oldData.customerName !== newData.customerName ||
                                  oldData.customerEmail !== newData.customerEmail ||
                                  oldData.customerPhone !== newData.customerPhone;

            if (newData.status === 'cancelled' || newData.status === 'deleted') {
                // Delete from Google Calendar
                console.log('Deleting event from Google Calendar:', newData.googleCalendarId);
                await deleteCalendarEvent(newData.googleCalendarId);
            } else if (timeChanged || detailsChanged) {
                // Update Google Calendar
                console.log('Updating event in Google Calendar:', newData.googleCalendarId);
                await updateCalendarEvent(newData.googleCalendarId, newData);
            }

            // Update sync status
            await change.after.ref.update({
                syncStatus: 'synced',
                updatedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Failed to sync appointment update to Google Calendar:', error);
            
            // Update sync status
            await change.after.ref.update({
                syncStatus: 'sync_failed',
                syncError: error.message,
                updatedAt: new Date().toISOString()
            });
        }

        return null;
    });

module.exports = {
    syncGoogleCalendarChanges
};
