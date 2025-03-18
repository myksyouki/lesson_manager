import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Text,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useFocusEffect } from '@react-navigation/native';
import ListHeader from '../features/lessons/components/list/ListHeader';
import SearchBar from '../features/lessons/components/list/SearchBar';
import TagFilter from '../features/lessons/components/list/TagFilter';
import LessonCard from '../features/lessons/components/list/LessonCard';
import { Lesson } from '../store/lessons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../theme/index';
import { StaggeredList, AnimatedButton } from '../components/AnimatedComponents';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLessonStore } from '../store/lessons';

// レッスンタブのテーマカラー
const LESSON_THEME_COLOR = '#4285F4';

export default function LessonsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ['リズム', 'テクニック', '表現', 'ペダル', '音色', '強弱'];
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  
  // 複数選択モード関連の状態
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);

  // レッスンストアから状態とアクションを取得
  const { lessons, fetchLessons } = useLessonStore();

  // マテリアルデザインの色を定義
  const colors = {
    primary: '#4285F4',
    primaryLight: '#8AB4F8',
    secondary: '#34A853',
    error: '#EA4335',
    warning: '#FBBC05',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    textPrimary: '#202124',
    textSecondary: '#5F6368',
    textTertiary: '#9AA0A6',
    divider: '#DADCE0',
  };

  // 日付をフォーマットする関数
  const formatDate = (dateString: string | Date | { seconds: number; nanoseconds: number }) => {
    try {
      // Firestoreのタイムスタンプオブジェクトの場合
      if (dateString && typeof dateString === 'object' && 'seconds' in dateString) {
        const date = new Date(dateString.seconds * 1000);
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      
      // 日付オブジェクトの場合
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      
      // 日本語形式の日付文字列の場合（例: "2023年5月15日"）
      if (typeof dateString === 'string' && dateString.includes('年')) {
        return dateString;
      }
      
      // ISO形式の日付文字列の場合
      if (typeof dateString === 'string' && dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      }
      
      // どの形式にも当てはまらない場合
      return '日付なし';
    } catch (error) {
      console.error('日付フォーマットエラー:', error, dateString);
      return '日付エラー';
    }
  };

  // 検索とフィルタリングの関数
  const filteredLessons = lessons.filter(lesson => {
    // 検索テキストでフィルタリング
    const searchMatch = searchText === '' || 
      lesson.teacher.toLowerCase().includes(searchText.toLowerCase()) ||
      (lesson.pieces && lesson.pieces.some(piece => piece.toLowerCase().includes(searchText.toLowerCase())));
    
    // タグでフィルタリング
    const tagMatch = selectedTags.length === 0 || 
      (lesson.tags && selectedTags.every(tag => lesson.tags.includes(tag)));
    
    return searchMatch && tagMatch;
  });

  // デバッグ用のログ
  useEffect(() => {
    console.log('レッスン一覧状態:', {
      isLoading,
      lessonsCount: lessons.length,
      filteredLessonsCount: filteredLessons.length,
      searchText,
      selectedTags
    });
  }, [isLoading, lessons.length, filteredLessons.length, searchText, selectedTags]);

  // Firestoreからのレッスンデータ取得
  useEffect(() => {
    const loadLessons = async () => {
      if (!auth.currentUser) {
        console.log('レッスン一覧: ユーザーが認証されていません');
        setIsLoading(false);
        return;
      }

      try {
        console.log('レッスン一覧: データ取得を開始します');
        setIsLoading(true);
        
        // useLessonStoreのfetchLessons関数を使用してデータを取得
        await fetchLessons(auth.currentUser.uid);
        
        console.log(`レッスン一覧: ${lessons.length}件のレッスンを取得しました`);
        console.log('レッスンデータ:', JSON.stringify(lessons.map(l => ({ id: l.id, teacher: l.teacher, user_id: l.user_id })), null, 2));
        setIsLoading(false);
      } catch (error) {
        console.error('レッスン一覧: データ取得エラー', error);
        setIsLoading(false);
      }
    };

    loadLessons();
  }, [auth.currentUser?.uid, fetchLessons]);

  // タブがフォーカスされたときにレッスンデータを再取得
  useFocusEffect(
    useCallback(() => {
      const refreshLessonsOnFocus = async () => {
        if (!auth.currentUser) return;
        
        try {
          console.log('タブフォーカス: レッスンデータ再取得を開始します');
          await fetchLessons(auth.currentUser.uid);
          console.log(`タブフォーカス: ${lessons.length}件のレッスンを再取得しました`);
        } catch (error) {
          console.error('タブフォーカス: レッスンデータ再取得エラー', error);
        }
      };
      
      refreshLessonsOnFocus();
      
      return () => {
        // クリーンアップ関数（必要に応じて）
      };
    }, [fetchLessons, auth.currentUser?.uid])
  );

  // 検索テキスト変更ハンドラ
  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  // タグ選択ハンドラ
  const handleTagPress = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // 選択モードの切り替え
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedLessons([]);
  };

  // レッスンの選択状態を切り替える
  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  // 選択したレッスンからタスクを生成
  const generateTasksFromSelectedLessons = async () => {
    if (selectedLessons.length === 0) return;
    
    // 選択されたレッスンのデータを取得
    const selectedLessonData = lessons.filter(lesson => 
      selectedLessons.includes(lesson.id)
    );
    
    // タスク生成画面に遷移（選択したレッスンデータを渡す）
    router.push({
      pathname: '/generate-tasks' as any,
      params: { 
        lessonIds: selectedLessons.join(',')
      }
    });
  };

  // 選択したレッスンをAIレッスンに相談
  const consultAIWithSelectedLessons = async () => {
    if (selectedLessons.length === 0) return;
    
    // AIレッスン相談画面に遷移（選択したレッスンデータを渡す）
    router.push({
      pathname: '/consult-ai' as any,
      params: { 
        lessonIds: selectedLessons.join(',')
      }
    });
  };

  // 手動リフレッシュ処理
  const onRefresh = React.useCallback(() => {
    if (!auth.currentUser) return;
    
    setRefreshing(true);
    console.log('手動リフレッシュ: レッスンデータ再取得を開始します');
    
    fetchLessons(auth.currentUser.uid)
      .then(() => {
        console.log(`手動リフレッシュ: レッスンデータを再取得しました`);
        setRefreshing(false);
      })
      .catch(error => {
        console.error('手動リフレッシュ: データ取得エラー', error);
        setRefreshing(false);
      });
  }, [fetchLessons]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f5f5f5' }]}>
      <ListHeader />
      
      <View style={styles.content}>
        {/* 検索バーとタグフィルター - レッスンがある場合のみ表示 */}
        {filteredLessons.length > 0 && (
          <>
            <View style={styles.searchCardContainer}>
              <View style={styles.searchCard}>
                <View style={styles.searchCardHeader}>
                  <Text style={styles.searchCardTitle}>レッスン検索</Text>
                </View>
                <SearchBar
                  searchText={searchText}
                  onSearchChange={handleSearchChange}
                  theme={theme}
                />
                <TagFilter
                  availableTags={availableTags}
                  selectedTags={selectedTags}
                  onTagPress={handleTagPress}
                  theme={theme}
                />
              </View>
            </View>
            
            {/* セレクションモード切り替えボタン - レッスンがある場合のみ表示 */}
            <View style={[styles.selectionButtonContainer, { borderBottomColor: theme.colors.borderLight }]}>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  isSelectionMode && { backgroundColor: LESSON_THEME_COLOR + '20' }
                ]}
                onPress={toggleSelectionMode}
              >
                <MaterialIcons 
                  name={isSelectionMode ? "close" : "check-box-outline-blank"} 
                  size={24} 
                  color={isSelectionMode ? LESSON_THEME_COLOR : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.selectionButtonText,
                  { color: isSelectionMode ? LESSON_THEME_COLOR : theme.colors.textSecondary }
                ]}>
                  {isSelectionMode ? '選択解除' : '複数選択'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ローディング表示 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={LESSON_THEME_COLOR} />
            <Text style={styles.loadingText}>レッスンデータを読み込み中...</Text>
          </View>
        ) : filteredLessons.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="musical-notes" size={100} color="#CCCCCC" style={styles.emptyIcon} />
              <View style={[styles.iconBubble, { backgroundColor: LESSON_THEME_COLOR }]}>
                <MaterialIcons name="music-note" size={24} color="#FFFFFF" />
              </View>
            </View>
            
            <Text style={styles.emptyText}>
              {searchText || selectedTags.length > 0 
                ? '検索結果がありません' 
                : 'レッスンがありません'}
            </Text>
            
            <Text style={styles.emptySubText}>
              新しいレッスンを追加して{'\n'}練習を記録しましょう
            </Text>
            
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: LESSON_THEME_COLOR }]}
              onPress={() => router.push('/lesson-form' as any)}
            >
              <Text style={styles.createButtonText}>
                最初のレッスンを記録
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={LESSON_THEME_COLOR}
                colors={[LESSON_THEME_COLOR]}
                title="更新中..."
                titleColor="#5F6368"
              />
            }
          >
            <StaggeredList staggerDelay={50}>
              {filteredLessons.map((lesson) => (
                <Animated.View 
                  key={lesson.id}
                  entering={FadeIn.duration(300).delay(100)}
                >
                  <LessonCard
                    id={lesson.id}
                    teacher={lesson.teacher}
                    date={formatDate(lesson.date)}
                    pieces={lesson.pieces || []}
                    tags={lesson.tags || []}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedLessons.includes(lesson.id)}
                    onSelect={() => toggleLessonSelection(lesson.id)}
                  />
                </Animated.View>
              ))}
            </StaggeredList>
          </ScrollView>
        )}
        
        {isSelectionMode && selectedLessons.length > 0 && (
          <View style={styles.selectionActionsContainer}>
            <TouchableOpacity 
              style={[styles.selectionActionButton, { backgroundColor: LESSON_THEME_COLOR }]}
              onPress={generateTasksFromSelectedLessons}
            >
              <MaterialIcons name="assignment" size={24} color="#FFFFFF" />
              <Text style={styles.selectionActionText}>タスク生成</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.selectionActionButton, { backgroundColor: theme.colors.secondary }]}
              onPress={consultAIWithSelectedLessons}
            >
              <MaterialIcons name="smart-toy" size={24} color="#FFFFFF" />
              <Text style={styles.selectionActionText}>AIに相談</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* 新規レッスン追加ボタン */}
      {!isSelectionMode && filteredLessons.length > 0 && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: LESSON_THEME_COLOR }]}
          onPress={() => router.push('/lesson-form' as any)}
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  searchCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
  },
  searchBarContainer: {
    marginBottom: 10,
  },
  selectionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 100,
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
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    opacity: 0.7,
  },
  iconBubble: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#4285F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  selectionActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  selectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectionActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
  },
});