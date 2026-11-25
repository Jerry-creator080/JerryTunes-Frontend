const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/**
 * Ensures android:usesCleartextTraffic="true" is set on <application> in AndroidManifest.xml
 * so the release APK can reach the HTTP backend at http://129.225.70.239:3001 on Android 9+.
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    mainApplication.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });
};
