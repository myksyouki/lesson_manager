import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveLesson, LessonFormData } from '../services/lessonService';
import { useLessonStore } from '../store/lessons';
import { auth } from '../config/firebase';
import { router } from 'expo-router';

interface SelectedFile {
  uri: string;
  name: string;
}

interface UseLessonFormReturn {
  formData: LessonFormData;
  isProcessing: boolean;
  processingStep: string;
  uploadProgress: number;
  lessonDocId: string | null;
  processingStatus: string | null;
  updateFormData: (data: Partial<LessonFormData>) => void;
  handleSave: (selectedFile: SelectedFile | null) => Promise<void>;
  isFormValid: () => boolean;
}

export const useLessonForm = (initialData?: Partial<LessonFormData>): UseLessonFormReturn => {
  // フォームの状態
  const [formData, setFormData] = useState<LessonFormData>({
    teacherName: initialData?.teacherName || '',
    date: initialData?.date || new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).replace(/\s/g, ''),
    pieces: initialData?.pieces || [],
    notes: initialData?.notes || '',
    tags: initialData?.tags || [],
  });
  
  // 処理状態
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // レッスン保存
  const [lessonDocId, setLessonDocId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  
  const { addLesson } = useLessonStore();

  // レッスンドキュメントの状態を監視
  useEffect(() => {
    if (lessonDocId) {
      const unsubscribe = onSnapshot(doc(db, 'lessons', lessonDocId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setProcessingStatus(data.status);
          
          // 処理状態に応じてメッセージを更新
          switch (data.status) {
            case 'processing':
              setProcessingStep('音声ファイルを処理中...');
              break;
            case 'transcribed':
              setProcessingStep('文字起こしが完了しました。要約を生成中...');
              break;
            case 'completed':
              setProcessingStep('処理が完了しました！');
              // 処理が完了したら1秒後に画面遷移
              setTimeout(() => {
                router.replace('/lessons');
              }, 1000);
              break;
            default:
              setProcessingStep('処理中...');
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [lessonDocId]);

  // フォームデータ更新ハンドラー
  const updateFormData = (data: Partial<LessonFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // フォームバリデーション
  const isFormValid = () => {
    return formData.teacherName.trim() !== '' && formData.date.trim() !== '';
  };

  // 保存ハンドラー
  const handleSave = async (selectedFile: SelectedFile | null) => {
    if (!isFormValid()) {
      Alert.alert('入力エラー', '先生の名前と日付は必須です');
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingStep('レッスンデータを保存中...');
      
      // レッスンを保存
      const lessonId = await saveLesson(
        formData,
        selectedFile,
        (progress) => setUploadProgress(progress),
        (status, message) => setProcessingStep(message)
      );
      
      setLessonDocId(lessonId);
      
      // 音声ファイルがない場合は即座に完了
      if (!selectedFile) {
        // レッスンストアに追加
        await addLesson({
          teacher: formData.teacherName,
          date: formData.date,
          pieces: formData.pieces,
          notes: formData.notes,
          tags: formData.tags,
          user_id: auth.currentUser?.uid || '',
          summary: '',
          transcription: '',
          audioUrl: '',
          isFavorite: false,
        });
        
        // 完了メッセージを表示して画面遷移
        setProcessingStep('レッスンを保存しました！');
        setTimeout(() => {
          router.replace('/lessons');
        }, 1000);
      }
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'レッスンの保存中にエラーが発生しました');
      setIsProcessing(false);
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
    isFormValid,
  };
}; 