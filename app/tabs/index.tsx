import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLessonStore } from '../../store/lessons';
import { useTaskStore } from '../../store/tasks';
import { useAuthStore } from '../../store/auth';
import { useTheme } from '../../theme/index';
import HomeHeader from '../features/home/components/HomeHeader';
import TaskCard from '../features/tasks/components/TaskCard';
import EmptyOrLoading from '../features/home/components/EmptyOrLoading';
import { FadeIn } from '../../components/AnimatedComponents';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getUserChatRooms, ChatRoom as ChatRoomType } from '../../services/chatRoomService';
import { auth } from '../config/firebase';
import { getRecommendedTasks } from '../../services/difyService';

export default function HomeScreen() {
  // 画面サイズを取得
  const { width, height } = useWindowDimensions();
  const isSmallDevice = width < 375; // iPhone SE等の小型デバイス
  const isLargeDevice = width >= 428; // iPhone Max等の大型デバイス

  const [isLoading, setIsLoading] = useState(false);
  const { getFavorites } = useLessonStore();
  const { tasks, fetchTasks, generateTasksFromLessons, getMonthlyPracticeCount, getPinnedTasks, toggleTaskCompletion } = useTaskStore();
  const { user } = useAuthStore();
  const favoriteLesson = getFavorites();
  const theme = useTheme();
  
  // カテゴリ情報の状態
  const [monthlyPracticeCount, setMonthlyPracticeCount] = useState(0);
  const [monthlyTasksCompleted, setMonthlyTasksCompleted] = useState(0);
  const [monthlyTasksTotal, setMonthlyTasksTotal] = useState(0);
  
  // ピン留めされたタスク
  const pinnedTasks = getPinnedTasks().slice(0, 3); // 最大3つまで表示
  
  // スクロール参照
  const scrollViewRef = useRef<ScrollView>(null);

  // チャットルームデータの状態
  const [recentChatRooms, setRecentChatRooms] = useState<ChatRoomType[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  // AIレコメンデーションタスクの状態
  const [recommendedTasks, setRecommendedTasks] = useState<any[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // 最新のレッスン、タスク、チャットルームを取得
  const latestLesson = useLessonStore(state => state.lessons[0]);
  const latestTask = tasks[0];
  const latestChatRoom = recentChatRooms[0];

  // 画面サイズに応じたスタイルを計算
  const dynamicStyles = useMemo(() => {
    return {
      // カードのパディング
      cardPadding: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
      
      // フォントサイズ
      titleFontSize: isSmallDevice ? 16 : isLargeDevice ? 20 : 18,
      subtitleFontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
      taskTitleFontSize: isSmallDevice ? 14 : isLargeDevice ? 16 : 15,
      taskDescriptionFontSize: isSmallDevice ? 12 : isLargeDevice ? 14 : 13,
      
      // アイコンサイズ
      iconSize: isSmallDevice ? 18 : isLargeDevice ? 24 : 20,
      checkboxSize: isSmallDevice ? 20 : isLargeDevice ? 24 : 22,
      
      // マージン
      contentMargin: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
      itemSpacing: isSmallDevice ? 8 : isLargeDevice ? 12 : 10,
      
      // 進捗バーの高さ
      progressBarHeight: isSmallDevice ? 6 : isLargeDevice ? 10 : 8,
    };
  }, [isSmallDevice, isLargeDevice, width, height]);

  // タスクとレッスンデータの読み込み
  useEffect(() => {
    if (user) {
      loadData();
      loadChatRooms(); // チャットルームも読み込む
    }
  }, [user]);

  // タスクデータが変更されたときにカテゴリ情報を更新
  useEffect(() => {
    // タスクの集計
    let monthlyCompleted = 0;
    let monthlyTotal = 0;
    
    // 現在の月を取得
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    tasks.forEach(task => {
      // 今月のタスクを抽出
      let taskDate = null;
      if (task.dueDate) {
        // Firebaseのタイムスタンプかどうかチェック
        if (typeof task.dueDate === 'object' && 'seconds' in task.dueDate) {
          taskDate = new Date(task.dueDate.seconds * 1000);
        } else {
          taskDate = new Date(task.dueDate);
        }
      }
      
      if (taskDate && taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear) {
        monthlyTotal++;
        if (task.completed) {
          monthlyCompleted++;
        }
      }
    });
    
    setMonthlyTasksCompleted(monthlyCompleted);
    setMonthlyTasksTotal(monthlyTotal);
    
    // 今月の練習日数を取得
    const monthlyCount = getMonthlyPracticeCount();
    setMonthlyPracticeCount(monthlyCount);
  }, [tasks, getMonthlyPracticeCount]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await fetchTasks(user?.uid || '');
      setIsLoading(false);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      setIsLoading(false);
    }
  };

  // 課題を自動生成する関数
  const handleGenerateTasks = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    try {
      setIsLoading(true);
      await generateTasksFromLessons(user.uid, 3); // 直近3か月のレッスンから課題を生成
      setIsLoading(false);
      Alert.alert('成功', 'レッスンから新しい課題を生成しました');
    } catch (error) {
      console.error('課題生成エラー:', error);
      setIsLoading(false);
      Alert.alert('エラー', '課題の生成に失敗しました');
    }
  };

  const navigateToAllTasks = () => {
    router.push('/tabs/task' as any);
  };

  const navigateToTaskDetail = (taskId: string) => {
    router.push({
      pathname: '/tabs/task/[id]',
      params: { id: taskId }
    } as any);
  };

  const navigateToChatRoom = (chatId: string) => {
    // チャットルームへの遷移処理（実際の遷移先は適宜調整）
    router.push({
      pathname: '/chat/[id]',
      params: { id: chatId }
    } as any);
  };

  // タブ間の進捗バッジ型式のコンポーネント
  const ProgressBadge = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number | string, color: string }) => (
    <View style={[styles.progressBadge, { padding: dynamicStyles.cardPadding * 0.5 }]}>
      <View style={[styles.progressBadgeIcon, { 
        backgroundColor: color + '20',
        width: dynamicStyles.iconSize * 1.6,
        height: dynamicStyles.iconSize * 1.6,
        borderRadius: dynamicStyles.iconSize * 0.8,
      }]}>
        {icon}
      </View>
      <Text style={[styles.progressBadgeValue, { fontSize: dynamicStyles.subtitleFontSize + 2 }]}>{value}</Text>
      <Text style={[styles.progressBadgeLabel, { fontSize: dynamicStyles.subtitleFontSize - 2 }]}>{label}</Text>
    </View>
  );

  // 進捗バーをレンダリング
  const renderProgressBar = () => {
    const percentage = monthlyTasksTotal > 0 ? (monthlyTasksCompleted / monthlyTasksTotal) * 100 : 0;
    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarTrack, { height: dynamicStyles.progressBarHeight }]}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${percentage}%`,
                backgroundColor: theme.colors.primary,
                height: dynamicStyles.progressBarHeight
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressPercentage, { fontSize: dynamicStyles.subtitleFontSize + 2 }]}>{Math.round(percentage)}%</Text>
      </View>
    );
  };

  // 現在の日付を取得して表示
  const getFormattedDate = () => {
    const now = new Date();
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const month = months[now.getMonth()];
    const day = now.getDate();
    return `${month}${day}日`;
  };

  // チャットルームのアイコンを取得する関数
  const getChatRoomIcon = (type: string) => {
    switch (type) {
      case 'tone':
        return <MaterialIcons name="music-note" size={dynamicStyles.iconSize} color="#9C27B0" />;
      case 'vibrato':
        return <MaterialCommunityIcons name="sine-wave" size={dynamicStyles.iconSize} color="#2196F3" />;
      case 'tonguing':
        return <FontAwesome5 name="wave-square" size={dynamicStyles.iconSize - 2} color="#FF9800" />;
      default:
        return <MaterialIcons name="chat" size={dynamicStyles.iconSize} color="#7C4DFF" />;
    }
  };

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // コンパクトなピックアップタスクカード
  const CompactTaskCard = ({ task }: { task: any }) => {
    // タスクカードをタップしたときの処理
    const handleCardPress = () => {
      // タスク詳細画面に遷移
      navigateToTaskDetail(task.id);
    };

    // 日付をフォーマット
    const formatDueDate = () => {
      if (!task.dueDate) return null;
      
      let dueDate;
      if (typeof task.dueDate === 'object' && 'seconds' in task.dueDate) {
        dueDate = new Date(task.dueDate.seconds * 1000);
      } else {
        dueDate = new Date(task.dueDate);
      }
      
      const month = dueDate.getMonth() + 1;
      const day = dueDate.getDate();
      return `${month}/${day}`;
    };

    // タスクに関連するアイコンを取得
    const getTaskIcon = () => {
      if (task.tags && task.tags.includes("練習")) {
        return <MaterialIcons name="music-note" size={dynamicStyles.iconSize - 2} color="#4CAF50" />;
      } else if (task.tags && task.tags.includes("理論")) {
        return <MaterialIcons name="school" size={dynamicStyles.iconSize - 2} color="#4CAF50" />;
      } else if (task.tags && task.tags.includes("テクニック")) {
        return <MaterialIcons name="speed" size={dynamicStyles.iconSize - 2} color="#4CAF50" />;
      }
      return null;
    };

    // タスクの背景色を取得
    const getTaskColor = () => {
      if (task.completed) {
        return "#4CAF50"; // 完了したタスクは緑色
      }
      if (task.tags && task.tags.includes("練習")) {
        return "#4CAF50";
      } else if (task.tags && task.tags.includes("理論")) {
        return "#4CAF50";
      } else if (task.tags && task.tags.includes("テクニック")) {
        return "#4CAF50";
      }
      return "#4CAF50"; // デフォルトカラー
    };

    const dueDate = formatDueDate();
    const taskIcon = getTaskIcon();
    const taskColor = getTaskColor();

    return (
      <TouchableOpacity
        style={[
          styles.flashCard, 
          { 
            marginBottom: dynamicStyles.itemSpacing * 1.5,
            overflow: 'hidden', // カラーバーがはみ出ないように
          }
        ]}
        onPress={handleCardPress}
        activeOpacity={0.6} // タップ時の透明度を調整して、タップフィードバックを強化
      >
        {/* 左側: カラーバー */}
        <View style={[
          styles.cardColorBar, 
          { 
            backgroundColor: task.completed ? theme.colors.primary : taskColor,
            opacity: task.completed ? 1 : 0.7, // 完了していない場合は少し透明に
          }
        ]} />
        
        <View style={[styles.flashCardContent, { padding: dynamicStyles.cardPadding }]}>
          {/* 上部: タスク情報 */}
          <View style={styles.taskContent}>
            <View style={styles.taskTitleRow}>
              <Text 
                style={[
                  styles.taskTitle, 
                  { fontSize: dynamicStyles.taskTitleFontSize },
                  task.completed && styles.taskTitleCompleted
                ]}
                numberOfLines={1}
              >
                {task.title}
              </Text>
              {task.isPinned && (
                <MaterialIcons name="star" size={dynamicStyles.iconSize - 4} color="#FFC107" style={styles.pinnedIcon} />
              )}
            </View>
            
            {/* 下部: メタデータ */}
            <View style={styles.taskMetaRow}>
              {taskIcon && (
                <View style={[styles.taskIconContainer, { 
                  backgroundColor: `${taskColor}15`, // 15% 透明度の背景
                  padding: 4,
                  borderRadius: 4,
                  marginRight: 4
                }]}>
                  {taskIcon}
                </View>
              )}
              
              {task.description ? (
                <Text 
                  style={[
                    styles.taskDescription,
                    { fontSize: dynamicStyles.taskDescriptionFontSize }
                  ]}
                  numberOfLines={1}
                >
                  {task.description}
                </Text>
              ) : null}
              
              {dueDate && (
                <Text style={[
                  styles.taskDate, 
                  { 
                    fontSize: dynamicStyles.taskDescriptionFontSize - 1,
                    backgroundColor: task.completed ? `${theme.colors.primary}15` : '#f5f5f5',
                    color: task.completed ? theme.colors.primary : '#888',
                    padding: 2,
                    paddingHorizontal: 4,
                    borderRadius: 4,
                    marginLeft: 4
                  }
                ]}>
                  {dueDate}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* 右側: 矢印 */}
        <View style={styles.taskRightContent}>
          <MaterialIcons name="chevron-right" size={dynamicStyles.iconSize} color="#CCCCCC" />
        </View>
      </TouchableOpacity>
    );
  };

  // チャットルームデータを読み込む
  const loadChatRooms = async () => {
    if (!user) return;
    
    try {
      setIsLoadingChats(true);
      console.log('ホーム画面: チャットルーム読み込み開始');
      
      const rooms = await getUserChatRooms(user.uid);
      console.log(`ホーム画面: チャットルーム取得完了 (${rooms.length}件)`);
      
      // 最新の3件だけを表示
      setRecentChatRooms(rooms.slice(0, 3));
    } catch (error) {
      console.error('ホーム画面: チャットルーム取得エラー:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // AIレコメンデーションを取得
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      
      setIsLoadingRecommendations(true);
      try {
        const recommendations = await getRecommendedTasks(user.uid);
        setRecommendedTasks(recommendations.slice(0, 3)); // 最大3件まで表示
      } catch (error) {
        console.error('AIレコメンデーションの取得に失敗しました:', error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  // フローティングボタンの表示
  const renderFloatingButtons = () => {
    const buttons = [
      {
        icon: "music-note",
        label: "レッスン",
        onPress: () => router.push('/lesson-form'),
        color: theme.colors.primary,
      },
      {
        icon: "assignment",
        label: "タスク",
        onPress: () => router.push('/task-form'),
        color: theme.colors.secondary,
      },
      {
        icon: "chat",
        label: "チャット",
        onPress: () => router.push('/chat-room-form'),
        color: theme.colors.tertiary || '#7C4DFF',
      },
    ];

    return (
      <View style={styles.floatingButtonsContainer}>
        <View style={styles.floatingButtonsRow}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={button.icon}
              style={[
                styles.floatingButton,
                {
                  backgroundColor: button.color,
                  marginLeft: index > 0 ? 8 : 0,
                },
              ]}
              onPress={button.onPress}
            >
              <MaterialIcons name={button.icon as any} size={24} color="white" />
              <Text style={styles.floatingButtonLabel}>{button.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // クイックアクセスカード
  const QuickAccessCard = ({ title, icon, onPress, subtitle }: { 
    title: string; 
    icon: React.ReactNode; 
    onPress: () => void;
    subtitle?: string;
  }) => {
    return (
      <TouchableOpacity
        style={[styles.quickAccessCard, { backgroundColor: theme.colors.cardElevated }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.quickAccessIconContainer}>
          {icon}
        </View>
        <View style={styles.quickAccessContent}>
          <Text style={[styles.quickAccessTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.quickAccessSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.backgroundSecondary }]} edges={['top']}>
      <StatusBar barStyle={theme.colors.text === '#E8EAED' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.backgroundSecondary} />
      
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.headerContainer, { backgroundColor: 'transparent' }]}>
          <FadeIn duration={800}>
            <HomeHeader />
          </FadeIn>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: 100 } // フローティングボタンの分の余白を追加
          ]} 
          showsVerticalScrollIndicator={false}
        >
          {/* AIレコメンデーションセクション */}
          <View style={[styles.sectionContainer, { paddingHorizontal: dynamicStyles.contentMargin }]}>
            <View style={[styles.sectionHeaderContainer, { marginBottom: dynamicStyles.itemSpacing * 1.5 }]}>
              <Text style={[styles.sectionTitle, { fontSize: dynamicStyles.titleFontSize }]}>
                AIおすすめの練習メニュー
              </Text>
            </View>

            {isLoadingRecommendations ? (
              <View style={[styles.emptyPinnedContainer, { padding: dynamicStyles.cardPadding }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.emptyPinnedText, { fontSize: dynamicStyles.subtitleFontSize, marginTop: dynamicStyles.itemSpacing }]}>
                  おすすめの練習メニューを生成中...
                </Text>
              </View>
            ) : recommendedTasks.length > 0 ? (
              recommendedTasks.map((task, index) => (
                <TaskCard key={index} task={task} />
              ))
            ) : (
              <View style={[styles.emptyPinnedContainer, { padding: dynamicStyles.cardPadding + 4 }]}>
                <MaterialIcons name="auto-awesome" size={dynamicStyles.iconSize * 1.5} color={theme.colors.borderLight} />
                <Text style={[styles.emptyPinnedText, { fontSize: dynamicStyles.subtitleFontSize, marginTop: dynamicStyles.itemSpacing }]}>
                  AIがあなたに最適な練習メニューを提案します
                </Text>
              </View>
            )}
          </View>

          {/* クイックアクセスセクション */}
          <View style={[styles.sectionContainer, { paddingHorizontal: dynamicStyles.contentMargin }]}>
            <View style={[styles.sectionHeaderContainer, { marginBottom: dynamicStyles.itemSpacing * 1.5 }]}>
              <Text style={[styles.sectionTitle, { fontSize: dynamicStyles.titleFontSize }]}>
                クイックアクセス
              </Text>
            </View>

            {latestLesson && (
              <QuickAccessCard
                title="最新のレッスン"
                subtitle={latestLesson.title}
                icon={<MaterialIcons name="music-note" size={24} color={theme.colors.primary} />}
                onPress={() => router.push(`/lesson-detail/${latestLesson.id}`)}
              />
            )}

            {latestTask && (
              <QuickAccessCard
                title="最新のタスク"
                subtitle={latestTask.title}
                icon={<MaterialIcons name="assignment" size={24} color={theme.colors.primary} />}
                onPress={() => router.push(`/task-detail/${latestTask.id}`)}
              />
            )}

            {latestChatRoom && (
              <QuickAccessCard
                title="最新のチャットルーム"
                subtitle={latestChatRoom.title}
                icon={<MaterialIcons name="chat" size={24} color={theme.colors.primary} />}
                onPress={() => router.push(`/chat-room/${latestChatRoom.id}`)}
              />
            )}
          </View>
        </ScrollView>

        {renderFloatingButtons()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    zIndex: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  // 改善した進捗カードスタイル
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontWeight: '700',
  },
  progressSubtitle: {
    color: '#666',
    fontWeight: '500',
  },
  overallProgressContainer: {
  },
  progressSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSectionTitle: {
    color: '#666',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBarTrack: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    borderRadius: 4,
  },
  progressPercentage: {
    fontWeight: '600',
    color: '#333',
  },
  progressDetail: {
    color: '#666',
  },
  progressBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBadge: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: '#f8f8f8',
  },
  progressBadgeIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBadgeValue: {
    fontWeight: '700',
    marginBottom: 2,
  },
  progressBadgeLabel: {
    color: '#666',
  },
  // セクションコンテナ改善
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontWeight: '600',
    marginRight: 4,
  },
  // コンパクトタスクカード
  tasksContainer: {
    width: '100%',
  },
  flashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E8E8E8',
  },
  cardColorBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  flashCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontWeight: '600',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconContainer: {
    marginRight: 6,
  },
  taskDescription: {
    flex: 1,
  },
  taskDate: {
    color: '#888',
    marginLeft: 6,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskRightContent: {
    marginLeft: 8,
  },
  pinnedIcon: {
    marginLeft: 6,
  },
  emptyTaskSlot: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotText: {
    color: '#999',
  },
  // 空の状態
  emptyPinnedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyPinnedText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  goToTaskButton: {
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  goToTaskButtonText: {
    fontWeight: '600',
    color: 'white',
  },
  taskStatusIndicator: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  floatingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    maxWidth: '33%',
  },
  floatingButtonLabel: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  quickAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickAccessIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickAccessContent: {
    flex: 1,
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickAccessSubtitle: {
    fontSize: 14,
  },
});
