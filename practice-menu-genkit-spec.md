# Firebase Genkit を活用した練習メニュー生成システム仕様書

## 1. システム概要

レッスン管理アプリにAI駆動の練習メニュー生成・表示機能を追加する。Firebase Genkitを活用し、ユーザーの楽器、レベル、レッスン履歴に基づいた最適な練習メニューを提供する。この機能は既存の複数のアクセスポイントと統合する形で実装する。

## 2. データモデル

```typescript
// 練習メニューコレクション
interface PracticeMenu {
  id: string;                // ドキュメントID
  title: string;             // メニュータイトル
  description: string;       // 詳細説明
  instrument: string;        // 対象楽器
  category: string;          // カテゴリ（基礎練習/テクニック/表現など）
  difficulty: string;        // 難易度（初級/中級/上級）
  duration: number;          // 所要時間（分）
  sheetMusicUrl?: string;    // 楽譜URL
  videoUrl?: string;         // 解説動画URL（オプション）
  steps: PracticeStep[];     // 練習ステップ
  tags: string[];            // 検索用タグ
  createdAt: Timestamp;      // 作成日時
  updatedAt: Timestamp;      // 更新日時
}

// 練習ステップ
interface PracticeStep {
  id: string;                // ステップID
  title: string;             // ステップ名
  description: string;       // 詳細説明
  duration: number;          // 所要時間（分）
  orderIndex: number;        // 順序
}

// ユーザー練習記録
interface PracticeRecord {
  id: string;                // 記録ID
  userId: string;            // ユーザーID
  menuId: string;            // 実施したメニューID
  completedAt: Timestamp;    // 完了日時
  feedback?: string;         // ユーザーフィードバック
  difficulty?: number;       // 体感難易度（1-5）
}

// 楽譜データモデル
interface SheetMusic {
  id: string;                // 楽譜ID
  title: string;             // タイトル
  svgContent: string;        // SVG形式の楽譜データ
  instrumentId: string;      // 対象楽器ID
  difficulty: string;        // 難易度
  tags: string[];            // 検索用タグ
  createdAt: Timestamp;      // 作成日時
  updatedAt: Timestamp;      // 更新日時
}
```

## 3. システム構成

1. **Firestore**：練習メニューデータ保存
2. **Firebase Functions**：Genkit AIロジック実装（OpenAI APIを利用）
3. **Firebase Storage**：楽譜・音声ファイル保存
4. **Expo/React Native**：クライアントUI（既存の複数画面と統合）
5. **Secret Manager**：OpenAI APIキー管理（既存）

## 4. 機能要件

### 4.1 コアシステム
- 練習メニューデータベース管理
- Genkit AIによる推薦エンジン（OpenAI連携）
- 楽譜・動画表示機能
- 管理者用データ入力・アップロード画面

### 4.2 アクセスルート
1. **自動レコメンド**：ユーザープロファイル（楽器・レベル）に基づく推薦
2. **AIサマリー連携**：レッスンサマリーから課題を抽出し関連メニューを推薦
3. **チャット履歴活用**：会話内容から必要な練習を推測して提案
4. **複数アクセスポイント**：
   - **タスクタブ**：タスクタブから練習メニュー生成・表示機能にアクセス
   - **レッスン詳細画面**：エクスポートモーダルの「タスク生成」から生成
   - **チャット画面**：チャット画面のエクスポート機能から生成
   - **ホーム画面**：自動レコメンドされた練習メニューを表示

### 4.3 AI機能
- レッスンサマリーからキーワード抽出
- ユーザー特性に基づくパーソナライズ
- 練習履歴を考慮した進捗対応型推薦
- AIによる練習メニューの自動分類・タグ付け

## 5. UI設計

1. **複数アクセスポイントとの統合**：
   - タスクタブ内の練習メニュー生成ボタン（既に実装済み）
   - レッスン詳細画面のエクスポートモーダル内「タスク生成」機能
   - チャット画面のエクスポート機能
   - HOME画面の練習メニュー自動レコメンド表示
