<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the web site, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'c883web6wp1' );

/** Database username */
define( 'DB_USER', 'c883web6' );

/** Database password */
define( 'DB_PASSWORD', 'mMKokX_37Bc' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         '|D@`*)%CWgg6grddP-$3n&({/.,@G2Wv:5c1=4qqv,K5o@hH[e,]/wq>|E5~Z(*}' );
define( 'SECURE_AUTH_KEY',  'i% dkJv%%3|d @mt|F{/F@Uk]=5 ]&F1QWj IE#;<6wng`Zs,hUt(Kj0OqtxS*>(' );
define( 'LOGGED_IN_KEY',    'B)?{ChY4dO)#$leBa:.8dUF; w|9Ws@[7xk X8Zo(sz1D`m%[Xru)01Jkvx@d=A2' );
define( 'NONCE_KEY',        'Re]LY S;AL?)DU*a/AAokv+_=[z2o^!DPRbI~mObX0tdKZV$8CeaigiJy0J4t~|b' );
define( 'AUTH_SALT',        'k>Vl,.75)~WfJy<HW$GDL@4S2PDN5m@CE}=,[YIJ.TzjrV%~{|pr)_r*[(*LAjBG' );
define( 'SECURE_AUTH_SALT', '<t,GWy%;T=a-nM/&^GO=unicqtwCHu$huiT+uT=lydI@o5U2X(-(rX$J@$iJ*g.D' );
define( 'LOGGED_IN_SALT',   'av{|4`]u[ev,7:L&KI+C),j%+9-%;h<kWUj?x7=!w`k#0d>&2RlH`NSsdCK,2@[`' );
define( 'NONCE_SALT',       'uM|Y>NubfMg8M$tC/OQKk$V_k<V#Ryti#fqu,HF0tYiRT)iQ;SO*mnZ=p`0J|xb%' );

/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_fixnero';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
define( 'WP_DEBUG', false );

/* Add any custom values between this line and the "stop editing" line. */



/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
