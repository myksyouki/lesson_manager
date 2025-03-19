/**
 * アプリケーション設定
 * アプリ全体の動作設定を管理します
 */

// データベース構造のバージョン定義
export enum DatabaseStructure {
  LEGACY = 'legacy',  // 従来の構造（コレクション別）
  USER_BASED = 'user_based'  // ユーザーごとのサブコレクション
}

interface AppConfig {
  // 使用するデータベース構造
  databaseStructure: DatabaseStructure;
  
  // 段階的移行中かどうか
  isMigrationInProgress: boolean;
  
  // Firebase インデックスの設定
  firebaseIndexes: {
    // ユーザーベースのインデックスがセットアップ済みかどうか
    userBasedStructureReady: boolean;
  };
  
  // デバッグモード
  debug: boolean;
}

// デフォルト設定
const defaultConfig: AppConfig = {
  databaseStructure: DatabaseStructure.LEGACY,
  isMigrationInProgress: false,
  firebaseIndexes: {
    userBasedStructureReady: false
  },
  debug: false
};

// 現在の設定（実行時に変更される可能性があるのでletで宣言）
let currentConfig: AppConfig = { ...defaultConfig };

/**
 * 設定の一部を更新する
 * @param newConfig 更新する設定
 */
export const updateConfig = (newConfig: Partial<AppConfig>): void => {
  currentConfig = {
    ...currentConfig,
    ...newConfig
  };
  
  console.log('アプリ設定が更新されました:', currentConfig);
};

/**
 * 現在の設定を取得する
 * @returns 現在の設定
 */
export const getConfig = (): AppConfig => {
  return { ...currentConfig };
};

/**
 * ユーザーベースの構造を使用するかどうかを設定する
 * @param useUserBasedStructure ユーザーベースの構造を使用する場合はtrue
 */
export const setUseUserBasedStructure = (useUserBasedStructure: boolean): void => {
  updateConfig({
    databaseStructure: useUserBasedStructure 
      ? DatabaseStructure.USER_BASED 
      : DatabaseStructure.LEGACY
  });
};

/**
 * 現在ユーザーベースの構造を使用しているかどうかを取得する
 * @returns ユーザーベースの構造を使用している場合はtrue
 */
export const isUsingUserBasedStructure = (): boolean => {
  return currentConfig.databaseStructure === DatabaseStructure.USER_BASED;
};

/**
 * 移行プロセス中かどうかを設定する
 * @param inProgress 移行中の場合はtrue
 */
export const setMigrationInProgress = (inProgress: boolean): void => {
  updateConfig({ isMigrationInProgress: inProgress });
};

/**
 * 移行プロセス中かどうかを取得する
 * @returns 移行中の場合はtrue
 */
export const isMigrationInProgress = (): boolean => {
  return currentConfig.isMigrationInProgress;
};

/**
 * ユーザーベース構造のインデックスが準備完了しているかどうかを設定する
 * @param ready 準備完了の場合はtrue
 */
export const setUserBasedIndexesReady = (ready: boolean): void => {
  updateConfig({
    firebaseIndexes: {
      ...currentConfig.firebaseIndexes,
      userBasedStructureReady: ready
    }
  });
};

/**
 * ユーザーベース構造のインデックスが準備完了しているかどうかを取得する
 * @returns 準備完了の場合はtrue
 */
export const areUserBasedIndexesReady = (): boolean => {
  return currentConfig.firebaseIndexes.userBasedStructureReady;
};

/**
 * デバッグモードを設定する
 * @param enabled デバッグモードを有効にする場合はtrue
 */
export const setDebugMode = (enabled: boolean): void => {
  updateConfig({ debug: enabled });
};

/**
 * デバッグモードかどうかを取得する
 * @returns デバッグモードの場合はtrue
 */
export const isDebugMode = (): boolean => {
  return currentConfig.debug;
}; 