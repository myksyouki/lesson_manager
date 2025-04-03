import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveLesson } from '../../services/lessonService';
import { useLessonStore } from '../../store/lessons';
import { auth } from '../config/firebase';
import { router } from 'expo-router';

// LessonFormDataインターフェイスを一つにまとめる
export interface LessonFormData {
  id?: string;
  teacherName: string;
  date: string;
  pieces: string[];
  notes: string;
  tags: string[];
  userPrompt: string;
}

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
    pieces: initialData?.pieces || [''],
    notes: initialData?.notes || '',
    tags: initialData?.tags || [],
    userPrompt: initialData?.userPrompt || '',
  });
  
  // 処理状態
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(''); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lessonDocId, setLessonDocId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  // 保存中かどうかのフラグを追加
  const [isSaving, setIsSaving] = useState(false);
  // 保存処理を追跡するref
  const saveInProgressRef = useRef(false);

  // グローバルストア
  const addLesson = useLessonStore(state => state.addLesson);
  const fetchLessons = useLessonStore(state => state.fetchLessons);

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
            
            // リダイレクト処理は削除 (handleSaveでのみリダイレクトする)
          } 
          // エラー状態の処理
          else if (data.status && (data.status.includes('error') || data.error)) {
            console.log(`レッスン処理でエラーが発生: ${data.error || data.status}`);
            setIsProcessing(false);
            setProcessingStep('error');
            setProcessingStatus(data.errorMessage || 'エラーが発生しました');
            
            // エラー状態のレッスンもストアに追加して表示する
            addLesson({
              ...data,
              id: doc.id
            } as any);
            
            // リダイレクト処理は削除 (handleSaveでのみリダイレクトする)
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
    return formData.teacherName.trim() !== '' && 
           formData.date !== '';
  };

  // 保存処理
  const handleSave = async (selectedFile: { uri: string; name: string } | null = null): Promise<string | null> => {
    if (!isFormValid()) {
      Alert.alert('入力エラー', '講師名とレッスン日は必須項目です');
      return null;
    }

    // 既に保存処理中なら重複保存を防止（stateとrefの両方をチェック）
    if (isSaving || saveInProgressRef.current) {
      console.log('既に保存処理中です。重複保存を防止します。');
      Alert.alert('処理中', 'レッスンデータを保存中です。しばらくお待ちください。');
      return null;
    }

    try {
      setIsSaving(true); // 保存開始
      saveInProgressRef.current = true; // refも設定
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

      // 音声ファイルがない場合は、ストアを手動で更新して即座に表示を反映
      if (!selectedFile) {
        const userId = auth.currentUser?.uid;
        if (userId) {
          // Firestoreから最新のレッスンデータを取得してグローバルストアを更新
          await fetchLessons(userId);
          console.log('レッスンデータを更新しました');
        }
      }

      // リダイレクト前に処理中状態をクリアする
      setIsProcessing(false);
      setProcessingStep('');
      setProcessingStatus(null);

      // 音声ファイルの有無に関わらず、レッスンタブに確実にリダイレクト
      console.log('レッスンデータを保存しました。レッスンタブにリダイレクトします');
      
      // 短いタイムアウトを設定して確実にリダイレクトを実行
      setTimeout(() => {
        router.push('/(tabs)/lessons' as any);
      }, 100);

      return lessonId;
    } catch (error) {
      console.error('レッスン保存エラー:', error);
      setIsProcessing(false);
      Alert.alert('エラー', '保存中にエラーが発生しました');
      return null;
    } finally {
      // 保存処理が完了したら、1秒のディレイの後にフラグをリセット
      // これにより二重クリックによる重複保存を確実に防止
      setTimeout(() => {
        setIsSaving(false); // 保存完了または失敗
        saveInProgressRef.current = false; // refもリセット
        console.log('保存処理フラグをリセットしました');
      }, 1000);
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