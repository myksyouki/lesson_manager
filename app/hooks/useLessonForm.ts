import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveLesson, LessonFormData } from '../services/lessonService';
import { useLessonStore } from '../store/lessons';
import { auth } from '../config/firebase';
import { router } from 'expo-router';

interface UseLessonFormReturn {
  formData: LessonFormData;
  isProcessing: boolean;
  processingStep: string;
  uploadProgress: number;
  lessonDocId: string | null;
  processingStatus: string | null;
  updateFormData: (data: Partial<LessonFormData>) => void;
  handleSave: (selectedFile: { uri: string; name: string } | null) => Promise<string | null>;
  isFormValid: () => boolean;
}

export const useLessonForm = (initialData?: Partial<LessonFormData>): UseLessonFormReturn => {
  // フォームの状態
  const [formData, setFormData] = useState<LessonFormData>({
    teacherName: initialData?.teacherName || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    pieces: initialData?.pieces || [],
    notes: initialData?.notes || '',
    tags: initialData?.tags || [],
  });
  
  // 処理状態
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(''); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lessonDocId, setLessonDocId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  // 保存中かどうかのフラグを追加
  const [isSaving, setIsSaving] = useState(false);

  // グローバルストア
  const addLesson = useLessonStore(state => state.addLesson);

  // 進捗ハンドラー
  const handleProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  // 状態変更ハンドラー
  const handleStatusChange = (status: string, message: string) => {
    setProcessingStep(status);
    setProcessingStatus(message);
  };

  // ステータス監視
  useEffect(() => {
    if (!lessonDocId) return;

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribe = onSnapshot(
      doc(db, `users/${userId}/lessons`, lessonDocId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // ステータス更新処理
          if (data.status === 'completed') {
            setIsProcessing(false);
            setProcessingStep('completed');
            setProcessingStatus('処理完了しました');
            
            // グローバルストアに追加
            addLesson({
              ...data,
              id: doc.id  // id プロパティをデータに追加
            } as any);
            
            // 完了したらホームに戻る
            setTimeout(() => {
              router.replace('/(tabs)' as any);
            }, 1000);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [lessonDocId, addLesson]);

  // フォームデータ更新
  const updateFormData = (data: Partial<LessonFormData>) => {
    if (data.date && data.date.includes('年') && data.date.includes('月') && data.date.includes('日')) {
      try {
        const matches = data.date.match(/(\d+)年(\d+)月(\d+)日/);
        if (matches && matches.length === 4) {
          const [_, year, month, day] = matches;
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          data = { ...data, date: isoDate };
          console.log('日本語日付をISO形式に変換:', data.date, '->', isoDate);
        }
      } catch (err) {
        console.error('日付変換エラー:', err);
      }
    }
    
    setFormData({ ...formData, ...data });
  };

  // フォームバリデーション
  const isFormValid = () => {
    return !!formData.teacherName && !!formData.date;
  };

  // 保存処理
  const handleSave = async (selectedFile: { uri: string; name: string } | null = null): Promise<string | null> => {
    if (!isFormValid()) {
      Alert.alert('入力エラー', '講師名とレッスン日は必須項目です');
      return null;
    }

    // 既に保存処理中なら重複保存を防止
    if (isSaving) {
      console.log('既に保存処理中です。重複保存を防止します。');
      return null;
    }

    try {
      setIsSaving(true); // 保存開始
      setIsProcessing(true);
      setProcessingStep('saving');
      setProcessingStatus('レッスンデータを保存中...');

      if (selectedFile) {
        console.log('音声ファイルが選択されています:', selectedFile.name);
        setProcessingStep('上傳');
        setProcessingStatus('音声ファイルをアップロード中...');
      } else {
        console.log('音声ファイルなしでレッスンを保存します');
      }

      // Firestoreにレッスンデータを保存
      const lessonId = await saveLesson(
        formData,
        selectedFile, // 選択されたファイルを渡す
        handleProgress,
        handleStatusChange
      );

      setLessonDocId(lessonId);

      // 音声ファイルがない場合は即時リダイレクト
      if (!selectedFile) {
        console.log('音声処理なし: ホーム画面にリダイレクトします');
        router.replace('/(tabs)' as any);
      }

      return lessonId;
    } catch (error) {
      console.error('レッスン保存エラー:', error);
      setIsProcessing(false);
      Alert.alert('エラー', '保存中にエラーが発生しました');
      return null;
    } finally {
      setIsSaving(false); // 保存完了または失敗
    }
  };

  return {
    formData,
    isProcessing,
    processingStep, 
    uploadProgress,
    lessonDocId,
    processingStatus,
    updateFormData,
    handleSave,
    isFormValid
  };
}; 