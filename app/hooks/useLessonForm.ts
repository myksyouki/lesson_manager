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
  handleSave: (selectedFile: SelectedFile | null) => Promise<string | null>;
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
                router.replace('/lessons' as any);
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
  const handleSave = async (selectedFile: SelectedFile | null): Promise<string | null> => {
    if (!isFormValid()) {
      setIsProcessing(false);
      setProcessingStep('');
      return null;
    }

    setIsProcessing(true);
    setProcessingStep(selectedFile ? '音声ファイルをアップロード中...' : 'レッスンを保存中...');

    try {
      const docId = await saveLesson(
        formData,
        selectedFile,
        (progress) => {
          setUploadProgress(progress);
        },
        (status) => {
          setProcessingStatus(status);
          if (status === 'audio_uploaded') {
            setProcessingStep('アップロードが完了しました！');
            // アップロードが完了したら1秒後に画面遷移
            setTimeout(() => {
              router.push('/lessons' as any);
            }, 1000);
          } else if (status === 'completed' && !selectedFile) {
            setProcessingStep('レッスンを保存しました！');
            // 音声ファイルがない場合も同様に遷移
            setTimeout(() => {
              router.push('/lessons' as any);
            }, 1000);
          } else if (status === 'processing') {
            setProcessingStep('音声ファイルを処理中...');
          } else if (status === 'transcribing') {
            setProcessingStep('文字起こし中...');
          } else if (status === 'summarizing') {
            setProcessingStep('文字起こしが完了しました。要約を生成中...');
          } else if (status === 'error') {
            setProcessingStep('エラーが発生しました。もう一度お試しください。');
            setIsProcessing(false);
          }
        }
      );

      setLessonDocId(docId);
      return docId;
    } catch (error) {
      console.error('Error saving lesson:', error);
      setProcessingStep('エラーが発生しました。もう一度お試しください。');
      setIsProcessing(false);
      return null;
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