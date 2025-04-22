import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  SectionList,
  Dimensions,
} from 'react-native';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchBar from '../features/lessons/components/list/SearchBar';
import TagFilter from '../features/lessons/components/list/TagFilter';
import LessonCard from '../features/lessons/components/list/LessonCard';
import { Lesson } from '../../store/lessons';
import { useTheme } from '../../theme';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useLessonStore } from '../../store/lessons';
import Collapsible from 'react-native-collapsible';

// レッスンタブのテーマカラー
const LESSON_THEME_COLOR = '#4285F4';

// タブタイプの定義
type TabType = 'active' | 'archive';

export default function LessonsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailedSearch, setIsDetailedSearch] = useState(false);
  const [isTagsVisible, setIsTagsVisible] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // パラメータを取得（トップレベルに移動）
  const params = useLocalSearchParams();
  
  // LINE風のタブバー高さ設定
  const TAB_BAR_HEIGHT = 50;
  const BOTTOM_INSET = Platform.OS === 'ios' ? insets.bottom : 0;
  const TOTAL_TAB_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_INSET;
  
  // 画面サイズの状態を管理
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });
  
  // 画面の高さに基づいてパディングを計算
  const bottomPadding = Math.max(TOTAL_TAB_HEIGHT + 20, dimensions.height * 0.1);
  
  // デバイスの向き変更時に画面サイズを更新
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
      console.log('画面サイズ変更:', window.width, window.height);
    });
    
    return () => subscription.remove();
  }, []);
  
  // アクティブタブの状態管理
  const [activeTab, setActiveTab] = useState<TabType>('active');
  
  // 複数選択モード関連の状態
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);

  // レッスンストアから状態とアクションを取得
  const { lessons, fetchLessons, getArchivedLessons, archiveLesson } = useLessonStore();

  // アーカイブされたレッスンを取得
  const archivedLessons = useMemo(() => getArchivedLessons(), [lessons]);

  // アーカイブレッスンのセクションデータを作成
  const archivedSections = useMemo(() => {
    const sections = Object.entries(archivedLessons.byMonth).map(([month, monthLessons]) => {
      // 月表示を整形（YYYY-MM → YYYY年MM月）
      const [year, monthNum] = month.split('-');
      const formattedTitle = `${year}年${monthNum}月`;
      
      return {
        title: formattedTitle,
        month: month,
        data: monthLessons
      };
    });
    
    // デバッグログ
    console.log(`セクション数: ${sections.length}`);
    if (sections.length > 0) {
      console.log(`最初のセクション: ${sections[0].title}, レッスン数: ${sections[0].data.length}`);
    }
    
    return sections;
  }, [archivedLessons]);

  // レッスンで使用されているすべてのタグを抽出
  const uniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    lessons.forEach(lesson => {
      if (lesson.tags && Array.isArray(lesson.tags)) {
        lesson.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  }, [lessons]);

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

  // 検索とフィルタリングの関数 (アクティブなレッスン用)
  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      // アクティブタブではアーカイブされていないレッスンのみ表示
      const archiveMatch = lesson.isArchived !== true;
      
      // 検索テキストでフィルタリング
      const searchMatch = searchText === '' || 
        (lesson.teacher && lesson.teacher.toLowerCase().includes(searchText.toLowerCase())) ||
        (lesson.pieces && Array.isArray(lesson.pieces) && lesson.pieces.some(piece => 
          piece && piece.toLowerCase().includes(searchText.toLowerCase())
        )) ||
        (isDetailedSearch && lesson.summary && 
          lesson.summary.toLowerCase().includes(searchText.toLowerCase()));
      
      // タグでフィルタリング
      const tagMatch = selectedTags.length === 0 || 
        (lesson.tags && Array.isArray(lesson.tags) && selectedTags.every(tag => 
          lesson.tags.includes(tag)
        ));
      
      return archiveMatch && searchMatch && tagMatch;
    });
  }, [lessons, searchText, selectedTags, isDetailedSearch]);

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
        
        // データ取得後の検証
        if (lessons.length === 0) {
          console.log('レッスン一覧: レッスンデータが見つかりませんでした');
        } else {
          console.log(`レッスン一覧: ${lessons.length}件のレッスンを取得しました`);
          // 最初の数件のみサンプルとして表示
          lessons.slice(0, 2).forEach((lesson, index) => {
            console.log(`レッスン ${index + 1}:`, {
              id: lesson.id,
              teacher: lesson.teacher,
              date: lesson.date,
              pieces: lesson.pieces?.length || 0,
              tags: lesson.tags?.length || 0
            });
          });
        }
        
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
          // トップレベルで取得したパラメータを使用
          const isNewlyCreated = params.isNewlyCreated === 'true';
          
          if (isNewlyCreated) {
            console.log('レッスン一覧: 新規作成されたレッスンがあるため再取得します');
            await fetchLessons(auth.currentUser.uid);
            
            // 選択モードと選択済みレッスンをリセットする
            setIsSelectionMode(false);
            setSelectedLessons([]);
          } else {
            console.log('レッスン一覧: フォーカス時の自動更新はスキップします');
          }
        } catch (error) {
          console.error('レッスン一覧: フォーカス時の更新エラー', error);
        }
      };
      
      refreshLessonsOnFocus();
      
      return () => {
        // クリーンアップ関数
      };
    }, [auth.currentUser?.uid, fetchLessons, params.isNewlyCreated])
  );

  // 検索テキスト変更ハンドラ
  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  const handleDetailedSearchChange = (value: boolean) => {
    setIsDetailedSearch(value);
  };

  const handleTagsVisibleChange = (value: boolean) => {
    setIsTagsVisible(value);
  };

  // タグ選択ハンドラ
  const handleTagPress = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // タブ切り替えハンドラ
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // タブ切り替え時に選択モードをリセット
    setIsSelectionMode(false);
    setSelectedLessons([]);
  };

  // 選択モードの切り替え
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedLessons([]);
  };

  // レッスンの選択状態を切り替える
  const toggleLessonSelection = (lessonId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedLessons([lessonId]);
    } else {
      setSelectedLessons(prev => 
        prev.includes(lessonId)
          ? prev.filter(id => id !== lessonId)
          : [...prev, lessonId]
      );
    }
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
      pathname: '/(generate-tasks)' as any,
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
      pathname: '/(consult-ai)' as any,
      params: { 
        lessonIds: selectedLessons.join(',')
      }
    });
  };

  // 選択したレッスンをアーカイブ
  const archiveSelectedLessons = async () => {
    if (selectedLessons.length === 0) return;
    
    try {
      // 各レッスンをアーカイブ
      for (const lessonId of selectedLessons) {
        await archiveLesson(lessonId);
      }
      
      // 選択モードを解除
      setIsSelectionMode(false);
      setSelectedLessons([]);
      
      // レッスンデータを再取得
      if (auth.currentUser) {
        await fetchLessons(auth.currentUser.uid);
      }
    } catch (error) {
      console.error('レッスンアーカイブエラー:', error);
    }
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

  // アーカイブセクションの展開状態を管理
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  // セクションの展開/折りたたみを切り替え
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // コンテンツの表示部分の高さを計算（ヘッダーとフッターの高さを考慮）
  const HEADER_HEIGHT = 130; // 検索バーとセグメントコントロールの高さの概算
  const contentHeight = dimensions.height - HEADER_HEIGHT - TOTAL_TAB_HEIGHT - insets.top;
  
  // アーカイブ一覧のレンダリング
  const renderArchivedLessons = () => {
    console.log("renderArchivedLessons実行: ", {
      allLength: archivedLessons.all.length,
      sectionsLength: archivedSections.length
    });
    
    if (archivedLessons.all.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="archive" size={100} color="#CCCCCC" style={styles.emptyIcon} />
            <View style={[styles.iconBubble, { backgroundColor: LESSON_THEME_COLOR }]}>
              <MaterialIcons name="archive" size={24} color="#FFFFFF" />
            </View>
          </View>
          
          <Text style={styles.emptyText}>アーカイブされたレッスンがありません</Text>
          
          <Text style={styles.emptySubText}>
            レッスン詳細画面からレッスンをアーカイブできます
          </Text>
        </View>
      );
    }
    
    // セクションリストのデバッグログ
    console.log(`セクションリスト表示準備: ${archivedSections.length}セクション`);

    // 月ごとのフォルダをレンダリング
    return (
      <ScrollView
        contentContainerStyle={styles.archiveListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[LESSON_THEME_COLOR]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {archivedSections.map(section => {
          const isExpanded = expandedSections.includes(section.title);
          
          return (
            <View key={section.title} style={styles.monthSection}>
              {/* 月ヘッダー（フォルダー） - タップで開閉 */}
              <TouchableOpacity
                style={styles.monthHeader}
                onPress={() => toggleSection(section.title)}
                activeOpacity={0.7}
              >
                <View style={styles.monthHeaderLeft}>
                  <MaterialIcons 
                    name={isExpanded ? "folder-open" : "folder"} 
                    size={24} 
                    color="#4285F4" 
                    style={styles.folderIcon} 
                  />
                  <Text style={styles.monthHeaderText}>{section.title}</Text>
                </View>
                <View style={styles.monthHeaderRight}>
                  <Text style={styles.monthHeaderCount}>{section.data.length}件</Text>
                  <MaterialIcons
                    name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={24}
                    color="#5F6368"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </TouchableOpacity>
              
              {/* 折りたたみ可能なレッスン一覧 */}
              <Collapsible collapsed={!isExpanded} duration={300}>
                <View style={styles.monthContent}>
                  {section.data.map(item => (
                    <View key={item.id} style={[styles.lessonCardContainer, styles.folderItemContainer]}>
                      <View style={styles.folderItemLine} />
                      <LessonCard
                        lesson={item}
                        onPress={() => {
                          if (isSelectionMode) {
                            toggleLessonSelection(item.id);
                          } else {
                            router.push(`/lesson-detail/${item.id}`);
                          }
                        }}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedLessons.includes(item.id)}
                        onLongPress={() => toggleLessonSelection(item.id)}
                        onSelect={() => toggleLessonSelection(item.id)}
                      />
                    </View>
                  ))}
                </View>
              </Collapsible>
            </View>
          );
        })}
        
        {/* 下部の余白 */}
        <View style={{ height: isSelectionMode ? bottomPadding + 80 : bottomPadding }} />
      </ScrollView>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F6F7F9' }]}>
      <View style={{ flex: 1 }}>
        {/* 検索バーとタグフィルター - 常に表示 */}
        <View style={styles.searchHeaderContainer}>
          <View style={styles.searchCard}>
            <SearchBar
              searchText={searchText}
              onSearchChange={handleSearchChange}
              isDetailedSearch={isDetailedSearch}
              onDetailedSearchChange={handleDetailedSearchChange}
              isTagsVisible={isTagsVisible}
              onTagsVisibleChange={handleTagsVisibleChange}
              theme={theme}
            />
            {filteredLessons.length > 0 && activeTab === 'active' && isTagsVisible && (
              <TagFilter
                availableTags={uniqueTags}
                selectedTags={selectedTags}
                onTagPress={handleTagPress}
                theme={theme}
              />
            )}
          </View>
        </View>

        {/* タブナビゲーション - 常に表示 */}
        <View style={styles.segmentedControlContainer}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'active' && styles.segmentButtonActive
              ]}
              onPress={() => handleTabChange('active')}
            >
              <MaterialIcons 
                name="list" 
                size={18} 
                color={activeTab === 'active' ? '#FFFFFF' : '#8E8E93'} 
                style={styles.segmentIcon}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  activeTab === 'active' && styles.segmentButtonTextActive
                ]}
              >
                レッスン
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'archive' && styles.segmentButtonActive
              ]}
              onPress={() => handleTabChange('archive')}
            >
              <MaterialIcons 
                name="archive" 
                size={18} 
                color={activeTab === 'archive' ? '#FFFFFF' : '#8E8E93'} 
                style={styles.segmentIcon}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  activeTab === 'archive' && styles.segmentButtonTextActive
                ]}
              >
                アーカイブ
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.content, { minHeight: contentHeight }]}>
          {isSelectionMode && (
            <View style={styles.selectionModeControlContainer}>
              <TouchableOpacity 
                style={styles.selectionModeButton}
                onPress={toggleSelectionMode}
              >
                <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.selectionModeButtonText}>選択解除</Text>
              </TouchableOpacity>
              <Text style={styles.selectionCountText}>
                {selectedLessons.length}件選択中
              </Text>
            </View>
          )}

          {/* アクティブレッスンタブのコンテンツ */}
          {activeTab === 'active' && (
            <>
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
                  style={styles.lessonsList}
                  contentContainerStyle={[
                    styles.lessonsListContent,
                    isSelectionMode && { paddingBottom: 80 }
                  ]}
                  refreshControl={
                    <RefreshControl 
                      refreshing={refreshing} 
                      onRefresh={onRefresh}
                      colors={[LESSON_THEME_COLOR]} 
                    />
                  }
                  showsVerticalScrollIndicator={false}
                >
                  <View>
                    {filteredLessons.map((lesson, index) => (
                      <View key={lesson.id} style={styles.lessonCardContainer}>
                        <LessonCard
                          lesson={lesson}
                          onPress={() => {
                            if (isSelectionMode) {
                              toggleLessonSelection(lesson.id);
                            } else {
                              router.push(`/lesson-detail/${lesson.id}`);
                            }
                          }}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedLessons.includes(lesson.id)}
                          onLongPress={() => toggleLessonSelection(lesson.id)}
                          onSelect={() => toggleLessonSelection(lesson.id)}
                        />
                      </View>
                    ))}
                  </View>
                  
                  {/* 下部の余白 */}
                  <View style={{ height: isSelectionMode ? bottomPadding + 80 : bottomPadding }} />
                </ScrollView>
              )}
            </>
          )}

          {/* アーカイブタブのコンテンツ */}
          {activeTab === 'archive' && (
            <>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={LESSON_THEME_COLOR} />
                  <Text style={styles.loadingText}>アーカイブデータを読み込み中...</Text>
                </View>
              ) : (
                renderArchivedLessons()
              )}
            </>
          )}
          
          {isSelectionMode && selectedLessons.length > 0 && (
            <View style={{
              position: 'absolute',
              bottom: 90,
              left: 0,
              right: 0,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              borderTopColor: 'transparent',
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              paddingVertical: 12,
              paddingHorizontal: 16,
              shadowColor: 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
              elevation: 0,
              zIndex: 9999,
            }}>
              <View style={{ 
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%',
                marginBottom: 8,
              }}>
                <TouchableOpacity 
                  style={[styles.selectionActionButton, { 
                    backgroundColor: '#999999',
                  }]}
                  disabled={true}
                >
                  <MaterialIcons name="assignment" size={20} color="#FFFFFF" />
                  <Text style={styles.selectionActionText}>練習生成</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.selectionActionButton, { backgroundColor: '#7C4DFF' }]}
                  onPress={consultAIWithSelectedLessons}
                >
                  <MaterialIcons name="smart-toy" size={20} color="#FFFFFF" />
                  <Text style={styles.selectionActionText}>AIに相談</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.selectionActionButton, { backgroundColor: '#34A853' }]}
                  onPress={archiveSelectedLessons}
                >
                  <MaterialIcons name="archive" size={20} color="#FFFFFF" />
                  <Text style={styles.selectionActionText}>アーカイブ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
      
      {/* 新規レッスン追加ボタン（アクティブタブでのみ表示） */}
      {!isSelectionMode && activeTab === 'active' && filteredLessons.length > 0 && (
        <TouchableOpacity
          style={[
            styles.addButton, 
            { 
              backgroundColor: LESSON_THEME_COLOR,
              bottom: 24
            }
          ]}
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  // 検索ヘッダー
  searchHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  // セグメントコントロール
  segmentedControlContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginTop: 8,
    width: '100%',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF1',
    borderRadius: 18,
    padding: 4,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.07)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  segmentButtonActive: {
    backgroundColor: LESSON_THEME_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(66,133,244,0.18)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // 選択モード
  selectionModeControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectionModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  selectionModeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#5F6368',
  },
  selectionCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4285F4',
  },
  // レッスンリスト
  lessonsList: {
    flex: 1,
  },
  lessonsListContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  lessonCardContainer: {
    marginBottom: 14,
    width: '100%',
  },
  // アーカイブリスト
  archiveListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  monthSection: {
    marginBottom: 8,
  },
  monthHeader: {
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 16,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#4285F4',
    shadowColor: '#90CAF9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
    elevation: 3,
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    marginRight: 8,
  },
  monthHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
  },
  monthHeaderCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5F6368',
  },
  monthContent: {
    paddingLeft: 16,
    paddingTop: 8,
  },
  // ローディング
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5F6368',
    textAlign: 'center',
  },
  // 空の状態
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  emptyIcon: {
    opacity: 0.5,
  },
  iconBubble: {
    position: 'absolute',
    right: -10,
    bottom: -5,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 28,
  },
  emptySubText: {
    fontSize: 16,
    color: '#5F6368',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  // FAB
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  // 選択アクション
  selectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectionActionText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  folderItemContainer: {
    marginLeft: 12,
    position: 'relative',
  },
  folderItemLine: {
    position: 'absolute',
    left: -12,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(66, 133, 244, 0.3)',
    zIndex: 1,
  },
});