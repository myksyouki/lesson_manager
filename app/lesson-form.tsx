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
import { collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
    // 日曜始まりとしてオフセット計算
    const offset = firstDayOfMonth.getDay();

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

  const handleSave = async () => {
    if (!formData.teacherName) {
      Alert.alert('エラー', '講師名は必須です');
      return;
    }
    
    if (!auth.currentUser) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep('レッスンデータを保存中...');

      // 音声ファイルがある場合はアップロード
      if (selectedFileUri) {
        // Firestoreにレッスンデータを先に保存
        const lessonData = {
          teacher: formData.teacherName.trim(),
          date: formData.date,
          pieces: formData.pieces,
          notes: formData.notes,
          tags: formData.tags,
          user_id: auth.currentUser.uid,
          status: 'uploading',
          created_at: new Date(),
          updated_at: new Date(),
        };

        // Firestoreにドキュメントを追加
        const docRef = await addDoc(collection(db, 'lessons'), lessonData);
        setLessonDocId(docRef.id);

        // 音声ファイルをStorageにアップロード
        const response = await fetch(selectedFileUri);
        const blob = await response.blob();
        
        // ファイル名を生成（ユーザーID + タイムスタンプ + 元のファイル名）
        const timestamp = new Date().getTime();
        const fileName = `${auth.currentUser.uid}_${timestamp}_${selectedFileName}`;
        const storageRef = ref(storage, `audio/${fileName}`);
        
        // メタデータを設定
        const metadata = {
          contentType: blob.type,
          customMetadata: {
            'lessonId': docRef.id,
            'userId': auth.currentUser.uid,
          }
        };

        // アップロード開始
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
        
        // アップロード進捗の監視
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            setProcessingStep(`音声ファイルをアップロード中... ${Math.round(progress)}%`);
          },
          (error) => {
            console.error('アップロードエラー:', error);
            setIsProcessing(false);
            Alert.alert('エラー', 'ファイルのアップロードに失敗しました');
          },
          async () => {
            // アップロード完了時の処理
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setAudioUrl(downloadURL);
            
            // Firestoreのドキュメントを更新
            await updateDoc(doc(db, 'lessons', docRef.id), {
              audioUrl: downloadURL,
              status: 'uploaded',
              updated_at: new Date(),
            });
            
            // 音声処理を開始
            if (auth.currentUser) {
              await processAudioFile(docRef.id, downloadURL, fileName, auth.currentUser.uid);
            }
          }
        );
      } else {
        // 音声ファイルがない場合は通常のレッスンデータのみ保存
        const lessonId = await addLesson({
          teacher: formData.teacherName.trim(),
          date: formData.date,
          pieces: formData.pieces,
          notes: formData.notes,
          tags: formData.tags,
          user_id: auth.currentUser.uid,
          summary: '', // 必須フィールドを追加
        });
        
        setIsProcessing(false);
        Alert.alert(
          '保存完了',
          'レッスンが保存されました',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('レッスン保存エラー:', error);
      setIsProcessing(false);
      Alert.alert('エラー', 'レッスンの保存に失敗しました');
    }
  };

  const handleUpdateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const isFormValid = () => {
    return formData.teacherName.trim() !== '';
  };

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
      // handleSave()の呼び出しを削除
    } catch (error) {
      console.error('ファイル選択エラー:', error);
      Alert.alert('エラー', 'ファイルの選択に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FormHeader 
        onSave={handleSave}
        isValid={isFormValid()}
        isProcessing={isProcessing}
      />
      
      <ScrollView style={styles.scrollView}>
        <FormInputs 
          formData={formData}
          setFormData={setFormData}
          onDatePress={() => setShowCalendar(true)}
        />
        
        <AudioUploader 
          selectedFileName={selectedFileName}
          onSelectFile={async () => {
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
              setSelectedFile(file.uri);
              setSelectedFileUri(file.uri);
              setSelectedFileName(file.name);
            } catch (error) {
              console.error('ファイル選択エラー:', error);
              Alert.alert('エラー', 'ファイルの選択中にエラーが発生しました');
            }
          }}
          onRemoveFile={() => {
            setSelectedFile(null);
            setSelectedFileUri(null);
            setSelectedFileName(null);
          }}
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
