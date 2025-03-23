import { ref, uploadBytesResumable, getDownloadURL, updateMetadata } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage, auth } from '../config/firebase';
import { processAudioFile } from './audioProcessing';

export interface LessonFormData {
  teacherName: string;
  date: string;
  pieces: string[];
  notes: string;
  tags: string[];
  aiInstructions?: string; // AI用の指示（要約生成時のヒント）
}

// UUIDを生成する関数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
    
    const lessonUniqId = generateUUID(); // 固有のlessonUniqIdを生成
    const hasAudioFile = audioFile && audioFile.uri && audioFile.name;
    
    // 日付をYYYY年MM月DD日形式に変換 (ISO形式の場合のみ)
    const japaneseDate = formData.date.includes('-') 
      ? formatDateToJapanese(formData.date) 
      : formData.date;
    
    // ドキュメントを作成（新規レッスン）
    const lessonData = {
      ...formData,
      date: japaneseDate, // 日本語形式の日付に変換
      user_id: userId,
      instrument: instrumentName, // 楽器情報を追加
      createdAt: new Date(),
      // 音声ファイルがあれば処理中、なければ完了状態
      status: hasAudioFile ? 'processing' : 'completed',
      audioUrl: '',
      lessonUniqId: lessonUniqId, // 固有のIDを保存
    };
    
    // Firestoreにドキュメントを作成（ユーザーベース構造）
    console.log('Firestoreにレッスンデータを保存します', { 
      teacherName: formData.teacherName, 
      instrument: instrumentName,
      date: japaneseDate, // 日本語形式の日付をログに出力
      lessonUniqId,
      hasAudio: !!hasAudioFile
    });
    
    const docRef = await addDoc(collection(db, `users/${userId}/lessons`), lessonData);
    const lessonId = docRef.id;
    console.log(`レッスンが作成されました。ID: ${lessonId}, instrument: ${instrumentName}, date: ${japaneseDate}, lessonUniqId: ${lessonUniqId}`);
    
    // 処理ID生成
    const timestamp = new Date().getTime();
    const processingId = hasAudioFile 
      ? `processing_${userId}_${timestamp}` 
      : `completed_${userId}_${timestamp}`;
    
    // ドキュメントを更新してステータスとprocessingIdを設定
    await updateDoc(doc(db, `users/${userId}/lessons`, lessonId), {
      status: hasAudioFile ? 'processing' : 'completed',
      processingId: processingId,
      processing_id: processingId, // 両方のフィールド名に対応
      lessonUniqId: lessonUniqId,
      updated_at: new Date()
    });
    
    console.log(`レッスンステータスを更新しました。ID: ${lessonId}, Status: ${hasAudioFile ? 'processing' : 'completed'}, processingId: ${processingId}`);
    
    // 音声ファイルがある場合は処理を開始
    if (hasAudioFile && audioFile) {
      onStatusChange?.('uploading', '音声ファイルをアップロード中...');
      
      try {
        // 音声処理を開始
        console.log(`音声処理を開始します。ID: ${lessonId}, URI: ${audioFile.uri.substring(0, 30)}..., ファイル名: ${audioFile.name}`);
        const result = await processAudioFile(
          lessonId,
          audioFile.uri,
          audioFile.name,
          processingId
        );
        
        if (result.success) {
          onStatusChange?.('processing', '音声ファイルを処理中...');
          console.log(`音声処理が開始されました: ${lessonId}`);
        } else {
          // エラーの詳細を取得して表示
          const errorMessage = (result.error instanceof Error) ? 
            `${result.error.name}: ${result.error.message}` : 
            JSON.stringify(result.error);
          
          console.error(`音声処理の開始に失敗しました: ${errorMessage}`);
          onStatusChange?.('error', `音声処理の開始に失敗しました: ${errorMessage}`);
          
          // エラー時はステータスを更新
          await updateDoc(doc(db, `users/${userId}/lessons`, lessonId), {
            status: 'error',
            errorMessage: errorMessage || '不明なエラー',
            updated_at: new Date()
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
        await updateDoc(doc(db, `users/${userId}/lessons`, lessonId), {
          status: 'error',
          errorMessage: errorMessage || '不明なエラー',
          updated_at: new Date()
        });
      }
    }
    
    return lessonId;
    
  } catch (error) {
    console.error('レッスン保存エラー:', error);
    throw error;
  }
}; 