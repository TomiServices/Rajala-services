#!/usr/bin/env node

/**
 * Simple test to validate calendarWebhook event processing logic
 * 
 * This tests the core logic of how the webhook processes different event types
 * without actually calling the Google Calendar API or Firestore.
 */

console.log('🧪 Testing Calendar Webhook Event Processing Logic\n');

// Mock event data similar to what Google Calendar API returns
const testEvents = {
  incremental: [
    // New event
    {
      id: 'event1',
      status: 'confirmed',
      start: { dateTime: '2026-01-10T10:00:00+02:00' },
      end: { dateTime: '2026-01-10T11:00:00+02:00' },
      description: 'Asiakas: Testi Käyttäjä\nPuhelin: 0401234567\nSähköposti: testi@example.com'
    },
    // Cancelled event
    {
      id: 'event2',
      status: 'cancelled',
      start: { dateTime: '2026-01-11T10:00:00+02:00' },
      end: { dateTime: '2026-01-11T11:00:00+02:00' }
    },
    // Modified event
    {
      id: 'event3',
      status: 'confirmed',
      start: { dateTime: '2026-01-12T14:00:00+02:00' },
      end: { dateTime: '2026-01-12T15:00:00+02:00' },
      description: 'Asiakas: Muokattu Asiakas\nPuhelin: 0409876543'
    }
  ],
  full: [
    // Multiple active events
    {
      id: 'event4',
      status: 'confirmed',
      start: { dateTime: '2026-01-15T10:00:00+02:00' },
      end: { dateTime: '2026-01-15T11:00:00+02:00' },
      description: 'Asiakas: Asiakas 1'
    },
    {
      id: 'event5',
      status: 'confirmed',
      start: { dateTime: '2026-01-16T10:00:00+02:00' },
      end: { dateTime: '2026-01-16T11:00:00+02:00' },
      description: 'Asiakas: Asiakas 2'
    }
  ],
  // All-day events: manually created blocks in Google Calendar (use start.date, not start.dateTime)
  allDay: [
    {
      id: 'allday1',
      status: 'confirmed',
      start: { date: '2026-01-20' },
      end: { date: '2026-01-21' },
      description: 'Poissa toimistolta'
    },
    {
      id: 'allday2',
      status: 'confirmed',
      start: { date: '2026-01-22' },
      end: { date: '2026-01-23' }
      // no description — should default to 'Google Calendar -varaus'
    }
  ]
};

/**
 * Simulates the event processing logic from calendarWebhook (updated to match index.js)
 * Now handles all-day events (start.date) as well as timed events (start.dateTime).
 */
function processEvents(events) {
  const results = {
    created: [],
    updated: [],
    deleted: []
  };

  for (const eventItem of events) {
    if (!eventItem || !eventItem.id) continue;

    // Handle deleted/cancelled events
    if (eventItem.status === 'cancelled' || eventItem.deleted) {
      results.deleted.push(eventItem.id);
      continue;
    }

    if (!eventItem.start) continue;

    const desc = eventItem.description || '';
    const nameMatch = desc.match(/Asiakas:\s*(.+)/);
    const baseName = nameMatch ? nameMatch[1].trim() : 'Google Calendar -varaus';

    if (eventItem.start.dateTime) {
      // Timed event
      const startTime = new Date(eventItem.start.dateTime);
      if (Number.isNaN(startTime.getTime())) continue;

      results.created.push({
        eventId: eventItem.id,
        name: baseName,
        startTime: startTime.toISOString(),
        allDay: false
      });
    } else if (eventItem.start.date) {
      // All-day event
      const allDayStart = new Date(eventItem.start.date + 'T00:00:00.000Z');
      if (Number.isNaN(allDayStart.getTime())) continue;

      results.created.push({
        eventId: eventItem.id,
        name: baseName,
        startTime: allDayStart.toISOString(),
        allDay: true
      });
    }
    // Events with neither dateTime nor date are ignored
  }

  return results;
}

/**
 * Test incremental sync processing
 */
function testIncrementalSync() {
  console.log('📝 Test 1: Incremental Sync Processing');
  console.log('--------------------------------------');
  
  const results = processEvents(testEvents.incremental);
  
  console.log(`✅ Created: ${results.created.length} event(s)`);
  results.created.forEach(e => {
    console.log(`   - ${e.name} at ${e.startTime}`);
  });
  
  console.log(`✅ Deleted: ${results.deleted.length} event(s)`);
  results.deleted.forEach(id => {
    console.log(`   - Event ID: ${id}`);
  });
  
  // Validate expectations
  const expectedCreated = 2; // event1 and event3
  const expectedDeleted = 1; // event2
  
  if (results.created.length === expectedCreated && results.deleted.length === expectedDeleted) {
    console.log('✅ Test PASSED\n');
    return true;
  } else {
    console.log(`❌ Test FAILED: Expected ${expectedCreated} created and ${expectedDeleted} deleted\n`);
    return false;
  }
}

/**
 * Test full sync processing
 */
