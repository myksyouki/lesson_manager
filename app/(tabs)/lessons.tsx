import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Text,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import ListHeader from '../features/lessons/components/list/ListHeader';
import LessonCard from '../features/lessons/components/list/LessonCard';
import { Lesson } from '../store/lessons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../theme/index';
import { StaggeredList, AnimatedButton } from '../components/AnimatedComponents';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLessonStore } from '../store/lessons';

export default function LessonsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ['リズム', 'テクニック', '表現', 'ペダル', '音色', '強弱'];
  const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(false);
      } catch (error) {
        console.error('レッスン一覧: データ取得エラー', error);
        setIsLoading(false);
      }
    };

    loadLessons();
    
    // 以下のリアルタイム監視は不要になるため削除
    // const lessonsRef = collection(db, 'lessons');
    // const userId = auth.currentUser.uid;
    // const q = query(lessonsRef, where('user_id', '==', userId));
    // const unsubscribe = onSnapshot(q, (querySnapshot) => {...});
    // return () => unsubscribe();
  }, [auth.currentUser?.uid]);

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
      pathname: '/generate-tasks',
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
      pathname: '/consult-ai',
      params: { 
        lessonIds: selectedLessons.join(',')
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ListHeader 
        searchText={searchText}
        onSearchChange={handleSearchChange}
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagPress={handleTagPress}
        isSelectionMode={isSelectionMode}
        toggleSelectionMode={toggleSelectionMode}
      />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            レッスンを読み込み中...
          </Text>
        </View>
      ) : filteredLessons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {searchText || selectedTags.length > 0 
              ? '検索条件に一致するレッスンがありません' 
              : 'レッスンがまだ登録されていません'}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
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
          
          {isSelectionMode && (
            <View style={styles.selectionActionsContainer}>
              <TouchableOpacity 
                style={[styles.selectionActionButton, { backgroundColor: theme.colors.primary }]}
                onPress={generateTasksFromSelectedLessons}
                disabled={selectedLessons.length === 0}
              >
                <MaterialIcons name="assignment" size={24} color="#FFFFFF" />
                <Text style={styles.selectionActionText}>タスク生成</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.selectionActionButton, { backgroundColor: theme.colors.secondary }]}
                onPress={consultAIWithSelectedLessons}
                disabled={selectedLessons.length === 0}
              >
                <MaterialIcons name="smart-toy" size={24} color="#FFFFFF" />
                <Text style={styles.selectionActionText}>AIに相談</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {/* レッスンを記録ボタン */}
      <View style={styles.actionButtonContainer}>
        <AnimatedButton
          title="レッスンを記録"
          onPress={() => router.push('/lesson-form')}
          style={{
            backgroundColor: theme.colors.primary,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
          activeScale={0.92}
        >
          <Text style={{
            color: theme.colors.textInverse,
            fontSize: 16,
            fontWeight: '600',
            marginRight: 8
          }}>
            レッスンを記録
          </Text>
          <MaterialIcons name="add" size={24} color={theme.colors.textInverse} />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  selectionActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  selectionActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
});