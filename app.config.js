module.exports = {
  expo: {
    owner: "myksyouki",
    name: "Lesson Manager",
    slug: "lesson-manager",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "lessonmanager",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    extra: {
      expoPublicGoogleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      expoPublicGoogleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      expoPublicGoogleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      expoPublicGoogleRedirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI,
      eas: {
        projectId: "c06d6977-ea10-44b9-8086-f41aea2ba31d"
      },
      difyApiEndpoint: process.env.EXPO_PUBLIC_DIFY_API_ENDPOINT,
      difyServiceToken: process.env.EXPO_PUBLIC_DIFY_API_SERVICE_TOKEN,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.lessonmanager",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
        NSMicrophoneUsageDescription: "音声録音のためにマイクへのアクセスが必要です",
        UIBackgroundModes: ["audio"],
        LSSupportsOpeningDocumentsInPlace: true,
        UIFileSharingEnabled: true,
        UISupportsDocumentBrowser: true,
        NSPhotoLibraryUsageDescription: "音声ファイルをライブラリから選択するために必要です",
        NSDocumentsFolderUsageDescription: "音声ファイルを保存・読み込みするために必要です"
      }
    },
    android: {
      package: "com.yourcompany.lessonmanager",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO"
      ]
    },
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true
    }
  }
}; 