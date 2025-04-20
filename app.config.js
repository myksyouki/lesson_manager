module.exports = {
  expo: {
    owner: "regnition-ai",
    name: "Resonote",
    slug: "lesson-manager",
    version: "0.0.2",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#121212"
    },
    scheme: "resonote",
    userInterfaceStyle: "automatic",
    sdkVersion: "52.0.0",
    runtimeVersion: "1.0.0",
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD"
    },
    newArchEnabled: false,
    developmentClient: false,
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
      expoPublicGoogleRedirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || "https://auth.expo.io/@regnition-ai/lesson-manager",
      eas: {
        projectId: "303ee673-c9ce-4969-84fd-9776438b4468"
      },
      client: {
        android: {
          previews: {
            androidStudio: false
          }
        },
        ios: {
          previews: {
            xcode: false
          },
          experimentalNativeConfigurationPath: undefined,
        }
      },
      difyApiEndpoint: process.env.EXPO_PUBLIC_DIFY_API_ENDPOINT,
      difyServiceToken: process.env.EXPO_PUBLIC_DIFY_API_SERVICE_TOKEN,
      router: {
        origin: false
      }
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.regnition.appli",
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
        LSSupportsOpeningDocumentsInPlace: true,
        UIFileSharingEnabled: true,
        UISupportsDocumentBrowser: true,
        NSPhotoLibraryUsageDescription: "音声ファイルをライブラリから選択するために必要です",
        NSDocumentsFolderUsageDescription: "音声ファイルを保存・読み込みするために必要です",
        NSUserTrackingUsageDescription: "このアプリでは、お客様により適切なレッスン内容を提供し、アプリの利用体験を向上させるために、お客様のデータを利用します。データは安全に管理され、第三者との共有は当社のプライバシーポリシーに従って行われます。",
        UIBackgroundModes: []
      }
    },
    android: {
      package: "com.regnition.appli",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: []
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
    },
    packagerOpts: {
      dev: true
    }
  }
};  