2. **メニュー一覧画面**：カテゴリ別表示、フィルタリング機能
3. **メニュー詳細画面**：
   - 練習手順説明
   - 楽譜表示（拡大・縮小可能）
   - 関連動画再生
   - 完了ボタン
4. **管理者用データ入力画面**：
   - 練習メニュー登録フォーム
   - 楽譜アップロード機能
   - バルクインポート機能

## 6. 実装ステップ

### 6.1 バックエンド
1. Firestoreにメニューコレクション作成
2. Firebase Functionsでgenkit機能実装（OpenAI API連携）
   ```javascript
   // functions/src/genkit/index.ts
   import * as genkit from '@google-cloud/vertexai';
   import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
   
   // Secret Managerから既存のOpenAI APIキーを取得
   const getOpenAIApiKey = async () => {
     const secretClient = new SecretManagerServiceClient();
     const [version] = await secretClient.accessSecretVersion({
       name: `projects/${process.env.GCLOUD_PROJECT}/secrets/openai-api-key/versions/latest`
     });
     return version.payload?.data?.toString() || '';
   };
   
   export const generatePracticeRecommendation = functions
     .region('asia-northeast1')
     .https.onCall(async (data, context) => {
       // ユーザー認証確認
       // OpenAI APIキー取得
       const apiKey = await getOpenAIApiKey();
       // Genkitを使用した推薦ロジック実装
       // Firestoreからメニューデータ取得
     });
   ```

3. 管理者用APIエンドポイント作成
   ```javascript
   // functions/src/admin/practice-menu.ts
   export const createPracticeMenu = functions
     .region('asia-northeast1')
     .https.onCall(async (data, context) => {
       // 管理者権限チェック
       // メニューデータの検証
       // Firestoreへの保存
     });
   
   export const uploadSheetMusic = functions
     .region('asia-northeast1')
     .https.onCall(async (data, context) => {
       // SVG楽譜データの検証
       // Storageへのアップロード
       // Firestoreメタデータ更新
     });
   ```

### 6.2 フロントエンド
1. 既存の練習メニュー生成画面のアクセスポイント拡張
   - タスクタブからのアクセス（`app/task-form.tsx`）
   - レッスン詳細画面からのアクセス
   - チャット画面からのアクセス
   - ホーム画面への自動レコメンド表示
2. 既存のタスクタブと練習メニュー機能の統合
3. メニュー詳細画面の実装
4. レッスンサマリー・チャット画面との連携
5. 管理者用データ入力画面の実装（`app/admin/practice-menu-manager.tsx`）

## 7. テスト計画

1. 各楽器カテゴリでの推薦精度検証
2. レッスンサマリーからの推薦機能テスト
3. チャット履歴からの推薦機能テスト
4. 楽譜表示機能テスト
5. パフォーマンス・応答速度確認
6. 既存機能との統合テスト（全アクセスポイント）

## 8. データ管理

- 事前に各楽器100種類以上の練習メニューを登録
- 定期的なメニューデータ更新プロセス確立
- ユーザーフィードバックに基づく改善サイクル

## 9. セキュリティ

- Firestoreセキュリティルール設定
- APIアクセス制限
- ユーザー認証連携
- Secret Managerでの安全なAPIキー管理（既存）

## 10. ロードマップ

### フェーズ1：基本機能実装（4-6週間）

#### 1週目：データモデル・基本構造
- Firestoreにコレクション作成（練習メニュー、楽譜データ）
- 基本データモデルの実装
- Secret Managerとの連携確認
- OpenAI API連携テスト

#### 2-3週目：バックエンド機能
- Firebase Functions実装
  - Genkit機能実装（OpenAI API連携）
  - 基本的な推薦ロジック実装
  - レッスンサマリーからのキーワード抽出機能
- 管理者用API作成
  - メニュー登録エンドポイント
  - 楽譜アップロードエンドポイント

