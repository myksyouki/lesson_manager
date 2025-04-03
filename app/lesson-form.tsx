import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingOverlay from '../components/LoadingOverlay';
import FormHeader from './features/lessons/components/form/FormHeader';
import FormInputs from './features/lessons/components/form/FormInputs';
import { CalendarModal } from './features/lessons/components/form/CalendarModal';
import AudioUploader from './features/lessons/components/form/AudioUploader';
import { useCalendar, DAYS } from '../hooks/useCalendar';
import { useFileUpload } from '../hooks/useFileUpload';
import { Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, doc, updateDoc, serverTimestamp, setDoc, getDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db, auth, functions } from '../config/firebase';
import { router } from 'expo-router';
import { uploadAudioFile } from '../services/storage';
import { httpsCallable } from 'firebase/functions';
import { getUserProfile } from '../services/userProfileService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 600);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

// フォームデータの型定義
interface LessonFormData {
  teacherName: string;
  date: string;
  notes: string;
  pieces: string[];
  tags: string[];
  userPrompt?: string; // AI用の指示（要約生成時のヒント）
  priority?: 'high' | 'medium'; // 優先度（重要/基本）
}

// ユーザープロファイル情報の型定義
interface UserInstrumentInfo {
  selectedCategory: string;
  selectedInstrument: string;
  selectedModel: string;
}

// 処理ステータスの型定義
type ProcessingStatus = 'uploading' | 'processing' | 'completed' | 'error' | null;

// Cloudプロセス処理の結果型
interface ProcessAudioResult {
  success: boolean;
  message?: string;
  error?: string;
}

