# レッスン管理システムのテスト導入ガイド

このドキュメントでは、レッスン管理システムのテスト環境の設定と実行方法について説明します。

## テスト環境の概要

このプロジェクトでは以下のテストフレームワークと技術を使用しています：

- **Jestテストフレームワーク**: JavaScriptとTypeScriptのテストに使用
- **React Native Testing Library**: コンポーネントのテスト用
- **Firebase Functions Test**: Firebase Functionsのテスト用

## テスト環境のセットアップ

### 前提条件

- Node.js 20.x（Firebase Functionsのテスト用）
- Node.js 18.x以上（アプリケーションのテスト用）
- Yarn パッケージマネージャー

**注意**: Firebase Functionsのテストを実行するには、Node.js 20.xが必要です。

### 環境構成の問題と解決方法

現時点では以下の問題があり、解決が必要です：

1. **Node.jsバージョンの不一致**: 
   - アプリケーションでは Node.js 22.x が使用されていますが、Firebase Functionsは Node.js 20.x を必要とします
   - 推奨解決策: nvmなどのNode.jsバージョン管理ツールを使用して、Firebase Functions用にNode.js 20.xを使用

2. **React Native環境のモック問題**:
   - Animatedモジュールなど、一部のネイティブモジュールのモックに問題があります
   - 現在の解決策: jest.app.setup.jsで基本的なモックを提供していますが、より詳細な設定が必要かもしれません

### Node.jsバージョン管理

このプロジェクトでは、`.nvmrc`ファイルで推奨されるNode.jsバージョンを設定しています。Node Version Manager (nvm)をインストールしている場合は、以下のコマンドで適切なバージョンを使用できます：

```bash
nvm use
```

nvmがインストールされていない場合は、[NVMのインストール手順](https://github.com/nvm-sh/nvm#installing-and-updating)に従ってインストールしてください。

## フロントエンドのテスト

### テスト実行

フロントエンドのテストを実行するには：

```bash
# プロジェクトルートで実行
yarn test --testPathIgnorePatterns=functions
```

テストファイルの変更を監視して自動的に再実行するには：

```bash
yarn test:watch --testPathIgnorePatterns=functions
```

カバレッジレポートを生成するには：

```bash
yarn test:coverage --testPathIgnorePatterns=functions
```

## Firebase Functionsのテスト

### テスト環境のセットアップ

Firebase Functionsのテストは別のNode.jsバージョン（20.x）で実行する必要があります。テスト環境をセットアップするには：

1. **Node.js 20.xをインストール**:
   ```bash
   nvm install 20
   nvm use 20
   ```

2. **Firebase Functions用のテスト依存関係をインストール**:
   ```bash
   cd functions
   npm install --save-dev jest ts-jest @types/jest firebase-functions-test
   ```

### テスト実行

Firebase Functionsのテストは、Node.js 20.xで実行してください：

```bash
# functionsディレクトリで実行
cd functions
npm test
```

## テストの追加

### フロントエンドのテスト追加

新しいコンポーネントのテストを追加するには：

1. `__tests__/components/` ディレクトリに `{コンポーネント名}.test.tsx` ファイルを作成します
2. テストケースを記述します

例：
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import MyComponent from '../../app/components/MyComponent';

describe('MyComponentコンポーネント', () => {
  test('正しくレンダリングされる', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Expected Text')).toBeTruthy();
  });
});
```

### Firebase Functionsのテスト追加

Firebase Functionsのテストを追加するには：

1. `functions/src/__tests__/` ディレクトリに適切なテストファイルを作成します
2. firebase-functions-testパッケージを使用してテストケースを記述します

例：
```typescript
import * as functionsTest from 'firebase-functions-test';

describe('Cloud Function Tests', () => {
  test('単純なテスト', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## 現在のテスト状況と今後の課題

1. **React Nativeコンポーネントのテスト**: 
   - 最小限のコンポーネントテストが実装済み（TaskCardコンポーネント）
   - 課題: Animated APIなどのネイティブモジュールのモックが必要

2. **Firebase Functionsのテスト**:
   - 基本的なテスト環境の設定のみ 
   - 課題: Node.js 20.xでのテスト実行環境の整備と実際のテストケース実装

3. **今後の実装計画**:
   - サービスクラスのユニットテスト追加
   - ストアのテスト追加
   - E2Eテストの検討（Detoxなど）

## ベストプラクティス

1. **テストカバレッジの維持**: 新しい機能を追加する際は対応するテストも追加します
2. **モックの活用**: 外部サービスとの通信はモックにして、テストの信頼性と速度を確保します
3. **スナップショットテスト**: UIコンポーネントの変更を検出するためにスナップショットテストを使用します
4. **テスト駆動開発**: 可能な限り、テストを先に書いてから機能を実装します