import { uploadAudioFile } from './storage';
import { useLessonStore } from '../store/lessons';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { auth, db, functions } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from 'firebase/functions';

// アップロード中のレッスンIDを追跡して重複処理を防止
const processingLessons = new Map<string, number>();

// 処理結果の型を定義
interface ProcessAudioResult {
  success: boolean;
  lessonId: string;
  lessonUniqId?: string;
  transcription?: string;
  summary?: string;
  tags?: string[];
  error?: any;
  errorDetails?: any; // エラー詳細情報用のプロパティを追加
}

// Process audio file: upload, transcribe, summarize, and save to Firestore
export const processAudioFile = async (
  lessonId: string, 
  fileUri: string, 
  fileName: string,
  processingId: string
): Promise<ProcessAudioResult> => {
  try {
    // 同じレッスンIDが処理中かチェック
    if (processingLessons.has(lessonId)) {
      const startTime = processingLessons.get(lessonId);
      const now = Date.now();
      // 5分以内に同じレッスンIDの処理があれば、重複処理と判断してスキップ
      if (startTime && now - startTime < 5 * 60 * 1000) {
        console.log(`レッスン ${lessonId} は既に処理中です（${(now - startTime) / 1000}秒前から）。重複処理を防止します。`);
        return {
          success: true,
          lessonId: lessonId,
        };
      }
    }
    
    // 処理開始をマーク
    processingLessons.set(lessonId, Date.now());
    
    console.log(`音声処理開始: レッスンID=${lessonId}, 処理ID=${processingId || 'なし'}`);
    
    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    // まず同じレッスンIDを持つ他のドキュメントをチェック
    try {
      const lessonsRef = collection(db, `users/${user.uid}/lessons`);
      const q = query(lessonsRef);
      const querySnapshot = await getDocs(q);
      
      let existingLessonCount = 0;
      querySnapshot.forEach((doc) => {
        if (doc.id === lessonId) {
          existingLessonCount++;
        }
      });
      
      console.log(`同じレッスンIDを持つドキュメント数: ${existingLessonCount}`);
      
      if (existingLessonCount > 1) {
        console.warn(`注意: 同じレッスンID ${lessonId} を持つドキュメントが複数見つかりました`);
      }
    } catch (err) {
      console.warn("レッスン重複チェックエラー:", err);
    }

    // まず既存のドキュメントをチェックして一貫性を確保
    try {
      const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
      const lessonSnapshot = await getDoc(lessonRef);
      
      if (lessonSnapshot.exists()) {
        const lessonData = lessonSnapshot.data();
        
        // ドキュメントからlessonUniqIdを取得（あれば）
        const lessonUniqId = lessonData.lessonUniqId;
        
        // audioFileNameとprocessingIdがあれば、それを使う
        if (lessonData.audioFileName && lessonData.processingId) {
          console.log(`既存のファイル名を使用: ${lessonData.audioFileName}`);
          console.log(`既存の処理IDを使用: ${lessonData.processingId}`);
          
          const uploadResult = await uploadAudioFile(fileUri, lessonData.audioFileName, lessonId);
          
          if (!uploadResult.success) {
            throw new Error('ファイルのアップロードに失敗しました');
          }
          
          // Firebase Functions を直接呼び出して処理を開始
          const audioUrl = uploadResult.url || `gs://${process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET}/audio/${user.uid}/${lessonData.audioFileName}`;
          console.log(`Firebase Functions APIを直接呼び出して音声処理を開始します: ${audioUrl}`);
          
          // レッスンのステータスを更新して処理中であることを示す
          await updateDoc(lessonRef, {
            status: 'processing',
            message: 'Firebase Functionsで処理中...',
            audioUrl: audioUrl
          });
          
          // Firebase Functions APIを直接呼び出し
          const processAudio = httpsCallable(functions, 'processAudioV3FuncV2');
          const result = await processAudio({
            audioUrl: audioUrl,
            lessonId: lessonId,
            userId: user.uid,
            instrumentName: lessonData.instrument || 'standard'
          });
          
          console.log('Firebase Functions API呼び出し結果:', result.data);
          
          // 処理結果が返ってきたらステータスを確認
          const updatedLessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
          const updatedLessonSnap = await getDoc(updatedLessonRef);
          
          if (updatedLessonSnap.exists()) {
            const updatedLessonData = updatedLessonSnap.data();
            
            // サーバー側でエラーが発生した場合（processing-errorなど）
            if (updatedLessonData.status && updatedLessonData.status.includes('error')) {
              console.log(`サーバー処理でエラーが発生しました: ${updatedLessonData.status}`);
              
              // エラーステータスを保持しつつ、リトライ可能にする
              await updateDoc(updatedLessonRef, {
                retryable: true,
                clientMessage: 'サーバー側で処理エラーが発生しました。後でリトライしてください。',
                updated_at: serverTimestamp()
              });
              
              // エラー情報を含んだ結果を返す
              return {
                success: false,
                lessonId: lessonId,
                error: updatedLessonData.error || '処理エラー',
                errorDetails: updatedLessonData.errorDetails || '詳細不明'
              };
            }
            
            // 処理が完了していることを確認
            if (updatedLessonData.status === 'completed') {
              console.log(`レッスン ${lessonId} の処理が正常に完了しました`);
            } else {
              console.log(`レッスン ${lessonId} のステータスが予期しない値です: ${updatedLessonData.status}`);
            }
          }
          
          // 処理完了したら追跡から削除
          processingLessons.delete(lessonId);
          
          return { 
            success: true, 
            lessonId: lessonId,
            lessonUniqId: lessonUniqId
          };
        }
      }
    } catch (checkError) {
      console.warn("既存のレッスンデータ取得中にエラーが発生しました:", checkError);
      // エラーが発生しても続行し、新しいファイル名を生成する
    }

    // ファイル名をlessonUniqIdベースにする（もしあれば）
    let fileNameWithUniqId = `${lessonId}.${fileName.split('.').pop() || 'mp3'}`;
    
    // レッスンデータからlessonUniqIdを取得
    try {
      const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
      const lessonSnapshot = await getDoc(lessonRef);
      
      if (lessonSnapshot.exists()) {
        const lessonData = lessonSnapshot.data();
        if (lessonData.lessonUniqId) {
          // lessonUniqIdがあればそれをファイル名に使用
          const fileExt = fileName.split('.').pop() || 'mp3';
          fileNameWithUniqId = `${lessonData.lessonUniqId}.${fileExt}`;
          console.log(`lessonUniqIdを使用したファイル名: ${fileNameWithUniqId}`);
          
          // このlessonUniqIdで他のドキュメントも検索して重複チェック
          try {
            const uniqIdQuery = query(
              collection(db, `users/${user.uid}/lessons`), 
              where("lessonUniqId", "==", lessonData.lessonUniqId)
            );
            const uniqIdSnapshot = await getDocs(uniqIdQuery);
            
            if (uniqIdSnapshot.size > 1) {
              console.warn(`注意: 同じlessonUniqId ${lessonData.lessonUniqId} を持つドキュメントが複数見つかりました (${uniqIdSnapshot.size}件)`);
              
              // 処理中のもの以外は古いものとしてマーク
              for (const doc of uniqIdSnapshot.docs) {
                if (doc.id !== lessonId) {
                  console.log(`  - 重複ドキュメント: ${doc.id}, ステータス: ${doc.data().status || '不明'}`);
                }
              }
            }
          } catch (dupError) {
            console.warn("lessonUniqId重複チェック中にエラーが発生:", dupError);
          }
        }
      }
    } catch (error) {
      console.warn("lessonUniqIdの取得に失敗しました:", error);
    }
    
    console.log(`生成したファイル名: ${fileNameWithUniqId} (元のファイル名: ${fileName})`);

    // 重要：同じlessonIDを持つ処理中の複数ファイルを避けるため、
    // 同じタイムスタンプを使用
    const uniqueProcessingId = processingId || `lesson_${user.uid}_${Date.now()}`;
    console.log(`使用する処理ID: ${uniqueProcessingId}`);
    
    // ファイルパスを事前に構築して一貫性を確保
    const audioPath = `audio/${user.uid}/${fileNameWithUniqId}`;
    console.log(`設定するaudioPath: ${audioPath}`);

    // Get the lesson document reference
    const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);

    // Update the lesson status to 'processing'
    await updateDoc(lessonRef, {
      status: 'processing',
      audioPath: audioPath,
      processingId: uniqueProcessingId,
      // ファイル名をドキュメントに保存して追跡しやすくする
      audioFileName: fileNameWithUniqId
    });

    // Upload the audio file to Firebase Storage
    const uploadResult = await uploadAudioFile(fileUri, fileNameWithUniqId, lessonId);

    if (!uploadResult.success) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    // レッスンデータを取得して楽器情報を確認
    const lessonSnapshot = await getDoc(lessonRef);
    const instrumentName = lessonSnapshot.exists() && lessonSnapshot.data().instrument 
      ? lessonSnapshot.data().instrument 
      : 'standard';

    // Firebase Functions APIを直接呼び出す
    const audioUrl = uploadResult.url || `gs://${process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET}/audio/${user.uid}/${fileNameWithUniqId}`;
    console.log(`Firebase Functions APIを直接呼び出して音声処理を開始します: ${audioUrl}`);
    
    // レッスンのステータスを更新して処理中であることを示す
    await updateDoc(lessonRef, {
      status: 'processing',
      message: 'Firebase Functionsで処理中...',
      audioUrl: audioUrl
    });
    
    try {
      // Firebase Functions APIを直接呼び出し
      const processAudio = httpsCallable(functions, 'processAudioV3FuncV2');
      console.log('Firebase Functions 呼び出しパラメータ:', {
        audioUrl,
        lessonId,
        userId: user.uid,
        instrumentName
      });
      
      // 呼び出しパラメータをロギングして確認
      console.log('processAudioV3FuncV2関数を呼び出し中...', JSON.stringify({
        audioUrl, lessonId, userId: user.uid, instrumentName
      }));
      
      const result = await processAudio({
        audioUrl: audioUrl,
        lessonId: lessonId,
        userId: user.uid,
        instrumentName: instrumentName
      });
      
      console.log('Firebase Functions API呼び出し結果:', result.data);
      
      // 処理結果が返ってきたらステータスを確認
      const updatedLessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
      const updatedLessonSnap = await getDoc(updatedLessonRef);
      
      if (updatedLessonSnap.exists()) {
        const updatedLessonData = updatedLessonSnap.data();
        
        // サーバー側でエラーが発生した場合（processing-errorなど）
        if (updatedLessonData.status && updatedLessonData.status.includes('error')) {
          console.log(`サーバー処理でエラーが発生しました: ${updatedLessonData.status}`);
          
          // エラーステータスを保持しつつ、リトライ可能にする
          await updateDoc(updatedLessonRef, {
            retryable: true,
            clientMessage: 'サーバー側で処理エラーが発生しました。後でリトライしてください。',
            updated_at: serverTimestamp()
          });
          
          // エラー情報を含んだ結果を返す
          return {
            success: false,
            lessonId: lessonId,
            error: updatedLessonData.error || '処理エラー',
            errorDetails: updatedLessonData.errorDetails || '詳細不明'
          };
        }
        
        // 処理が完了していることを確認
        if (updatedLessonData.status === 'completed') {
          console.log(`レッスン ${lessonId} の処理が正常に完了しました`);
        } else {
          console.log(`レッスン ${lessonId} のステータスが予期しない値です: ${updatedLessonData.status}`);
        }
      }
    } catch (functionsError) {
      console.error('Firebase Functions API呼び出しエラー:', functionsError);
      
      // エラー情報を詳細に記録
      const errorDetails = functionsError instanceof Error 
        ? { name: functionsError.name, message: functionsError.message, stack: functionsError.stack }
        : functionsError;
      
      // 既存のドキュメントを再確認して更新する
      const existingLessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
      const existingLessonSnap = await getDoc(existingLessonRef);
      
      if (existingLessonSnap.exists()) {
        await updateDoc(existingLessonRef, {
          status: 'error',
          error: 'Firebase Functions APIの呼び出しに失敗しました',
          errorDetails: JSON.stringify(errorDetails),
          updated_at: serverTimestamp(),
          retryable: true
        });
        
        console.log(`既存のレッスン ${lessonId} にエラー情報を更新しました`);
      } else {
        console.error(`レッスン ${lessonId} のドキュメントが見つかりません。新規作成はしません。`);
      }
      
      throw new Error(`Firebase Functions API呼び出しエラー: ${functionsError instanceof Error ? functionsError.message : JSON.stringify(functionsError)}`);
    }
    
    // 処理完了したら追跡から削除
    processingLessons.delete(lessonId);
    
    return { 
      success: true, 
      lessonId: lessonId,
    };
  } catch (error) {
    console.error('音声処理エラー:', error);
    
    // エラーの詳細情報を取得
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    
    try {
      // エラーが発生した場合はステータスを更新
      const user = auth.currentUser;
      if (user) {
        const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
        await updateDoc(lessonRef, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : '不明なエラー',
          errorDetails: JSON.stringify(errorDetails),
          updated_at: serverTimestamp()
        });
        console.log(`レッスン ${lessonId} のエラー状態を更新しました`);
      }
    } catch (updateError) {
      console.error('エラーステータス更新失敗:', updateError);
    } finally {
      // エラー時も追跡から削除
      processingLessons.delete(lessonId);
    }
    
    return { 
      success: false, 
      lessonId,
      error,
      errorDetails
    };
  }
};

