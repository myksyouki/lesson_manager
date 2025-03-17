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
    
    const lessonData = {
      ...formData,
      userId,
      createdAt: new Date(),
      status: 'pending',
      audioUrl: '',
    };
    
    const docRef = await addDoc(collection(db, 'lessons'), lessonData);
    const lessonId = docRef.id;
    
    // 音声ファイルがある場合は処理を続行
    if (audioFile && audioFile.uri) {
      onStatusChange?.('uploading', '音声ファイルをアップロード中...');
      
      // ファイル名を生成（ユーザーID + タイムスタンプ + 元のファイル名）
      const timestamp = new Date().getTime();
      const fileName = `${userId}_${timestamp}_${audioFile.name}`;
      const storageRef = ref(storage, `lessons/${userId}/${fileName}`);
      
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
              const processingId = `lesson_${userId}_${timestamp}`;
              await processAudioFile(lessonId, audioFile.uri, fileName, processingId);
              
              resolve(lessonId);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    }
    
    return lessonId;
  } catch (error) {
    console.error('レッスン保存エラー:', error);
    throw error;
  }
}; 