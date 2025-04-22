# レッスン詳細画面AIサマリーからタスク生成機能仕様書

## 1. システム概要
ユーザーがレッスン詳細画面で確認できるAI要約（サマリー）や関連タグ、レッスンメタデータをバックエンドに送り、OpenAIを活用してFirestore内の練習メニュー（PracticeMenu）を検索・推薦する機能を提供する。既存の練習タブの練習メニュー生成機能と同様のUXをレッスン詳細画面に統合する。

## 2. データモデル

### 2.1 フロントエンドリクエストパラメータ
```typescript
interface GenerateTasksRequest {
  userId: string;           // Firebase Authentication UID
  lessonId: string;         // 対象レッスンのID
  aiSummary: string;        // レッスン詳細画面で生成済みの要約テキスト
  tags: string[];           // 要約に付与されたタグ配列
  instrument: string;       // レッスンで使用された楽器
  difficulty?: string;      // レッスンの難易度情報（あれば）
}
```

### 2.2 バックエンドレスポンス形式
```typescript
interface GenerateTasksResponse {
  menus: PracticeMenu[];    // 推薦された練習メニュー一覧
}
```

### 2.3 練習メニューデータ
既存の`PracticeMenu`インターフェースをそのまま使用する。

## 3. システム構成

- **フロントエンド**: React Native＋Expo Router上のレッスン詳細画面（`/(lesson-detail)/[id]/...`）
- **バックエンド**: Firebase Functions (Node.js 20, メモリ4GB, タイムアウト300秒, インスタンス最大10)
- **データベース**: Firestore（`practiceMenu` コレクション）
- **AIサービス**: OpenAI API（Secret ManagerでAPIキー管理）

## 4. 機能要件

1. レッスン詳細画面に「タスク生成」ボタンを表示し、押下すると`GenerateTasksRequest`をCloud Functionに送信する。
2. Cloud FunctionはAPIキーをSecret Managerから取得し、OpenAIにプロンプトを送信。
3. OpenAIから返却されたキーワード／タグ情報をもとにFirestoreの`practiceMenu`コレクションを検索。
4. 検索結果をソート（関連度／難易度マッチ）し、最大5件を抽出。
5. フロントエンドに`GenerateTasksResponse`形式で返却。
6. フロントエンドは結果を一覧表示し、ユーザーは個別メニューを選択してタスク化できる。

## 5. API仕様

### 5.1 Cloud Function: `generateTasksFromLesson`
- **呼び出し方式**: HTTPS Callable
- **リージョン**: asia-northeast1
- **メモリ**: 4GB
- **タイムアウト**: 300秒
- **最大インスタンス数**: 10

#### リクエストデータ
- body: `GenerateTasksRequest` オブジェクト

#### レスポンスデータ
- 成功: `{ menus: PracticeMenu[] }`
- 失敗: エラーオブジェクト（ステータスコード400〜500）

#### 処理フロー
1. ユーザー認証チェック
2. Secret ManagerからOpenAI APIキー取得
3. OpenAIにプロンプト送信 (要約＋タグ＋楽器＋難易度)
4. AIの返答（キーワードリストまたはメニューIDリスト）をパース
5. Firestore検索クエリを組み立て（タグやdifficultyフィールドでフィルタ）
6. 検索結果を最大5件取得
7. レスポンス生成

## 6. UI設計

1. レッスン詳細画面のヘッダー横に「タスク生成」ボタン（開発中バッジ付き）を配置。
2. ボタン押下時にローディングインジケータ表示。
3. 成功時はモーダルで推薦リストを表示し、各メニューの概要（タイトル、説明、所要時間、難易度）をカード形式で列挙。
4. 各カードの右上に「＋タスク登録」ボタンを設置。
5. 登録後は確認トーストを表示し、選択済みはチェックマークに変化。

## 7. 実装ステップ

### 7.1 バックエンド
1. `functions/src/practice-menu/genkit.ts` に`generateTasksFromLesson`関数を追加または拡張。
2. Secret ManagerからのAPIキー取得ユーティリティを共通化(`common/secret.ts`)。
3. OpenAI呼び出しロジックを`common/llm.ts`に抽出。
4. Firestore検索ロジックを`practice-menu/models.ts`に実装。
5. 関数エラーハンドリングとログ出力を追加。

### 7.2 フロントエンド
1. レッスン詳細画面（`app/(lesson-detail)/...`）にボタン追加。
2. `expo-router` の`useNavigation`と`useMutation`（React Queryなど）でCloud Function呼び出し。
3. レスポンス表示モーダルコンポーネント作成(`LessonTaskGenModal.tsx`)。
4. タスク登録API呼び出し（既存のタスク化ロジックを再利用）へのハンドオフ。
5. テスト用モックデータで画面動作検証。

## 8. テスト計画

1. Cloud Function単体テスト (Jest): リクエストからレスポンスまでの正常系、エラー系。
2. Firestore検索ユニットテスト: タグフィルタ、難易度フィルタ。
3. エンドツーエンドテスト (DetoxまたはReact Native Testing Library): レッスン詳細画面でタスク生成ボタンを押し、モーダル表示からタスク登録まで。

## 9. セキュリティ

- Firebase Functions IAMでCallable関数への認証必須。
- Firestoreセキュリティルールで`practiceMenu`コレクションは読み取り専用ユーザーにも公開。
- APIキーはSecret Managerで管理し、ロギングにキー情報を含めない。

## 10. ロードマップ

- フェーズ1: 基本検索・推薦機能実装 (2週間)
- フェーズ2: UI/UX改善・ランキングロジック調整 (1週間)
- フェーズ3: A/Bテスト・ユーザーフィードバック反映 (2週間)