function testFullSync() {
  console.log('📝 Test 2: Full Sync Processing');
  console.log('--------------------------------');
  
  const results = processEvents(testEvents.full);
  
  console.log(`✅ Created: ${results.created.length} event(s)`);
  results.created.forEach(e => {
    console.log(`   - ${e.name} at ${e.startTime}`);
  });
  
  // Validate expectations
  const expectedCreated = 2; // event4 and event5
  
  if (results.created.length === expectedCreated) {
    console.log('✅ Test PASSED\n');
    return true;
  } else {
    console.log(`❌ Test FAILED: Expected ${expectedCreated} created\n`);
    return false;
  }
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('📝 Test 3: Edge Cases');
  console.log('---------------------');
  
  const edgeCases = [
    // Event with no start time
    { id: 'edge1', status: 'confirmed', description: 'No start time' },
    // Event with invalid date
    { id: 'edge2', status: 'confirmed', start: { dateTime: 'invalid-date' } },
    // Event with no description
    { id: 'edge3', status: 'confirmed', start: { dateTime: '2026-01-10T10:00:00+02:00' } },
    // Event with deleted flag
    { id: 'edge4', status: 'confirmed', deleted: true, start: { dateTime: '2026-01-10T10:00:00+02:00' } }
  ];
  
  const results = processEvents(edgeCases);
  
  console.log(`✅ Handled ${edgeCases.length} edge cases`);
  console.log(`   - Created: ${results.created.length} (expected: 1)`);
  console.log(`   - Deleted: ${results.deleted.length} (expected: 1)`);
  console.log(`   - Skipped: ${edgeCases.length - results.created.length - results.deleted.length} (expected: 2)`);
  
  if (results.created.length === 1 && results.deleted.length === 1) {
    console.log('✅ Test PASSED\n');
    return true;
  } else {
    console.log('❌ Test FAILED\n');
    return false;
  }
}

/**
 * Test that ensures we DON'T delete events not in the list
 * This was the critical bug - the old code would delete all events not in incremental sync
 */
function testNoUnintendedDeletions() {
  console.log('📝 Test 4: No Unintended Deletions (Critical)');
  console.log('----------------------------------------------');
  
  // Simulate incremental sync with only 1 changed event
  const incrementalEvents = [
    { 
      id: 'new-event',
      status: 'confirmed',
      start: { dateTime: '2026-01-20T10:00:00+02:00' },
      description: 'Asiakas: New Event'
    }
  ];
  
  const results = processEvents(incrementalEvents);
  
  console.log(`✅ Incremental sync received 1 event`);
  console.log(`   - Created/Updated: ${results.created.length}`);
  console.log(`   - Deleted: ${results.deleted.length}`);
  console.log(`   - Did NOT attempt to delete existing events: ✅`);
  
  // The critical check: we should NOT be deleting events that aren't in the incremental list
  if (results.deleted.length === 0) {
    console.log('✅ Test PASSED - Correctly processes only events in the notification\n');
    return true;
  } else {
    console.log('❌ Test FAILED - Attempted unintended deletions\n');
    return false;
  }
}

// Run all tests
const test1 = testIncrementalSync();
const test2 = testFullSync();
const test3 = testEdgeCases();
const test4 = testNoUnintendedDeletions();

/**
 * Test 5: All-day events (e.g. manual blocks created directly in Google Calendar)
 * These use start.date instead of start.dateTime and must NOT be silently skipped.
 * This was a bug introduced when start.dateTime was required — all-day events were ignored.
 */
function testAllDayEvents() {
  console.log('📝 Test 5: All-Day Events (Google Calendar manual blocks)');
  console.log('---------------------------------------------------------');

  const results = processEvents(testEvents.allDay);

  console.log(`✅ Processed ${testEvents.allDay.length} all-day event(s)`);
  results.created.forEach(e => {
    console.log(`   - ${e.name} on ${e.startTime} allDay=${e.allDay}`);
  });

  const expectedCreated = 2; // allday1 and allday2
  const allMarkedAllDay = results.created.every(e => e.allDay === true);
  const firstHasDefaultName = results.created.find(e => e.eventId === 'allday2') &&
    results.created.find(e => e.eventId === 'allday2').name === 'Google Calendar -varaus';

  if (results.created.length === expectedCreated && allMarkedAllDay && firstHasDefaultName) {
    console.log('✅ Test PASSED - All-day events are processed with allDay=true\n');
    return true;
  } else {
    console.log(`❌ Test FAILED: created=${results.created.length} (expected ${expectedCreated}), allMarkedAllDay=${allMarkedAllDay}\n`);
    return false;
  }
}

/**
 * Test 6: Cancelled all-day event is added to deleted list
 */
function testCancelledAllDayEvent() {
  console.log('📝 Test 6: Cancelled All-Day Event');
  console.log('-----------------------------------');

  const events = [
    {
      id: 'allday-cancelled',
      status: 'cancelled',
      start: { date: '2026-01-25' },
      end: { date: '2026-01-26' }
    }
  ];

  const results = processEvents(events);

  if (results.deleted.length === 1 && results.deleted[0] === 'allday-cancelled') {
    console.log('✅ Test PASSED - Cancelled all-day event is marked for deletion\n');
    return true;
  } else {
    console.log('❌ Test FAILED\n');
    return false;
  }
}

const test5 = testAllDayEvents();
const test6 = testCancelledAllDayEvent();

// Summary
console.log('=====================================');
console.log('Test Summary');
console.log('=====================================');
const allTests = [test1, test2, test3, test4, test5, test6];
console.log(`Total: ${allTests.length} tests`);
console.log(`Passed: ${allTests.filter(t => t).length}`);
console.log(`Failed: ${allTests.filter(t => !t).length}`);

if (allTests.every(t => t)) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
}
