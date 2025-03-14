import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import LoadingOverlay from './components/LoadingOverlay';
import { router } from 'expo-router';
import { processAudioFile } from './services/audioProcessing';
import { useLessonStore } from './store/lessons';
import * as DocumentPicker from 'expo-document-picker';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { storage } from './config/firebase';
import { auth } from './config/firebase';
import { ref, uploadBytesResumable, getDownloadURL, updateMetadata } from 'firebase/storage';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from './config/firebase';
import FormHeader from './features/lessons/components/form/FormHeader';
import FormInputs from './features/lessons/components/form/FormInputs';
import CalendarModal from './features/lessons/components/form/CalendarModal';
import AudioUploader from './features/lessons/components/form/AudioUploader';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 600);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

export default function LessonForm() {
  const [formData, setFormData] = useState({
    teacherName: '',
    date: new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).replace(/\s/g, ''),
    pieces: [] as string[],
    notes: '',
    tags: [] as string[],
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
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

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
    })
    .onEnd((event) => {
      const threshold = CALENDAR_WIDTH / 3;
      if (Math.abs(event.velocityX) > 500 || Math.abs(event.translationX) > threshold) {
        if (event.velocityX > 0 || event.translationX > threshold) {
          translateX.value = withTiming(CALENDAR_WIDTH, {}, () => {
            runOnJS(changeMonth)(-1);
            translateX.value = 0;
          });
        } else {
          translateX.value = withTiming(-CALENDAR_WIDTH, {}, () => {
            runOnJS(changeMonth)(1);
            translateX.value = 0;
          });
        }
      } else {
        translateX.value = withTiming(0, {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    // 月曜始まりとしてオフセット計算
    const offset = (firstDayOfMonth.getDay() + 6) % 7;

    // 当月の日数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 前月の計算（1月の場合は前年12月）
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonthDays = new Date(prevYear, prevMonth + 1, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // 前月の日付を追加
    for (let i = offset; i > 0; i--) {
      const day = prevMonthDays - i + 1;
      days.push({
        date: new Date(prevYear, prevMonth, day),
        isCurrentMonth: false,
      });
    }

    // 当月の日付を追加
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // カレンダー全体のセル数を週単位に合わせる
    const totalCells = Math.ceil(days.length / 7) * 7;
    const nextDaysCount = totalCells - days.length;

    // 翌月の計算（12月の場合は翌年1月）
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    // 翌月の日付を追加
    for (let i = 1; i <= nextDaysCount; i++) {
      days.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false,
      });
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setFormData({ ...formData, date: formatDate(date) });
    setShowCalendar(false);
  };

  const handleUpload = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      // 入力チェック
      if (!formData.teacherName) {
        Alert.alert('エラー', '講師名は必須です');
        return;
      }

      // 一意の処理IDを生成
      const uniqueProcessingId = `lesson_${user.uid}_${Date.now()}`;
      
      setIsProcessing(true);
      setProcessingStep('レッスン情報を保存中...');

      // ファイルが選択されていない場合は、音声なしでレッスンを保存
      if (!selectedFileUri) {
        // Firestoreにレッスンドキュメントを作成
        const lessonRef = await addDoc(collection(db, 'lessons'), {
          teacher: formData.teacherName,
          date: formData.date,
          pieces: formData.pieces,
          notes: formData.notes,
          tags: formData.tags,
          user_id: user.uid,
          created_at: new Date(),
          status: 'completed',
          isFavorite: false,
          isDeleted: false,
          processingId: uniqueProcessingId, // 一意の処理IDを追加
        });

        // 保存完了後、レッスン一覧画面に遷移
        router.replace('/lessons');
        return;
      }

      const fileUri = selectedFileUri;
      const fileName = selectedFileName || `lesson_${new Date().getTime()}.m4a`;

      // まずFirestoreにレッスンドキュメントを作成
      const lessonRef = await addDoc(collection(db, 'lessons'), {
        teacher: formData.teacherName,
        date: formData.date,
        pieces: formData.pieces,
        notes: formData.notes,
        tags: formData.tags,
        user_id: user.uid,
        created_at: new Date(),
        status: 'uploading',
        isFavorite: false,
        isDeleted: false,
        processingId: uniqueProcessingId, // 一意の処理IDを追加
      });

      setLessonDocId(lessonRef.id);
      
      // レッスン一覧画面に遷移（処理を待たずに）
      router.replace('/lessons');
      
      // バックグラウンドで音声ファイルのアップロードと処理を続行
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `lessons/${user.uid}/${lessonRef.id}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);
          setProcessingStep(`アップロード中... ${progress}%`);
        },
        (error) => {
          console.error('アップロードエラー:', error);
          setIsProcessing(false);
        },
        async () => {
          try {
            // アップロード完了後、メタデータを更新
            await updateMetadata(storageRef, {
              customMetadata: {
                lessonId: lessonRef.id,
                userId: user.uid,
                processingId: uniqueProcessingId, // メタデータにも処理IDを追加
              },
            });
            
            // ダウンロードURLを取得
            const downloadUrl = await getDownloadURL(storageRef);
            setAudioUrl(downloadUrl);
            
            // Firestoreのレッスンドキュメントを更新 - 処理IDを渡す
            await processAudioFile(lessonRef.id, fileUri, fileName, uniqueProcessingId);
            
            // ローカルのレッスンストアへの追加は行わない
            // Firestoreからのデータ同期に任せる
            
          } catch (error) {
            console.error('処理エラー:', error);
            setIsProcessing(false);
          }
        }
      );
    } catch (error) {
      console.error('アップロードエラー:', error);
      setIsProcessing(false);
      Alert.alert('エラー', 'ファイルのアップロードに失敗しました');
    }
  };

  const handleSave = () => {
    if (!formData.teacherName) {
      Alert.alert('エラー', '講師名は必須です');
      return;
    }
    
    // 音声ファイルの有無に関わらず、直接アップロード処理を実行
    handleUpload();
  };

  const handleUpdateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const canSave = formData.teacherName.trim() !== '';

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('ファイル選択がキャンセルされました');
        return;
      }

      const file = result.assets[0];
      console.log('選択されたファイル:', file);
      
      // ファイル名を表示用に保存
      setSelectedFile(file.name);
      // ファイルURIを保存（実際のアップロード時に使用）
      setSelectedFileUri(file.uri);
      // ファイル名を保存
      setSelectedFileName(file.name);
      
      // ここでアップロードを開始しない
      // handleUpload()の呼び出しを削除
    } catch (error) {
      console.error('ファイル選択エラー:', error);
      Alert.alert('エラー', 'ファイルの選択に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FormHeader 
        title="レッスン記録" 
        onSave={handleSave} 
        canSave={canSave && !isProcessing} 
      />
      
      <ScrollView style={styles.scrollView}>
        <FormInputs 
          formData={formData} 
          onUpdateFormData={handleUpdateFormData} 
          onShowCalendar={() => setShowCalendar(true)} 
        />
        
        <AudioUploader 
          selectedFile={selectedFile} 
          uploadProgress={uploadProgress} 
          isProcessing={isProcessing} 
          processingStep={processingStep} 
          onUpload={handleSelectFile} 
        />
      </ScrollView>
      
      <CalendarModal 
        visible={showCalendar} 
        onClose={() => setShowCalendar(false)} 
        onDateSelect={handleDateSelect} 
        selectedDate={selectedDate} 
        currentMonth={currentMonth} 
        onChangeMonth={changeMonth} 
        calendarDays={generateCalendarDays()} 
        gesture={gesture} 
        animatedStyle={animatedStyle} 
      />
      
      {isProcessing && <LoadingOverlay message={processingStep} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
