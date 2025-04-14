import { ref, uploadBytesResumable, getDownloadURL, updateMetadata } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, getDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db, storage, auth } from '../config/firebase';
import { processAudioFile } from './audioProcessing';

export interface LessonFormData {
  teacherName: string;
  date: string;
  pieces: string[];
  notes: string;
  tags: string[];
  userPrompt?: string; // AI用の指示（要約生成時のヒント）
  priority?: 'high' | 'medium'; // 優先度（重要/基本）
}

// UUIDを生成する関数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 教師名、日付、ユーザーIDから確定的なIDを生成する関数
 */
function generateDeterministicId(userId: string, teacherName: string, date: string): string {
  // 特殊文字を削除して小文字に変換
  const normalizedTeacherName = teacherName.trim().toLowerCase().replace(/\s+/g, '_');
  const normalizedDate = date.replace(/[-年月日]/g, '');
  
  // 確定的なIDを生成
  return `${userId}_${normalizedTeacherName}_${normalizedDate}`;
}

/**
 * ISO形式の日付文字列をYYYY年MM月DD日形式に変換する関数
 */
function formatDateToJapanese(dateStr: string): string {
  try {
    // dateStrがYYYY-MM-DD形式であることを期待
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      console.error('日付形式が正しくありません:', dateStr);
      return dateStr; // 変換できない場合はそのまま返す
    }
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('日付の数値変換に失敗しました:', dateStr);
      return dateStr;
    }
    
    return `${year}年${month}月${day}日`;
  } catch (error) {
    console.error('日付変換エラー:', error);
    return dateStr;
  }
}

/**
 * レッスンデータをFirestoreに保存する
 */
export const saveLesson = async (
  formData: LessonFormData,
  audioFile: { uri: string; name: string } | null, // 音声ファイルを受け取れるように変更
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: string, message: string) => void
): Promise<string> => {
  try {
    // ユーザーIDを取得
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('ユーザーが認証されていません');
    }

    // ユーザープロファイルから楽器情報を取得
    const userProfileRef = doc(db, `users/${userId}/profile`, 'main');
    const userProfileDoc = await getDoc(userProfileRef);
    let instrumentName = 'standard'; // デフォルト値

    if (userProfileDoc.exists()) {
      const profileData = userProfileDoc.data();
      if (profileData.selectedInstrument) {
        instrumentName = profileData.selectedInstrument;
        console.log(`ユーザープロファイルから楽器情報を取得しました: ${instrumentName}`);
      }
    }

    // Firestoreにレッスンデータを保存
    onStatusChange?.('saving', 'レッスンデータを保存中...');
    
    const hasAudioFile = audioFile && audioFile.uri && audioFile.name;
    
    // 日付をYYYY年MM月DD日形式に変換 (ISO形式の場合のみ)
    const japaneseDate = formData.date.includes('-') 
      ? formatDateToJapanese(formData.date) 
      : formData.date;
    
    // 確定的なドキュメントIDを生成
    const deterministicId = generateDeterministicId(userId, formData.teacherName, japaneseDate);
    console.log(`確定的ドキュメントID: ${deterministicId}`);
    
    // 固定ドキュメントIDで参照を作成
    const lessonRef = doc(db, `users/${userId}/lessons`, deterministicId);
    
    // ドキュメントデータを準備
    const lessonData = {
      ...formData,
      date: japaneseDate, // 日本語形式の日付に変換
      user_id: userId,
      instrument: instrumentName, // 楽器情報を追加
      createdAt: new Date(),
      updatedAt: new Date(),
      // 音声ファイルがあれば処理中、なければ完了状態
      status: hasAudioFile ? 'processing' : 'completed',
      audioUrl: '',
      lessonUniqId: deterministicId, // 固有のIDを保存
    };
    
    // setDocを使って、固定IDでドキュメントを作成または更新
    console.log('Firestoreにレッスンデータを保存します', { 
      teacherName: formData.teacherName, 
      instrument: instrumentName,
      date: japaneseDate,
      deterministicId,
      hasAudio: !!hasAudioFile
    });
    
    await setDoc(lessonRef, lessonData, { merge: true });
    console.log(`レッスンが保存されました。ID: ${deterministicId}, instrument: ${instrumentName}, date: ${japaneseDate}`);
    
    // 音声ファイルがある場合は処理を開始
    if (hasAudioFile && audioFile) {
      onStatusChange?.('uploading', '音声ファイルをアップロード中...');
      
      try {
        // 音声処理を開始 - 必ず確定的IDを渡す
        console.log(`音声処理を開始します。ID: ${deterministicId}, URI: ${audioFile.uri.substring(0, 30)}..., ファイル名: ${audioFile.name}, 楽器: ${instrumentName}`);
        const result = await processAudioFile(
          deterministicId,
          audioFile.uri,
          audioFile.name,
          instrumentName // 楽器情報を渡す
        );
        
        console.log('processAudioFile関数の実行結果:', result);
        
        if (result.success) {
          onStatusChange?.('processing', '音声ファイルを処理中...');
          console.log(`音声処理が開始されました: ${deterministicId}`);
          
          // 後で非同期処理が完了したときにエラーを表示しないよう、明示的にステータスを更新
          await updateDoc(lessonRef, {
            status: 'processing',
            clientMessage: 'レッスン処理を開始しました。完了までお待ちください。',
            updatedAt: new Date()
          });
          
          // shouldRedirectフラグが設定されていれば即時リダイレクト
          if (result.shouldRedirect) {
            console.log('リダイレクトフラグが設定されています。すぐにリダイレクトします。');
          }
        } else {
          // エラーの詳細を取得して表示
          const errorMessage = (result.error instanceof Error) ? 
            `${result.error.name}: ${result.error.message}` : 
            JSON.stringify(result.error);
          
          console.error(`音声処理の開始に失敗しました: ${errorMessage}`);
          onStatusChange?.('error', `音声処理の開始に失敗しました: ${errorMessage}`);
          
          // エラー時はステータスを更新
          await updateDoc(lessonRef, {
            status: 'error',
            errorMessage: errorMessage || '不明なエラー',
            updatedAt: new Date()
          });
        }
      } catch (uploadError) {
        // エラーの詳細を取得して表示
        const errorMessage = (uploadError instanceof Error) ? 
          `${uploadError.name}: ${uploadError.message}` : 
          JSON.stringify(uploadError);
        
        console.error(`音声アップロードエラー: ${errorMessage}`);
        onStatusChange?.('error', `音声アップロードに失敗しました: ${errorMessage}`);
        
        // エラー時はステータスを更新
        await updateDoc(lessonRef, {
          status: 'error',
          errorMessage: errorMessage || '不明なエラー',
          updatedAt: new Date()
        });
      }
    }
    
    return deterministicId;
    
  } catch (error) {
    console.error('レッスン保存エラー:', error);
    throw error;
  }
};  