# レッスン管理システムのE2Eテスト環境セットアップガイド

このドキュメントでは、レッスン管理システムのエンドツーエンド（E2E）テスト環境の設定と実行方法について説明します。

## E2Eテストの概要

E2Eテストは、アプリケーションの実際のユーザーフローをシミュレートし、アプリケーション全体が期待通りに動作することを確認するテスト手法です。React Native向けには以下のE2Eテストフレームワークが推奨されます：

- **Detox**: React Nativeアプリのためのグレイボックスエンドツーエンドテストフレームワーク
- **Appium**: モバイルアプリケーション向けのクロスプラットフォームテストツール

このプロジェクトではDetoxの使用を推奨します。

## Detoxのセットアップ

### 前提条件

- Node.js 16以上
- Expo EAS Build（ネイティブビルド用）
- iOS: Xcode 12以上（MacOSのみ）
- Android: Android Studio、JDK 11以上、Android Emulator

### インストール手順

1. **Detoxをインストール**:

```bash
# プロジェクトルートで実行
yarn add --dev detox
```

2. **Detox CLIをグローバルインストール**:

```bash
npm install -g detox-cli
```

3. **Jest用のDetoxアダプタをインストール**:

```bash
yarn add --dev jest-circus
```

4. **Detoxの初期化**:

```bash
detox init -r jest
```

上記コマンドは`.detoxrc.js`ファイルを生成します。Expoアプリ用に設定を変更する必要があります。

### Expo用の設定

`.detoxrc.js`を以下のように編集します：

```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  specs: 'e2e',
  behavior: {
    init: {
      exposeGlobals: true,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/YOUR_APP.app',
      build: 'xcodebuild -workspace ios/YOUR_APP.xcworkspace -scheme YOUR_APP -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/YOUR_APP.app',
      build: 'xcodebuild -workspace ios/YOUR_APP.xcworkspace -scheme YOUR_APP -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 13',
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_3a_API_30_x86'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    }
  }
};
```

Expoを使用している場合は、EAS Build を利用してネイティブビルドを行い、生成されたアプリのパスを `binaryPath` に設定します。

### Jest設定

`e2e/jest.config.js`ファイルを作成し、以下のように設定します：

```javascript
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
```

## 最初のE2Eテストを作成

1. `e2e`ディレクトリを作成し、最初のテストファイルを追加します：

```javascript
// e2e/firstTest.test.js
describe('レッスン管理アプリ', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('ログイン画面が表示される', async () => {
    await expect(element(by.text('ログイン'))).toBeVisible();
  });

  it('サインアップボタンをタップするとサインアップ画面に遷移する', async () => {
    await element(by.text('サインアップ')).tap();
    await expect(element(by.text('アカウント登録'))).toBeVisible();
  });
});
```

## テストの実行

テストを実行するには、まずビルドを作成し、その後テストを実行します：

### iOS

```bash
# iOSアプリをビルド
detox build --configuration ios.sim.debug

# テストを実行
detox test --configuration ios.sim.debug
```

### Android

```bash
# Androidアプリをビルド
detox build --configuration android.emu.debug

# テストを実行
detox test --configuration android.emu.debug
```

## Expoプロジェクトの注意点

Expoプロジェクトで完全なE2Eテストを実行するには、以下の手順が必要です：

1. **EAS Buildを使用してネイティブビルドを作成**:

```bash
eas build --platform ios --profile development --local
eas build --platform android --profile development --local
```

2. **生成されたアプリファイルをDetox設定で指定**:
   - iOSの場合: `ios` ディレクトリ内の `.app` ファイル
   - Androidの場合: `android` ディレクトリ内の `.apk` ファイル

## CI/CD環境での実行

GitHub Actions や CircleCI などのCI/CD環境でE2Eテストを実行するための設定例：

### GitHub Actions設定例

```yaml
name: E2E Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-android:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      - name: Install dependencies
        run: yarn install
      - name: Install Detox dependencies
        run: brew tap wix/brew && brew install applesimutils
      - name: Build app
        run: detox build --configuration android.emu.debug
      - name: Android Tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          target: google_apis
          arch: x86_64
          profile: Nexus 6
          script: detox test --configuration android.emu.debug

  test-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      - name: Install dependencies
        run: yarn install
      - name: Install Detox dependencies
        run: brew tap wix/brew && brew install applesimutils
      - name: Build app
        run: detox build --configuration ios.sim.debug
      - name: iOS Tests
        run: detox test --configuration ios.sim.debug
```

## テスト戦略

E2Eテストでは以下のようなフローをテストすることを推奨します：

1. **認証フロー**: ログイン、サインアップ、パスワードリセット
2. **レッスン管理**: レッスンの作成、編集、閲覧、削除
3. **タスク管理**: タスクの作成、完了、アーカイブ
4. **音声関連**: 音声ファイルのアップロード、再生（制限あり）
5. **AIレッスン**: AIとのチャット、練習メニュー生成（モックが必要）

適切なテストカバレッジを維持しながらも、テスト実行時間のバランスを取ることが重要です。E2Eテストはコストが高いため、最も重要なユーザーフローに焦点を当てることをお勧めします。 