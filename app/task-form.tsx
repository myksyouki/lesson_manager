import React, { useState, useEffect } from 'react';
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
  ScrollView,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTaskStore } from '../store/tasks';
import { useAuthStore } from '../store/auth';
import { Task } from '../types/_task';
import { getCurrentUserProfile } from '../services/userProfileService';

const SCREEN_WIDTH = Dimensions.get('window').width;

// スキルレベルのリスト
const SKILL_LEVELS = ['初心者', '中級者', '上級者'];

// 練習メニュー生成のためのフォームデータの初期値
const DEFAULT_PRACTICE_DURATION = 60; // デフォルトの練習時間（分）

// 削除されたPracticeMenuServiceの型定義の代替
interface PracticeMenuItem {
  title: string;
  description: string;
  duration: number;
  category?: string;
}

interface PracticeMenuRequest {
  instrument: string;
  skill_level: string;
  practice_duration: number;
  practice_content?: string;
  specific_goals?: string;
}

export default function PracticeMenuGenerator() {
  const params = useLocalSearchParams<{ 
    practiceMenu?: string, 
    chatRoomId?: string,
    redirectTo?: string,
    category?: string,
    mode?: string
  }>();
  const { user } = useAuthStore();
  const { addTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMenu, setGeneratedMenu] = useState<PracticeMenuItem[]>([]);
  const [menuSummary, setMenuSummary] = useState('');
  const [userInstrument, setUserInstrument] = useState('');

  // 練習メニュー生成のためのフォームデータ
  const [formData, setFormData] = useState<PracticeMenuRequest>({
    instrument: '',
    skill_level: '中級者',
    practice_duration: DEFAULT_PRACTICE_DURATION,
    practice_content: '',
    specific_goals: ''
  });

  // ユーザープロフィールから楽器情報を取得
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (profile && profile.selectedInstrument) {
          setUserInstrument(profile.selectedInstrument);
          setFormData(prev => ({
            ...prev,
            instrument: profile.selectedInstrument
          }));
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // 生成された練習メニューをタスクとして保存
  const handleSaveTasks = async () => {
    if (generatedMenu.length === 0) {
      Alert.alert('エラー', '練習メニューが生成されていません');
      return;
    }

    try {
      setIsLoading(true);

      // 各練習項目をタスクとして保存
      const savedTasks = [];
      for (const menuItem of generatedMenu) {
        const taskData: Task = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 一意のIDを生成
          title: menuItem.title,
          content: menuItem.description, // Assuming description maps to content
          dueDate: new Date(),
          completed: false, // Corrected property name
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: menuItem.category ? [menuItem.category] : [],
        };

        await addTask(taskData);
        savedTasks.push(taskData);
      }
      
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert(
          '保存完了', 
          `${savedTasks.length}個の練習メニューをタスクとして保存しました`,
          [{ text: 'OK', onPress: () => router.replace({
            pathname: '/tabs/task',
            params: { isNewlyCreated: 'true' }
          }) }]
        );
      }, 500);
      
    } catch (error) {
      console.error('タスク保存エラー:', error);
      Alert.alert('エラー', 'タスクの保存に失敗しました');
      setIsLoading(false);
    }
  };

  // 練習メニューの生成
  const handleGenerateMenu = async () => {
    // この機能は現在利用できないことを通知
    Alert.alert(
      '機能停止のお知らせ',
      '申し訳ありませんが、練習メニュー生成機能は現在ご利用いただけません。開発者にお問い合わせください。',
      [{ text: 'OK' }]
    );
  };

  // スキルレベルを選択
  const selectSkillLevel = (level: string) => {
    setFormData(prev => ({
      ...prev,
      skill_level: level
    }));
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
          <Text style={styles.title}>練習メニュー作成</Text>
          
          {/* 削除機能：保存ボタンは維持 */}
          {generatedMenu.length > 0 && (
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveTasks}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {!generatedMenu.length ? (
            // 練習メニュー生成フォーム
            <View style={styles.form}>
              <View style={styles.formCard}>
                <View style={styles.noticeContainer}>
                  <FontAwesome5 name="exclamation-triangle" size={24} color="#ff9500" />
                  <Text style={styles.noticeText}>
                    この機能は現在メンテナンス中です。申し訳ありませんが、しばらくお待ちください。
                  </Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>スキルレベル <Text style={styles.required}>*</Text></Text>
                  <View style={styles.pillContainer}>
                    {SKILL_LEVELS.map(level => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.pill,
                          formData.skill_level === level && styles.pillSelected
                        ]}
                        onPress={() => selectSkillLevel(level)}
                      >
                        <Text style={[
                          styles.pillText,
                          formData.skill_level === level && styles.pillTextSelected
                        ]}>
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>練習したい内容 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={formData.practice_content}
                    onChangeText={(text) => {
                      const limitedText = text.slice(0, 20);
                      setFormData({ ...formData, practice_content: limitedText });
                    }}
                    placeholder="例: 高音域の安定性、タンギング"
                    maxLength={20}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>具体的な目標（任意）</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.specific_goals}
                    onChangeText={(text) => setFormData({ ...formData, specific_goals: text })}
                    placeholder="具体的な目標を入力（例: コンクールの準備、アンサンブルの練習など）"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.generateButton, { opacity: 0.5 }]}
                onPress={handleGenerateMenu}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="auto-fix-high" size={24} color="#ffffff" />
                    <Text style={styles.generateButtonText}>練習メニューを生成</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : 
            // 生成された練習メニューの表示
            <View style={styles.generatedMenuContainer}>
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>練習メニューの概要</Text>
                <Text style={styles.summaryText}>{menuSummary}</Text>
              </View>

              <Text style={styles.menuSectionTitle}>練習メニュー項目</Text>
              
              {generatedMenu.map((item, index) => (
                <View key={index} style={styles.menuItem}>
                  <View style={styles.menuItemHeader}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <View style={styles.menuItemMeta}>
                      <Text style={styles.menuItemDuration}>{item.duration}分</Text>
                      {item.category && (
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryText}>{item.category}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.menuItemDescription}>{item.description}</Text>
                </View>
              ))}
            </View>
          }
        </ScrollView>
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
  scrollView: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginRight: 'auto',
  },
  form: {
    padding: 16,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  pill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  pillSelected: {
    backgroundColor: '#007AFF',
  },
  pillText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  // 生成された練習メニューのスタイル
  generatedMenuContainer: {
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: '#e4f5f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItemMeta: {
    alignItems: 'flex-end',
  },
  menuItemDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  categoryPill: {
    backgroundColor: '#007AFF20',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItemDescription: {
    fontSize: 15,
    color: '#3C3C3E',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonContainer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  backToFormButton: {
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  backToFormButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  required: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  noticeContainer: {
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noticeText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
