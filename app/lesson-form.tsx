import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { processAudioFile } from './services/audioProcessing';
import { useLessonStore } from './store/lessons';
import * as DocumentPicker from 'expo-document-picker';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';

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
    piece: '',
    notes: '',
    tags: [],
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  
  const { addLesson } = useLessonStore();

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
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      const prevMonthLastDay = new Date(year, month, 0);
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay.getDate() - i),
        isCurrentMonth: false,
      });
    }
    days.reverse();

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        });
      }
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
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;
      setSelectedFile(fileName);
    } catch (err) {
      console.error(err);
      Alert.alert('エラー', 'ファイルのアップロードに失敗しました');
    }
  };

  const processLesson = async (fileUri: string) => {
    if (!formData.teacherName.trim()) {
      Alert.alert('エラー', '講師名を入力してください');
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingStep('アップロード中...');
      
      // Process the audio file
      const result = await processAudioFile(fileUri, {
        teacher: formData.teacherName,
        date: formData.date,
        piece: formData.piece,
        notes: formData.notes,
        tags: formData.tags,
      });
      
      if (!result.success) {
        throw new Error('処理に失敗しました');
      }
      
      setProcessingStep('文字起こし中...');
      
      // Short delay to show the transcription step
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessingStep('要約生成中...');
      
      // Short delay to show the summary step
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate back to the lessons screen
      router.replace('/lessons');
    } catch (error) {
      console.error('Error processing lesson:', error);
      Alert.alert('エラー', '処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('エラー', 'レッスン録音ファイルを選択してください');
      return;
    }
    
    // In a real implementation, you would process the file here
    // For demo purposes, we'll just simulate a delay
    setIsProcessing(true);
    setProcessingStep('アップロード中...');
    
    setTimeout(() => {
      setProcessingStep('文字起こし中...');
      
      setTimeout(() => {
        setProcessingStep('要約生成中...');
        
        setTimeout(() => {
          setIsProcessing(false);
          router.replace('/lessons');
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>新規レッスン</Text>
        </View>

        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>{processingStep}</Text>
            <Text style={styles.processingSubtext}>
              処理には数分かかる場合があります
            </Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>講師名 *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.teacherName}
                  onChangeText={(text) => setFormData({ ...formData, teacherName: text })}
                  placeholder="講師名を入力"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>日付 *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.dateText}>{formData.date}</Text>
                  <MaterialIcons name="calendar-today" size={22} color="#5f6368" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>練習曲</Text>
                <TextInput
                  style={styles.input}
                  value={formData.piece}
                  onChangeText={(text) => setFormData({ ...formData, piece: text })}
                  placeholder="曲名を入力"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>メモ</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="メモを入力"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.label}>レッスン録音</Text>
                
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={handleUpload}
                >
                  <Ionicons name="cloud-upload" size={24} color="#007AFF" />
                  <Text style={styles.uploadButtonText}>
                    音声ファイルをアップロード
                  </Text>
                </TouchableOpacity>
                
                {selectedFile && (
                  <View style={styles.selectedFileContainer}>
                    <Ionicons name="document" size={22} color="#007AFF" />
                    <Text style={styles.selectedFileText}>{selectedFile}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!selectedFile || !formData.teacherName) && styles.submitButtonDisabled
              ]} 
              onPress={handleSubmit}
              disabled={!selectedFile || !formData.teacherName}
            >
              <Text style={styles.submitButtonText}>レッスンを保存</Text>
            </TouchableOpacity>
          </>
        )}
        
        <Modal visible={showCalendar} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.calendarModal}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Text style={styles.modalCloseText}>キャンセル</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>日付を選択</Text>
                <TouchableOpacity onPress={() => handleDateSelect(selectedDate)}>
                  <Text style={styles.modalDoneText}>完了</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.monthSelector}>
                <TouchableOpacity 
                  onPress={() => changeMonth(-1)} 
                  style={styles.monthButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="chevron-left" size={32} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                  {currentMonth.getFullYear()}年{MONTHS[currentMonth.getMonth()]}
                </Text>
                <TouchableOpacity 
                  onPress={() => changeMonth(1)} 
                  style={styles.monthButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="chevron-right" size={32} color="#007AFF" />
                </TouchableOpacity>
              </View>

              <GestureDetector gesture={gesture}>
                <Animated.View style={[styles.calendar, animatedStyle]}>
                  <View style={styles.weekDayHeader}>
                    {DAYS.map((day, index) => (
                      <Text
                        key={day}
                        style={[
                          styles.weekDayText,
                          { width: DAY_SIZE },
                          index === 0 && styles.sundayText,
                          index === 6 && styles.saturdayText,
                        ]}>
                        {day}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.daysGrid}>
                    {generateCalendarDays().map((item, index) => {
                      const isSelected =
                        selectedDate &&
                        item.date.getDate() === selectedDate.getDate() &&
                        item.date.getMonth() === selectedDate.getMonth() &&
                        item.date.getFullYear() === selectedDate.getFullYear();

                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dayButton,
                            { width: DAY_SIZE, height: DAY_SIZE },
                            !item.isCurrentMonth && styles.otherMonthDay,
                            isSelected && styles.selectedDay,
                          ]}
                          onPress={() => setSelectedDate(item.date)}>
                          <Text
                            style={[
                              styles.dayText,
                              !item.isCurrentMonth && styles.otherMonthDayText,
                              isSelected && styles.selectedDayText,
                            ]}>
                            {item.date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              </GestureDetector>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 10, // Increased padding for better touch target
    marginRight: 8,
  },
  title: {
    fontSize: 22, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 17, // Larger font size
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12, // Increased border radius
    padding: 16, // Increased padding
    fontSize: 17, // Larger font size
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 17, // Larger font size
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  textArea: {
    height: 120, // Increased height
    paddingTop: 16,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  selectedFileText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 18, // Increased padding
    borderRadius: 16, // Increased border radius
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18, // Larger font size
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  processingSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24, // Increased border radius
    borderTopRightRadius: 24, // Increased border radius
    padding: 20,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseText: {
    color: '#007AFF',
    fontSize: 18, // Larger font size
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalDoneText: {
    color: '#007AFF',
    fontSize: 18, // Larger font size
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalTitle: {
    fontSize: 20, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  monthButton: {
    width: 44, // Increased size
    height: 44, // Increased size
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22, // Make it circular
  },
  monthText: {
    fontSize: 22, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  calendar: {
    marginBottom: 20,
  },
  weekDayHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    textAlign: 'center',
    fontSize: 16, // Larger font size
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sundayText: {
    color: '#FF3B30',
  },
  saturdayText: {
    color: '#007AFF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 18, // Larger font size
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: '#8E8E93',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: 22, // Increased border radius
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
});