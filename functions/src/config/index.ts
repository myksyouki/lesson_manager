/**
 * 設定ファイル
 * 環境変数と定数を一元管理
 */

// Firebase Functions の設定
export const FUNCTION_REGION = "asia-northeast1"; // 東京リージョン
export const DEFAULT_MEMORY = "4GB"; // デフォルトメモリ
export const DEFAULT_TIMEOUT = 3600; // デフォルトタイムアウト（秒）
export const MIN_INSTANCES = 0; // 最小インスタンス数
export const MAX_INSTANCES = 50; // 最大インスタンス数

// Firebase Storage 設定
export const STORAGE_BUCKET = "lesson-manager-99ab9.firebasestorage.app";
export const AUDIO_PATH_PREFIX = "audio";
export const TEMP_DIR = "/tmp";

// 音声処理の設定
export const MAX_AUDIO_DURATION_SECONDS = 5400; // 最大90分
export const MAX_AUDIO_SIZE_MB = 25; // 最大ファイルサイズ (MB)
export const CHUNK_DURATION_SECONDS = 600; // 10分チャンク
export const CHUNK_OVERLAP_SECONDS = 20; // 20秒オーバーラップ
export const MAX_CHUNK_SIZE_MB = 10; // 分割する音声チャンクの最大サイズ (MB)
export const VALID_AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/wav",
  "audio/x-wav", "audio/wave", "audio/webm", "audio/ogg",
  "audio/m4a", "audio/x-m4a",
];
export const VALID_AUDIO_EXTENSIONS = [
  ".mp3", ".mp4", ".wav", ".wave", ".webm",
  ".ogg", ".m4a", ".oga", ".opus",
];

// Secret Manager キー名
export const OPENAI_API_KEY_SECRET = "openai-api-key";
export const DIFY_API_KEY_SECRET = "dify-summary-api-key";
export const DIFY_APP_ID_SECRET = "dify-summary-app-id";
export const GEMINI_API_KEY_SECRET = "gemini-api-key";
export const DIFY_PRACTICE_API_KEY_SECRET = "dify-practice-api-key";
export const DIFY_PRACTICE_APP_ID_SECRET = "dify-practice-app-id";

// API エンドポイント
export const DIFY_API_ENDPOINT = "https://api.dify.ai/v1";
export const WHISPER_API_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
export const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

// 楽器別のDify API設定
export const INSTRUMENT_DIFY_CONFIGS = {
  default: {
    apiEndpoint: DIFY_API_ENDPOINT,
    appIdSecret: DIFY_PRACTICE_APP_ID_SECRET,
    apiKeySecret: DIFY_PRACTICE_API_KEY_SECRET,
  },
  saxophone: {
    apiEndpoint: DIFY_API_ENDPOINT,
    appIdSecret: DIFY_PRACTICE_APP_ID_SECRET,
    apiKeySecret: DIFY_PRACTICE_API_KEY_SECRET,
  },
  piano: {
    apiEndpoint: DIFY_API_ENDPOINT,
    appIdSecret: DIFY_PRACTICE_APP_ID_SECRET,
    apiKeySecret: DIFY_PRACTICE_API_KEY_SECRET,
  },
  violin: {
    apiEndpoint: DIFY_API_ENDPOINT,
    appIdSecret: DIFY_PRACTICE_APP_ID_SECRET,
    apiKeySecret: DIFY_PRACTICE_API_KEY_SECRET,
  },
};

// プロジェクト ID
export const PROJECT_ID = "lesson-manager-99ab9";

// コレクション情報
export const LESSONS_COLLECTION = "lessons";
export const USERS_COLLECTION = "users";

// タグ生成の設定
export const MAX_TAGS = 10;
