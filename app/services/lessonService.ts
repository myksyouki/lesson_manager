import { ref, uploadBytesResumable, getDownloadURL, updateMetadata } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, storage, auth } from '../config/firebase';
import { processAudioFile } from './audioProcessing';

export interface LessonFormData {
  teacherName: string;
  date: string;
  pieces: string[];
  notes: string;
  tags: string[];
}

// UUIDを生成する関数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * レッスンデータをFirestoreに保存し、音声ファイルがある場合はStorageにアップロードする
 */
export const saveLesson = async (
  formData: LessonFormData,
  audioFile: { uri: string; name: string } | null,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: string, message: string) => void
): Promise<string> => {
  try {
    // ユーザーIDを取得
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('ユーザーが認証されていません');
    }

    // Firestoreにレッスンデータを保存
    onStatusChange?.('saving', 'レッスンデータを保存中...');
    
    const lessonUniqId = generateUUID(); // 固有のlessonUniqIdを生成
    
    // ドキュメントを作成（新規レッスン）
    const lessonData = {
      ...formData,
      user_id: userId,
      createdAt: new Date(),
      status: 'pending',
      audioUrl: '',
      lessonUniqId: lessonUniqId, // 固有のIDを保存
    };
    
    // Firestoreにドキュメントを作成
    console.log('Firestoreにレッスンデータを保存します', { teacherName: formData.teacherName, lessonUniqId });
    const docRef = await addDoc(collection(db, 'lessons'), lessonData);
    const lessonId = docRef.id;
    console.log(`レッスンが作成されました。ID: ${lessonId}, lessonUniqId: ${lessonUniqId}`);
    
    // 音声ファイルがある場合は処理を続行
    if (audioFile && audioFile.uri) {
      onStatusChange?.('uploading', '音声ファイルをアップロード中...');
      
      // タイムスタンプは一度だけ生成
      const timestamp = new Date().getTime();
      const fileExt = audioFile.name.split('.').pop() || 'mp3';
      const fileName = `${lessonId}.${fileExt}`;
      
      // 一貫した処理IDを生成
      const processingId = `lesson_${userId}_${timestamp}`;
      
      console.log(`レッスンID: ${lessonId} に対するファイル名を生成しました: ${fileName}`);
      console.log(`処理ID: ${processingId}`);
      
      // 最初にドキュメントを更新して、音声処理前にファイルパスと処理IDを設定する
      await updateDoc(doc(db, 'lessons', lessonId), {
        status: 'uploading',
        processingId: processingId,
        audioFileName: fileName,
        audioPath: `audio/${userId}/${fileName}`,
        lessonUniqId: lessonUniqId
      });
      
      // Storageにファイルをアップロード
      const storageRef = ref(storage, `audio/${userId}/${fileName}`);
      
      // ファイルをフェッチ
      const response = await fetch(audioFile.uri);
      const blob = await response.blob();
      
      // アップロード処理
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress?.(progress);
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              // メタデータを更新
              await updateMetadata(storageRef, {
                customMetadata: {
                  lessonId,
                  userId,
                  lessonUniqId,  // メタデータにlessonUniqIdを追加
                }
              });
              
              // ダウンロードURLを取得
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              
              // レッスンドキュメントを更新
              await updateDoc(doc(db, 'lessons', lessonId), {
                audioUrl: downloadUrl,
                status: 'processing'
              });
              
              onStatusChange?.('processing', '音声ファイルを処理中...');
              
              // 音声処理を開始
              await processAudioFile(lessonId, audioFile.uri, audioFile.name, processingId);
              
              resolve(lessonId);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // 音声ファイルがない場合は、適切なステータスを設定
      // これにより、サーバー側での重複処理を防止
      const completedTimestamp = new Date().getTime();
      const processingId = `completed_${userId}_${completedTimestamp}`;
      
      // ドキュメントを更新してlessonUniqIdとステータスを設定
      await updateDoc(doc(db, 'lessons', lessonId), {
        status: 'completed',
        processingId: processingId,
        processing_id: processingId, // 両方のフィールド名に対応
        lessonUniqId: lessonUniqId,
        updated_at: new Date()
      });
      
      console.log(`音声なしレッスンを作成しました。ID: ${lessonId}, Status: completed, processingId: ${processingId}`);
    }
    
    return lessonId;
  } catch (error) {
    console.error('レッスン保存エラー:', error);
    throw error;
  }
}; 