#### 4-5週目：フロントエンド統合
- 既存画面との統合
  - タスクタブ連携拡張
  - レッスン詳細画面のエクスポートモーダル連携
  - チャット画面のエクスポート連携
- メニュー表示画面実装
- 基本的な楽譜表示機能

#### 6週目：検証・調整
- 初期データ登録（30-50種類のメニュー）
- 基本機能テスト
- バグ修正・調整
- 初期デプロイ

### フェーズ2：拡張機能実装（3-4週間）

#### 1-2週目：楽譜表示機能強化
- VexFlowによる楽譜レンダリング実装
- 拡大・縮小・スクロール機能
- インタラクティブ要素追加（タップ反応など）
- 動画連携機能

#### 2-3週目：AI推薦機能強化
- レッスンサマリー連携最適化
- チャット履歴分析ロジック改善
- タグ付け・分類精度向上
- ユーザープロファイルに基づく推薦ロジック強化

#### 4週目：ホーム画面連携
- ホーム画面への自動レコメンド表示実装
- パーソナライズ機能強化
- 中間デプロイとフィードバック収集

### フェーズ3：管理者機能・最適化（3-4週間）

#### 1-2週目：管理者機能実装
- 管理者用データ入力画面作成
- 練習メニュー登録フォーム実装
- 楽譜エディタ/アップローダー実装
- 一括インポート機能
- データ管理ダッシュボード

#### 2-3週目：パフォーマンス最適化
- レスポンス時間改善
- キャッシュ戦略実装
- エラーハンドリング強化
- データ同期メカニズム最適化

#### 4週目：最終調整・本番リリース
- 全体テスト（複数楽器カテゴリ）
- ドキュメント作成
- パフォーマンス計測と最終調整
- 本番リリース準備

### フェーズ4：拡張と改善（将来計画）

- 追加楽器のサポート拡大
- 学習アルゴリズムによる推薦精度向上
- ユーザーフィードバック機能追加
- コミュニティ機能（練習メニュー共有など）

## 11. 楽譜データフォーマット仕様

楽譜データは独自作成とし、以下のフォーマットを推奨します：

### SVGフォーマット（推奨）
- **メリット**:
  - ウェブ表示に最適化（拡大縮小が滑らか）
  - テキスト検索可能
  - ファイルサイズが小さい
  - インタラクティブ機能実装が容易
  - プログラムによる動的変更が可能

- **実装方法**:
  - [VexFlow](https://github.com/vexflow/vexflow)ライブラリを使用した楽譜レンダリング
  - React Nativeでの表示にはSVG Componentを使用
  - 楽譜編集用に[Flat.io API](https://flat.io/developers/api)や[OSMD](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay)の活用も検討

### 代替フォーマット
- **PDF**: 複雑な楽譜の場合はPDFも選択肢として残す
- **MusicXML**: 将来的な拡張性のために内部データとして保持

## 12. 管理者用データ入力システム

練習メニューと楽譜データを効率的に登録するための管理者用インターフェースを実装します：

1. **練習メニュー登録画面**
   - フォーム形式で練習メニュー情報を入力
   - 楽器、カテゴリ、難易度などのメタデータ入力
   - ステップごとの時間配分と説明入力
   - タグ付け機能（プリセットタグから選択または新規作成）

2. **楽譜エディタ/アップローダー**
   - SVGエディタ統合または外部エディタからのインポート
   - プレビュー機能
   - 楽譜メタデータ登録（対応楽器、難易度など）

3. **一括インポート機能**
   - CSVまたはJSONフォーマットでの一括登録
   - 楽譜データの一括アップロード（ZIP形式）

4. **メニュー管理ダッシュボード**
   - 登録済みメニュー一覧表示
   - 編集・削除機能
   - 公開/非公開設定

この管理者システムは、独立した管理パネルとして実装し、適切な認証・認可によって保護します。 