// Update lesson with transcription and summary in Firestore
const updateLessonWithAIResults = async (
  lessonId: string, 
  transcription: string, 
  summary: string, 
  tags: string[],
  processingId?: string
) => {
  try {
    // Get the lesson document to get the user ID
    const user = auth.currentUser;
    if (!user) {
      console.error("ユーザーがログインしていません");
      return;
    }

    // Update the lesson document with AI results
    const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
    await updateDoc(lessonRef, {
      transcription,
      summary,
      tags,
      status: 'completed',
      updated_at: serverTimestamp()
    });

    console.log(`レッスン ${lessonId} にAI結果を更新しました`);
  } catch (error) {
    console.error("AI結果の更新に失敗しました:", error);
    await updateLessonStatus(lessonId, 'error', '音声処理の結果更新に失敗しました');
    throw error;
  }
};

// Update lesson status (e.g., to 'error' if processing fails)
const updateLessonStatus = async (
  lessonId: string, 
  status: string, 
  errorMessage: string | null = null
) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("ユーザーがログインしていません");
      return;
    }
    
    // Update the lesson document status
    const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
    
    const updateData: any = {
      status,
      updated_at: serverTimestamp()
    };
    
    if (errorMessage) {
      updateData.error = errorMessage;
    }
    
    await updateDoc(lessonRef, updateData);
    console.log(`レッスン ${lessonId} のステータスを ${status} に更新しました`);
  } catch (error) {
    console.error("レッスンステータスの更新に失敗しました:", error);
  }
};