export default function LessonForm() {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false); // レフを使って保存状態を追跡
  const [formData, setFormData] = useState<LessonFormData>({
    teacherName: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    pieces: [],
    tags: [],
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(null);
  const [userInstrumentInfo, setUserInstrumentInfo] = useState<UserInstrumentInfo>({
    selectedCategory: 'standard',
    selectedInstrument: 'standard',
    selectedModel: 'standard'
  });
  
  // ユーザープロファイルから楽器情報を取得
  useEffect(() => {
    const loadUserInstrumentInfo = async () => {
      try {
        const userProfile = await getUserProfile();
        if (userProfile) {
          setUserInstrumentInfo({
            selectedCategory: userProfile.selectedCategory,
            selectedInstrument: userProfile.selectedInstrument,
            selectedModel: userProfile.selectedModel
          });
          console.log('ユーザーの楽器情報を取得しました:', {
            selectedCategory: userProfile.selectedCategory,
            selectedInstrument: userProfile.selectedInstrument,
            selectedModel: userProfile.selectedModel
          });
        }
      } catch (error) {
        console.error('ユーザープロファイル取得エラー:', error);
      }
    };
    
    loadUserInstrumentInfo();
  }, []);
  
  const {
    selectedFile, 
    selectFile,
    clearFile,
  } = useFileUpload();
  
  const {
    selectedDate,
    currentMonth,
    showCalendar,
    setShowCalendar,
    handleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  } = useCalendar(new Date(), (_, isoFormattedDate) => {
    console.log('レッスンフォーム: 日付が選択されました -', isoFormattedDate);
    updateFormData({ date: isoFormattedDate });
  });

  // フォームデータの更新
  const updateFormData = (data: Partial<LessonFormData>) => {
    setFormData(prevData => ({
      ...prevData,
      ...data
    }));
  };

  // フォームのバリデーション
  const isFormValid = () => {
    return formData.teacherName.trim() !== '' && formData.date.trim() !== '';
  };

  // 日本語形式の日付に変換
  const formatDateToJapanese = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
      
      return `${year}年${month}月${day}日`;
    } catch (error) {
      console.error('日付変換エラー:', error);
      return dateStr;
    }
  };
  
  // レッスンIDの生成（毎回一意のIDを生成するよう修正）
  const generateLessonId = (teacherName: string, date: string, userId: string): string => {
    // タイムスタンプを追加して毎回ユニークになるようにする
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    
    // シンプルなハッシュ関数
    const simpleHash = (str: string): string => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit整数に変換
      }
      return Math.abs(hash).toString(16);
    };
    
    const normalizedTeacher = teacherName.trim().toLowerCase();
    const normalizedDate = date.replace(/[年月日\-]/g, '');
    const baseString = `${userId}_${normalizedTeacher}_${normalizedDate}_${timestamp}_${randomStr}`;
    const hash = simpleHash(baseString);
    
    return `lesson_${hash}`;
  };

  // シンプル化した保存ハンドラー
  const onSave = useCallback(async () => {
    // 保存中フラグのチェック（stateとrefの両方）
    if (isSaving || savingRef.current) {
      console.log('保存処理中なのでスキップします');
      return;
    }
    
    // バリデーション
    if (!isFormValid()) {
      Alert.alert('入力エラー', '講師名とレッスン日は必須項目です');
      return;
    }
    
    try {
      // 保存中フラグをセット（stateとrefの両方）
      setIsSaving(true);
      savingRef.current = true;
      setIsProcessing(true);
      setProcessingStep('保存中...');
      
      console.log('保存処理を開始します');
      
      // ユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('ユーザーが認証されていません');
      }
      
      // 日付のフォーマット
      const japaneseDate = formData.date.includes('-') 
        ? formatDateToJapanese(formData.date) 
        : formData.date;
      
      // IDを一度生成してdocumentIdとlessonUniqIdで同じものを使う
      const lessonId = generateLessonId(formData.teacherName, formData.date, userId);
      console.log('生成されたレッスンID:', lessonId);
      
      // 保存データの準備
      const saveData = {
        // フォームデータ
        teacherName: formData.teacherName,
        date: japaneseDate,
        notes: formData.notes || '',
        pieces: formData.pieces || [],
        tags: formData.tags || [],
        userPrompt: formData.userPrompt || '',
        priority: formData.priority || 'medium',
        
        // ユーザー情報
        user_id: userId,
        
        // 楽器情報
        instrumentCategory: userInstrumentInfo.selectedCategory,
        instrumentName: userInstrumentInfo.selectedInstrument,
        instrumentModel: userInstrumentInfo.selectedModel,
        
        // メタデータ
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'completed', // デフォルトは完了状態
        
        // 一意のID情報（ドキュメントIDと同じ値を設定）
        lessonUniqId: lessonId
      };
      
      console.log('保存するデータ:', saveData);
      
      // Firestoreトランザクションを使用して保存
      await runTransaction(db, async (transaction) => {
        // レッスンドキュメントへの参照
        const lessonRef = doc(db, `users/${userId}/lessons`, lessonId);
        
        // 常に新しいドキュメントとして作成
        console.log('新規レッスンを作成します:', lessonId);
        transaction.set(lessonRef, saveData);
      });
      
      console.log('レッスンが保存されました。ID:', lessonId);
      
      // 音声ファイルがある場合は別途処理
      if (selectedFile) {
        try {
          setProcessingStep('音声ファイルをアップロード中...');
          setProcessingStatus('uploading');
          
          // レッスンのステータスを更新
          const lessonRef = doc(db, `users/${userId}/lessons`, lessonId);
          await updateDoc(lessonRef, {
            status: 'processing' // 処理中に変更
          });
          
          console.log('音声ファイルをアップロードします:', selectedFile.name);
          
          // Storage パス - audioで始まるパスにする（Functionsトリガーに合わせるため）
          const storagePath = `audio/${userId}/${lessonId}/${selectedFile.name}`;
          
          // 音声ファイルをアップロード
          const uploadResult = await uploadAudioFile(
            selectedFile.uri, 
            storagePath,
            (progress) => {
              console.log('アップロード進捗:', progress.progress);
              setUploadProgress(progress.progress);
            }
          );
          
          if (uploadResult.success) {
            console.log('ファイルアップロード成功:', uploadResult.url);
            
            // レッスンデータを更新（楽器情報も含める）
            await updateDoc(lessonRef, {
              audioUrl: uploadResult.url,
              audioPath: storagePath,
              status: 'processing', // 処理中に変更
              instrumentCategory: userInstrumentInfo.selectedCategory,
              instrumentName: userInstrumentInfo.selectedInstrument, 
              instrumentModel: userInstrumentInfo.selectedModel,
              userPrompt: formData.userPrompt || '',
              updatedAt: serverTimestamp()
            });
            
            console.log('レッスンデータを更新しました。Storage Triggerが自動的に処理を開始します。');
            setProcessingStep('音声処理をバックグラウンドで開始しました');
            setProcessingStatus('completed');
            
            // 数秒待機してから画面遷移
            setTimeout(() => {
              setIsProcessing(false);
              router.push({
                pathname: '/tabs/lessons',
                params: { isNewlyCreated: 'true' }
              });
            }, 2000);
          } else {
            console.error('ファイルアップロードエラー:', uploadResult.error);
            throw new Error('ファイルのアップロードに失敗しました');
          }
        } catch (audioError: unknown) {
          console.error('音声処理エラー:', audioError);
          
          // レッスンステータスをエラーに設定
          const lessonRef = doc(db, `users/${userId}/lessons`, lessonId);
          await updateDoc(lessonRef, {
            status: 'error',
            errorMessage: audioError instanceof Error ? audioError.message : '音声処理エラー',
            updatedAt: serverTimestamp()
          });
          
          Alert.alert('エラー', '音声ファイルの処理中にエラーが発生しました');
        }
      } else {
        console.log('音声ファイルなし - 処理完了');
      }
      
      // 成功後にレッスン一覧画面に移動
      setTimeout(() => {
        setIsProcessing(false);
        router.push({
          pathname: '/tabs/lessons',
          params: { isNewlyCreated: 'true' }
        });
      }, 500);
      
    } catch (error: unknown) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '保存に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        savingRef.current = false;
        setIsProcessing(false);
        setProcessingStep('');
        setProcessingStatus(null);
      }, 1000);
    }
  }, [formData, selectedFile, isSaving, userInstrumentInfo]);

  // カレンダー表示トグル
  const toggleCalendar = useCallback(() => {
    setShowCalendar(!showCalendar);
  }, [setShowCalendar, showCalendar]);

  // 日付選択ハンドラー（コールバック最適化）
  const onDateSelect = useCallback((date: Date) => {
    handleDateSelect(date);
  }, [handleDateSelect]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FormHeader
        onSave={onSave}
        isValid={isFormValid() && !isSaving}
        isProcessing={isProcessing || isSaving}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <FormInputs
          formData={formData}
          onUpdateFormData={updateFormData}
          onShowCalendar={toggleCalendar}
          openDatePicker={toggleCalendar}
        />
        
        <View style={styles.uploadSection}>
          <AudioUploader
            selectedFile={selectedFile}
            onSelectFile={selectFile}
            onClearFile={clearFile}
          />
        </View>
      </ScrollView>
      
      {showCalendar && (
        <CalendarModal
          isVisible={showCalendar}
          onClose={toggleCalendar}
          selectedDate={selectedDate}
          onDateSelect={(date, formattedDate) => {
            console.log('レッスンフォーム: 日付が選択されました -', formattedDate);
            updateFormData({ date: formattedDate });
          }}
        />
      )}
      
      {isProcessing && (
        <LoadingOverlay 
          message={processingStep}
          progress={uploadProgress}
          showProgress={processingStatus === 'uploading'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 32,
  },
  uploadSection: {
    marginTop: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  uploadSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  fileNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  }
});
