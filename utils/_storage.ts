import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorageからデータを取得する
 * @param key キー
 */
export const getLocalStorageItem = async (key: string): Promise<any | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`ストレージからの読み込みエラー (${key}):`, error);
    return null;
  }
};

/**
 * AsyncStorageにデータを保存する
 * @param key キー
 * @param value 値
 */
export const setLocalStorageItem = async (key: string, value: any): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`ストレージへの書き込みエラー (${key}):`, error);
    return false;
  }
};

/**
 * AsyncStorageからデータを削除する
 * @param key キー
 */
export const removeLocalStorageItem = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`ストレージからの削除エラー (${key}):`, error);
    return false;
  }
}; 