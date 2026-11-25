const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Configures Android Gradle release signing using environment variables (Codemagic CI)
 * or local Gradle properties, keeping credentials out of source control and supporting
 * both APK (assembleRelease) and Play Store AAB (bundleRelease) builds.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('signingConfigs.release')) {
      return config;
    }

    const debugSigningTarget = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

    const releaseSigningBlock = `${debugSigningTarget}
        release {
            def keystorePath = System.getenv("CM_KEYSTORE_PATH") ?: findProperty("JERRYTUNES_UPLOAD_STORE_FILE")
            if (keystorePath) {
                storeFile file(keystorePath)
                storePassword System.getenv("CM_KEYSTORE_PASSWORD") ?: findProperty("JERRYTUNES_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS") ?: findProperty("JERRYTUNES_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD") ?: findProperty("JERRYTUNES_UPLOAD_KEY_PASSWORD")
            }
        }`;

    if (!contents.includes(debugSigningTarget)) {
      throw new Error('withReleaseSigning: Could not find debug signingConfig block in android/app/build.gradle');
    }
    contents = contents.replace(debugSigningTarget, releaseSigningBlock);

    const releaseBuildTypeTarget = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

    const releaseBuildTypeReplacement = `        release {
            def hasReleaseKeystore = (System.getenv("CM_KEYSTORE_PATH") ?: findProperty("JERRYTUNES_UPLOAD_STORE_FILE")) != null
            signingConfig hasReleaseKeystore ? signingConfigs.release : signingConfigs.debug`;

    if (!contents.includes(releaseBuildTypeTarget)) {
      throw new Error('withReleaseSigning: Could not find release buildType signingConfig in android/app/build.gradle');
    }
    contents = contents.replace(releaseBuildTypeTarget, releaseBuildTypeReplacement);

    config.modResults.contents = contents;
    return config;
  });
};