// レッスンのステータスを定期的に監視する関数
const startStatusMonitoring = (lessonId: string, userId: string, fileName: string) => {
  console.log(`レッスン ${lessonId} のステータス監視を開始します`);
  
  // 処理状況の確認をスケジュール（5秒ごと）
  let checkCount = 0;
  const maxChecks = 60; // 最大5分間（60回 × 5秒）監視
  
  const checkInterval = setInterval(async () => {
    try {
      checkCount++;
      
      // レッスンドキュメントを取得
      const lessonRef = doc(db, `users/${userId}/lessons`, lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        console.log(`レッスン ${lessonId} が見つかりません。監視を停止します。`);
        clearInterval(checkInterval);
        return;
      }
      
      const lessonData = lessonDoc.data();
      const status = lessonData.status;
      
      console.log(`レッスン ${lessonId} の現在のステータス: ${status}`);
      
      // 処理が完了した場合（completed または error）
      if (status === 'completed' || status === 'error') {
        console.log(`レッスン ${lessonId} の処理が完了しました。ステータス: ${status}`);
        clearInterval(checkInterval);
        
        // 直接レッスンストアは使用せず、更新完了ログのみ出力
        console.log('処理が完了しました。レッスン一覧を更新してください。');
        
        return;
      }
      
      // queued状態の場合、処理をトリガーするためにHTTPSリクエストを送信
      if (status === 'queued') {
        console.log(`レッスン ${lessonId} が処理キューに登録されています。処理を促します。`);
        
        // レッスンのステータスを更新して手動トリガー
        if (checkCount % 3 === 0) { // 15秒ごとに更新を促す
          await updateDoc(lessonRef, {
            message: `処理キューで待機中...（${checkCount}回目の確認）`,
            updatedAt: new Date()
          });
        }
      }
      
      // 最大チェック回数に達したら監視を終了
      if (checkCount >= maxChecks) {
        console.log(`レッスン ${lessonId} の監視がタイムアウトしました。処理は続行中の可能性があります。`);
        clearInterval(checkInterval);
        
        // ステータスを更新してユーザーに通知
        await updateDoc(lessonRef, {
          message: '処理が長時間完了していません。画面を再読み込みして確認してください。',
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error(`ステータス監視エラー（レッスン ${lessonId}）:`, error);
      
      // エラーが続く場合は監視を停止
      if (checkCount > 10) { // 10回以上エラーが続いたら停止
        clearInterval(checkInterval);
      }
    }
  }, 5000); // 5秒ごとにチェック
};

// 録音ファイルを処理する関数
export const processRecordingFile = async (recordingUri: string): Promise<{ success: boolean; lessonId?: string; error?: any }> => {
  try {
    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    // Generate a unique processing ID
    const processingId = `recording_${user.uid}_${Date.now()}`;
    
    // Create a new lesson document for this recording
    const lessonRef = await addDoc(collection(db, `users/${user.uid}/lessons`), {
      teacher: 'レコーダーから',
      date: new Date().toLocaleDateString('ja-JP'),
      user_id: user.uid,
      status: 'uploading',
      created_at: serverTimestamp(),
      processingId: processingId, // Add processing ID
    });

    // Process the audio file
    const fileName = `lesson_${new Date().getTime()}.m4a`;
    const result = await processAudioFile(lessonRef.id, recordingUri, fileName, processingId);
    return { 
      success: result.success, 
      lessonId: lessonRef.id,
      error: result.error
    };
  } catch (error) {
    console.error('録音ファイルの処理中にエラーが発生しました:', error);
    return { success: false, error };
  }
};