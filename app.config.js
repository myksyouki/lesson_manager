module.exports = {
  expo: {
    owner: "regnition-ai",
    name: "Resonote",
    slug: "lesson-manager",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#121212"
    },
    scheme: "resonote",
    userInterfaceStyle: "automatic",
    sdkVersion: "53.0.0",
    plugins: [
      "expo-router",
      ["@react-native-google-signin/google-signin"],
      ["expo-tracking-transparency"],
      ["expo-build-properties", {
        "ios": {
          "useFrameworks": "static"
        }
      }]
    ],
    runtimeVersion: "1.0.0",
    updates: {
      url: "https://u.expo.dev/01adc63d-356a-407b-8e1e-efce07d28b30"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    experiments: {
      typedRoutes: true
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.regnition-ai.resonote",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "写真の撮影に使用します。",
        NSMicrophoneUsageDescription: "練習中の音声録音に使用します。",
        NSPhotoLibraryUsageDescription: "練習記録の写真アップロードに使用します。",
        NSUserTrackingUsageDescription: "広告表示のためにIDFAを使用します。許可しない場合でもアプリの機能は全て利用できます。",
        UIBackgroundModes: ["audio"],
        LSApplicationQueriesSchemes: ["itms-apps"]
      }
    },
    android: {
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#121212"
      },
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      package: "com.regnition_ai.resonote"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    extra: {
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      eas: {
        projectId: "01adc63d-356a-407b-8e1e-efce07d28b30"
      }
    }
  }
};  
