import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTaskStore } from './store/tasks';
import { useAuthStore } from './store/auth';
import { Task } from './types/task';
import CalendarModal from './features/lessons/components/form/CalendarModal';
import { useCalendar, DAYS } from './hooks/useCalendar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 600);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

export default function TaskForm() {
  const params = useLocalSearchParams<{ 
    practiceMenu?: string, 
    chatRoomId?: string,
    redirectTo?: string,
    category?: string
  }>();
  const { user } = useAuthStore();
  const { addTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    selectedDate,
    currentMonth,
    showCalendar,
    setShowCalendar,
    handleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  } = useCalendar(new Date(), (_, formattedDate) => {
    setFormData({
      ...formData,
      dueDate: formattedDate
    });
  });

  const [formData, setFormData] = useState({
    title: '',
    description: params.practiceMenu || '',
    dueDate: formatDate(new Date()),
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    try {
      setIsLoading(true);

      const tags = params.category ? [params.category] : [];

      const taskData: Task = {
        id: `task_${Date.now()}`, // 一意のIDを生成
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: tags,
        attachments: params.chatRoomId ? [
          {
            type: 'text' as const,
            url: `/chatRooms/${params.chatRoomId}`
          }
        ] : undefined
      };

      await addTask(taskData);
      
      setTimeout(() => {
        setIsLoading(false);
        // 型安全のため、常にタスク画面に遷移する
        // @ts-ignore - 型エラーを無視
        router.replace('/(tabs)/task');
      }, 500);
      
    } catch (error) {
      console.error('タスク保存エラー:', error);
      Alert.alert('エラー', 'タスクの保存に失敗しました');
      setIsLoading(false);
    }
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
          <Text style={styles.title}>新規タスク</Text>
          {params.chatRoomId && (
            <View style={styles.aiIndicator}>
              <Ionicons name="musical-notes-outline" size={16} color="#007AFF" />
              <Text style={styles.aiIndicatorText}>AI練習メニュー</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>タスクを保存中...</Text>
          </View>
        ) : (
          <>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>タイトル *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="タイトルを入力"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>期日</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.dateText}>{formData.dueDate}</Text>
                  <MaterialIcons name="calendar-today" size={22} color="#5f6368" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>詳細</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="詳細を入力"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {showCalendar && (
          <CalendarModal
            onClose={() => setShowCalendar(false)}
            onSelectDate={handleDateSelect}
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            onChangeMonth={changeMonth}
            generateCalendarDays={generateCalendarDays}
            formatDate={formatDate}
            days={DAYS}
            daySize={DAY_SIZE}
          />
        )}
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
    padding: 10,
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginRight: 'auto',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiIndicatorText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
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
    fontSize: 17,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
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
    fontSize: 17,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
});
