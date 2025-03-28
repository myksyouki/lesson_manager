# データ移行テスト手順

このドキュメントでは、データベース構造の移行をテストするための手順を説明します。

## 前提条件

- Firebase CLIがインストールされていること
- プロジェクトへの管理者権限があること

## 1. 環境の準備

### 1.1 コードのデプロイ

以下のコマンドを実行して、Firebase FunctionsとFirestoreのルール、インデックスをデプロイします。

```bash
# Firebaseへのデプロイ
firebase deploy --only functions,firestore:rules,firestore:indexes
```

### 1.2 アプリのビルドと起動

アプリをローカルで起動します。

```bash
# 依存関係のインストール（必要であれば）
npm install

# 開発サーバーの起動
npm run dev
```

## 2. 単一ユーザーのデータ移行テスト

### 2.1 移行前のデータ確認

1. Firebaseコンソールにアクセスして、以下のコレクションのデータを確認します。
   - `userProfiles/{userId}`
   - `lessons` (user_id = {userId}のドキュメント)
   - `tasks` (userId = {userId}のドキュメント)
   - `chatRooms` (userId = {userId}のドキュメント)

2. ドキュメント数やデータの内容をメモしておきます。

### 2.2 管理画面へのアクセス

1. ブラウザでアプリを開き、ログインします。
2. `/admin/db-migration`にアクセスします。

### 2.3 データ構造切り替え

1. 「ユーザーベース構造に切り替え」ボタンをクリックします。
2. 確認メッセージが表示されたら「OK」をクリックします。
3. ステータスが「ユーザーベース（新構造）」に変わったことを確認します。

### 2.4 単一ユーザーデータの移行

1. 「現在のユーザーデータを移行」ボタンをクリックします。
2. 処理中のローディングが表示されることを確認します。
3. 完了メッセージが表示されるまで待ちます。

### 2.5 移行後のデータ確認

1. Firebaseコンソールで、新しいデータ構造を確認します。
   - `users/{userId}/profile/main`
   - `users/{userId}/lessons/{lessonId}`
   - `users/{userId}/tasks/{taskId}`
   - `users/{userId}/chatRooms/{roomId}`

2. ドキュメント数と内容が移行前と一致することを確認します。

### 2.6 アプリの動作確認

1. アプリのメイン画面を開き、データが正しく表示されることを確認します。
2. レッスン一覧、タスク一覧、チャットルーム一覧が正しく表示されるか確認します。
3. 新しいデータの作成、更新、削除が正常に機能するか確認します。

## 3. 全ユーザーデータの移行テスト

**注意**: この手順は本番環境の全データに影響します。テスト環境で先に実施してください。

### 3.1 移行前のデータ確認

1. Firebaseコンソールで全ユーザーのドキュメント数を確認します。
   - `userProfiles` コレクションのドキュメント数
   - `lessons`, `tasks`, `chatRooms` の各コレクションのドキュメント数

### 3.2 全ユーザーデータの移行

1. 管理画面で「全ユーザーデータを移行」ボタンをクリックします。
2. 確認ダイアログが表示されたら「続行」をクリックします。
3. 処理中のローディングが表示されることを確認します。
4. 完了メッセージと移行状況のサマリーが表示されるまで待ちます。

### 3.3 移行結果の確認

1. 移行状況のサマリーを確認します。
   - 成功したユーザー数、失敗したユーザー数
   - 失敗したユーザーがいる場合は、そのリストを確認

2. Firebaseコンソールで `users` コレクションの構造を確認します。
   - 各ユーザーのサブコレクションが正しく作成されているか
   - ドキュメント数が移行前と一致するか

### 3.4 複数ユーザーでのアプリ動作確認

1. 複数のユーザーアカウントでログインして動作確認します。
2. 各機能（レッスン、タスク、チャット）が正常に動作するか確認します。

## 4. 問題が発生した場合

### 4.1 構造の切り戻し

問題が発生した場合は、従来の構造に戻すことができます。

1. 管理画面で「従来型構造に切り替え」ボタンをクリックします。
2. 確認メッセージが表示されたら「OK」をクリックします。
3. ステータスが「従来型（旧構造）」に変わったことを確認します。

### 4.2 ログの確認

1. Firebase Functionsのログで詳細なエラー情報を確認します。
   - Firebase コンソール > Functions > ログ
   - `migrateUserData` と `migrateAllUsersData` 関数のログを確認

### 4.3 個別の再試行

1. 失敗したユーザーのデータのみを再度移行します。
   - Functionsをトリガーして特定のユーザーIDのみ再処理

## 5. 完全移行後の後片付け

すべてのユーザーデータが正常に移行され、問題なく動作することを確認できたら、以下の作業を行います。

### 5.1 古いデータの削除（オプション）

**注意**: この手順は元に戻せません。必ずバックアップを取ってから実行してください。

古いデータ構造のコレクションからデータを削除するバッチジョブを実行します。

### 5.2 移行コードの無効化（将来的な作業）

移行が完全に完了したら、移行関連のコードを無効化または削除できます。

1. 移行関数（migrateUserData, migrateAllUsersData）を無効化
2. 従来型構造へのフォールバックコードを削除

以上でデータ移行テストは完了です。 