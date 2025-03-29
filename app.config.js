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
    sdkVersion: "52.0.0",
    runtimeVersion: "1.0.0",
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD"
    },
    newArchEnabled: true,
    extra: {
      expoPublicFirebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA6GCKN48UZNnWQmU0LDIu7tn0jLRrJ4Ik",
      expoPublicFirebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "lesson-manager-99ab9.firebaseapp.com",
      expoPublicFirebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "lesson-manager-99ab9",
      expoPublicFirebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "lesson-manager-99ab9.firebasestorage.app",
      expoPublicFirebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "21424871541",
      expoPublicFirebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:21424871541:web:eab99b9421a3d0cfbac03c",
      expoPublicGoogleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "21424871541-1ujlpfdrapifrvbn0hup1hah1q84avuo.apps.googleusercontent.com",
      expoPublicGoogleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "21424871541-j9mudt7r229fk77j6rie1oasvs70e377.apps.googleusercontent.com",
      expoPublicGoogleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "21424871541-1553of634jsc7gj8qe8ljpkpv8u4cq77.apps.googleusercontent.com",
      expoPublicGoogleRedirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || "https://auth.expo.io/@myksyouki/lesson-manager",
      eas: {
        projectId: "c06d6977-ea10-44b9-8086-f41aea2ba31d"
      },
      difyApiEndpoint: process.env.EXPO_PUBLIC_DIFY_API_ENDPOINT,
      difyServiceToken: process.env.EXPO_PUBLIC_DIFY_API_SERVICE_TOKEN,
      router: {
        origin: false
      }
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
        "android.permission.RECORD_AUDIO"
      ]
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true
    },
    metro: {
      resolver: {
        sourceExts: ["js", "jsx", "ts", "tsx", "json"],
        blockList: [
          "dify_standard/.*",
          "functions/.*",
          "firebase-functions/.*"
        ],
        extraNodeModules: {
          "firebase-functions": "./empty-module.js",
          "firebase-admin": "./empty-module.js"
        }
      }
    }
  }
}; 