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
  ScrollView,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTaskStore } from './store/tasks';
import { useAuthStore } from './store/auth';
import { Task } from './types/task';
import { 
  generatePracticeMenu, 
  PracticeMenuRequest, 
  PracticeMenuItem 
} from './services/practiceMenuService';

const SCREEN_WIDTH = Dimensions.get('window').width;

// スキルレベルのリスト
const SKILL_LEVELS = ['初心者', '中級者', '上級者'];

// 重点分野のリスト
const FOCUS_AREAS = [
  '音色', 'リズム', '表現力', 'テクニック', '読譜力', '暗譜', 'アンサンブル'
];

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

  // 練習メニュー生成のためのフォームデータ
  const [formData, setFormData] = useState<PracticeMenuRequest>({
    instrument: '',
    skill_level: '中級者',
    practice_duration: 60,
    focus_areas: [],
    specific_goals: ''
  });

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
          description: menuItem.description,
          dueDate: new Date().toISOString(),
          isCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: menuItem.category ? [menuItem.category] : [],
          attachments: params.chatRoomId ? [
            {
              type: 'text' as const,
              url: `/chatRooms/${params.chatRoomId}`
            }
          ] : undefined
        };

        await addTask(taskData);
        savedTasks.push(taskData);
      }
      
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert(
          '保存完了', 
          `${savedTasks.length}個の練習メニューをタスクとして保存しました`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/task' as any) }]
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
    if (!formData.instrument.trim()) {
      Alert.alert('エラー', '楽器を入力してください');
      return;
    }

    if (formData.practice_duration <= 0) {
      Alert.alert('エラー', '有効な練習時間を入力してください');
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedMenu([]);
      setMenuSummary('');

      // APIを使用して練習メニューを生成
      const response = await generatePracticeMenu(formData);
      
      setGeneratedMenu(response.practice_menu);
      setMenuSummary(response.summary);
      
      setIsGenerating(false);
    } catch (error) {
      console.error('練習メニュー生成エラー:', error);
      Alert.alert('エラー', '練習メニューの生成に失敗しました。再試行してください。');
      setIsGenerating(false);
    }
  };

  // 重点分野の選択を切り替える
  const toggleFocusArea = (area: string) => {
    setFormData(prev => {
      const currentAreas = prev.focus_areas || [];
      const newAreas = currentAreas.includes(area) 
        ? currentAreas.filter(a => a !== area)
        : [...currentAreas, area];
      
      return {
        ...prev,
        focus_areas: newAreas
      };
    });
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
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>タスクを保存中...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            {!generatedMenu.length ? (
              // 練習メニュー生成フォーム
              <>
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>楽器 *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.instrument}
                      onChangeText={(text) => setFormData({ ...formData, instrument: text })}
                      placeholder="楽器を入力（例: トランペット、ピアノ）"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>スキルレベル</Text>
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
                    <Text style={styles.label}>練習時間（分）</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.practice_duration.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setFormData({ ...formData, practice_duration: value });
                      }}
                      keyboardType="number-pad"
                      placeholder="練習時間を入力（例: 60）"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>重点を置きたい分野</Text>
                    <View style={styles.pillContainer}>
                      {FOCUS_AREAS.map(area => (
                        <TouchableOpacity
                          key={area}
                          style={[
                            styles.pill,
                            (formData.focus_areas || []).includes(area) && styles.pillSelected
                          ]}
                          onPress={() => toggleFocusArea(area)}
                        >
                          <Text style={[
                            styles.pillText,
                            (formData.focus_areas || []).includes(area) && styles.pillTextSelected
                          ]}>
                            {area}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGenerateMenu}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.generateButtonText}>練習メニューを生成</Text>
                        <FontAwesome5 name="magic" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
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

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.backToFormButton}
                    onPress={() => {
                      setGeneratedMenu([]);
                      setMenuSummary('');
                    }}
                  >
                    <Text style={styles.backToFormButtonText}>やり直す</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveTasks}
                  >
                    <Text style={styles.saveButtonText}>タスクとして保存</Text>
                    <MaterialIcons name="save" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
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
  scrollView: {
    flex: 1,
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
  form: {
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  pill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  pillSelected: {
    backgroundColor: '#d0e8ff',
  },
  pillText: {
    fontSize: 14,
    color: '#555',
  },
  pillTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  generateButtonText: {
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
  buttonIcon: {
    marginLeft: 8,
  },
  // 生成された練習メニューのスタイル
  generatedMenuContainer: {
    padding: 20,
  },
  summaryContainer: {
    backgroundColor: '#e4f5f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItemMeta: {
    alignItems: 'flex-end',
  },
  menuItemDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  categoryPill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#555',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItemDescription: {
    fontSize: 15,
    color: '#3C3C3E',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  backToFormButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backToFormButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
