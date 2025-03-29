/**
 * 日付フォーマット用のユーティリティ関数
 */

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/**
 * 日付を「YYYY年MM月DD日」形式でフォーマットする
 * @param date 日付オブジェクトまたは日付文字列
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  try {
    // デバッグ情報（短縮版）
    console.log('formatDate - 入力値:', typeof date === 'string' ? date.substring(0, 10) + '...' : date);
    
    // nullまたはundefinedの場合
    if (date === null || date === undefined) {
      return '日付なし';
    }

    // 空文字列の場合
    if (typeof date === 'string' && date.trim() === '') {
      return '日付なし';
    }
    
    // 日本語形式の日付をパースする処理
    if (typeof date === 'string' && date.includes('年') && date.includes('月') && date.includes('日')) {
      const matches = date.match(/(\d+)年(\d+)月(\d+)日/);
      if (matches && matches.length === 4) {
        const [_, year, month, day] = matches;
        // JavaScriptのDateは月が0-11なので、1を引く
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
    
    // 引数がstring型の場合はDateオブジェクトに変換
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // 無効な日付かどうかチェック
    if (isNaN(dateObj.getTime())) {
      return '日付なし';
    }
    
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1; // 0-11 → 1-12に変換
    const day = dateObj.getDate();
    
    // 曜日表示を削除し、年月日のみを返すように修正
    return `${year}年${month}月${day}日`;
  } catch (err) {
    console.error('formatDate: 日付変換エラー', err);
    return '日付エラー';
  }
};

/**
 * 日付を「HH:MM」形式でフォーマットする
 * @param date 日付オブジェクト
 * @returns フォーマットされた時刻文字列
 */
export const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

/**
 * 日付を「YYYY-MM-DD」形式でフォーマットする（APIリクエスト用）
 * @param date 日付オブジェクト
 * @returns フォーマットされた日付文字列
 */
export const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 現在の日付から指定された月数前の日付を取得する
 * @param months 遡る月数
 * @returns 計算された日付オブジェクト
 */
export const getDateMonthsAgo = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

/**
 * 2つの日付の間の日数を計算する
 * @param date1 1つ目の日付
 * @param date2 2つ目の日付
 * @returns 日数の差
 */
export const getDaysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000; // ミリ秒単位での1日
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.round(diffTime / oneDay);
};

/**
 * 日付が今日かどうかを判定する
 * @param date 判定する日付
 * @returns 今日の場合はtrue、それ以外はfalse
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * 日付が昨日かどうかを判定する
 * @param date 判定する日付
 * @returns 昨日の場合はtrue、それ以外はfalse
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};
