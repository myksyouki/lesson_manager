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
import { auth } from '../../config/firebase';
import { getPracticeMenus, PracticeMenu } from '../../services/practiceMenuService';
import { getCurrentUserProfile } from '../../services/userProfileService';
import { LinearGradient } from 'expo-linear-gradient';

// PracticeMenu型のサンプルデータ
const sampleRecommendedMenus = [
  {
    id: 'menu-1',
    title: '基礎力アップメニュー',
    description: '音の基礎を徹底的に強化するためのメニューです。',
    instrument: 'サックス',
    category: '基礎練習',
    difficulty: '初級',
    duration: 30,
    tags: ['ロングトーン', '音階', 'タンギング'],
    steps: [
      { id: 's1', title: 'ロングトーン', description: '各音を10秒ずつキープ', duration: 10, orderIndex: 1 },
      { id: 's2', title: '音階練習', description: 'Cメジャースケールをゆっくり演奏', duration: 10, orderIndex: 2 },
      { id: 's3', title: 'タンギング', description: '4分音符でタンギング練習', duration: 10, orderIndex: 3 },
    ],
    sheetMusicUrl: '',
    videoUrl: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'menu-2',
    title: 'リズム感強化メニュー',
    description: 'リズム感を鍛えるための集中メニュー。',
    instrument: 'サックス',
    category: 'リズム',
    difficulty: '中級',
    duration: 20,
    tags: ['リズム', 'メトロノーム'],
    steps: [
      { id: 's1', title: 'メトロノーム練習', description: '60BPMで4分音符を演奏', duration: 10, orderIndex: 1 },
      { id: 's2', title: 'リズムパターン', description: '8分音符・3連符のパターン練習', duration: 10, orderIndex: 2 },
    ],
    sheetMusicUrl: '',
    videoUrl: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function HomeScreen() {
  // 画面サイズを取得
  const { width, height } = useWindowDimensions();
  const isSmallDevice = width < 375; // iPhone SE等の小型デバイス
  const isLargeDevice = width >= 428; // iPhone Max等の大型デバイス

  const [isLoading, setIsLoading] = useState(false);
  const { getFavorites, fetchLessons } = useLessonStore();
  const { tasks, fetchTasks, generateTasksFromLessons, getMonthlyPracticeCount, getPinnedTasks, toggleTaskCompletion, addTask } = useTaskStore();
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

  // Firestore登録済み練習メニューの状態
  const [practiceMenus, setPracticeMenus] = useState<PracticeMenu[]>([]);
  const [isLoadingPracticeMenus, setIsLoadingPracticeMenus] = useState(false);

  // 最新のタスク、チャットルームを取得
  const latestTask = tasks[0];
  const latestChatRoom = recentChatRooms[0];

  // レッスン一覧を取得し、日付降順で最新レッスンを選択
  const lessons = useLessonStore(state => state.lessons);
  const latestLesson = useMemo(() => {
    if (lessons.length === 0) return undefined;
    // dateは'YYYY-MM-DD'形式の文字列を想定
    const sorted = [...lessons].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0];
  }, [lessons]);

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
        // 文字列としてのdueDateをDateに変換
        taskDate = new Date(task.dueDate);
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
      if (user) {
        // タスクとレッスンを読み込む
        await Promise.all([
          fetchTasks(user.uid),
          fetchLessons(user.uid)
        ]);
      }
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
      pathname: '/task-detail',
      params: { id: taskId }
    } as any);
  };

  const navigateToChatRoom = (chatId: string) => {
    router.push({
      pathname: '/chat-room',
      params: { id: chatId }
    } as any);
  };

  const navigateToLessonDetail = (lessonId: string) => {
    router.push({
      pathname: '/lesson-detail/[id]',
      params: { id: lessonId }
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
      const dateObj = new Date(task.dueDate);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
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
      
      // 作成日時(createdAt)の降順でソートして最新作成チャットルームを先頭にする
      const sorted = rooms.slice().sort((a, b) => {
        const getMillis = (ts: any) => ts.toMillis ? ts.toMillis() : (ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6);
        return getMillis(b.createdAt) - getMillis(a.createdAt);
      });
      // 最新の3件を表示
      setRecentChatRooms(sorted.slice(0, 3));
    } catch (error) {
      console.error('ホーム画面: チャットルーム取得エラー:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Firestore登録済み練習メニューを取得する関数
  const loadPracticeMenus = async () => {
    if (!user) return;
    setIsLoadingPracticeMenus(true);
    try {
      // ユーザープロフィールから楽器 ID を取得
      const profile = await getCurrentUserProfile();
      const instrument = profile?.selectedInstrument;
      if (!instrument) {
        setPracticeMenus([]);
        return;
      }
      // Firestore から全メニューを取得し、楽器ごとにフィルタ
      const menus = await getPracticeMenus();
      const filtered = menus.filter(menu => menu.instrument === instrument);
      // ランダム表示するためにシャッフル
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      setPracticeMenus(shuffled.slice(0, 3)); // 先頭3件を表示
    } catch (error) {
      console.error('練習メニューの取得に失敗しました:', error);
    } finally {
      setIsLoadingPracticeMenus(false);
    }
  };

  // Firestore登録済み練習メニューを取得
  useEffect(() => {
    loadPracticeMenus();
  }, [user]);

  // 手動リフレッシュ処理
  const handleRefreshRecommendations = () => {
    loadPracticeMenus();
  };

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
        color: theme.colors.tertiary,
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

  // クイックアクセスボタン（縦並びカード）
  const QuickAccessColumn = () => {
    const quickAccess = [
      {
        title: 'レッスン',
        subtitle: latestLesson ? latestLesson.summary : 'なし',
        icon: <MaterialIcons name="music-note" size={28} color={theme.colors.primary} />,
        onPress: () => latestLesson && navigateToLessonDetail(latestLesson.id),
        disabled: !latestLesson,
      },
      {
        title: 'タスク',
        subtitle: latestTask ? latestTask.title : 'なし',
        icon: <MaterialIcons name="assignment" size={28} color={theme.colors.secondary} />,
        onPress: () => latestTask && navigateToTaskDetail(latestTask.id),
        disabled: !latestTask,
      },
      {
        title: 'チャット',
        subtitle: latestChatRoom ? latestChatRoom.title : 'なし',
        icon: <MaterialIcons name="chat" size={28} color={theme.colors.tertiary} />,
        onPress: () => latestChatRoom && navigateToChatRoom(latestChatRoom.id),
        disabled: !latestChatRoom,
      },
    ];
    return (
      <View style={styles.quickAccessColumn}>
        {quickAccess.map((item, idx) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.quickAccessCard, item.disabled && { opacity: 0.5 }]}
            onPress={item.onPress}
            disabled={item.disabled}
            activeOpacity={0.7}
          >
            <View style={styles.quickAccessCardIcon}>{item.icon}</View>
            <View style={styles.quickAccessCardContent}>
              <Text style={styles.quickAccessCardTitle}>{item.title}</Text>
              <Text style={styles.quickAccessCardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // AI練習メニューのカルーセルインジケーター
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);
  const menuScrollRef = useRef<ScrollView>(null);
  const handleMenuScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const width = event.nativeEvent.layoutMeasurement.width;
    const idx = Math.round(x / width);
    setActiveMenuIndex(idx);
  };

  // 画面幅を取得
  const { width: windowWidth } = useWindowDimensions();
  const horizontalContainerPadding = 12;
  const scrollContainerWidth = windowWidth - horizontalContainerPadding * 2;
  const practiceCardWidth = scrollContainerWidth * 0.88;

  // 練習メニューをタスクとして追加
  const handleAddPracticeMenu = async (menu: any) => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }
    try {
      await addTask({
        title: menu.title,
        description: menu.description,
        dueDate: new Date().toISOString(),
        completed: false,
        tags: menu.tags || [],
        isPinned: false,
        attachments: [],
        priority: 'medium',
        userId: user.uid,
        displayOrder: 0,
      });
      Alert.alert('追加', '練習タスクに追加しました');
    } catch (error) {
      console.error('練習タスク追加エラー:', error);
      Alert.alert('エラー', 'タスクの追加に失敗しました');
    }
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
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 120, paddingHorizontal: 12 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* AIおすすめ練習メニュー（カルーセル） */}
          <View style={[styles.sectionCard, { paddingLeft: 0, paddingRight: 0 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionCardTitle}>AIおすすめの練習メニュー</Text>
              <TouchableOpacity 
                onPress={handleRefreshRecommendations} 
                disabled={isLoadingPracticeMenus}
                style={styles.refreshButton}
              >
                <MaterialIcons 
                  name="refresh" 
                  size={dynamicStyles.iconSize} 
                  color={isLoadingPracticeMenus ? theme.colors.textTertiary : theme.colors.primary} 
                />
              </TouchableOpacity>
            </View>
            <View style={styles.sectionDivider} />
            {isLoadingPracticeMenus ? (
              <View style={styles.recommendLoadingBox}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.recommendLoadingText}>練習メニューを読み込み中...</Text>
              </View>
            ) : practiceMenus.length > 0 ? (
              <>
                <ScrollView
                  ref={menuScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleMenuScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={{}}
                >
                  {practiceMenus.map((menu, idx) => (
                    <View key={menu.id ?? `practice-menu-${idx}`} style={[styles.practiceMenuCardWrap, { width: scrollContainerWidth, alignItems: 'center' }]}> 
                      <View style={[styles.practiceMenuCard, { width: practiceCardWidth }]}> 
                        <TouchableOpacity style={styles.practiceMenuAddButton} onPress={() => handleAddPracticeMenu(menu)}>
                          <Text style={styles.practiceMenuAddButtonText}>追加</Text>
                        </TouchableOpacity>
                        {/* AIバッジ */}
                        <LinearGradient
                          colors={["#7C4DFF", "#4285F4"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.practiceMenuAIBadge}
                        >
                          <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.practiceMenuAIBadgeText}>AIおすすめ</Text>
                        </LinearGradient>
                        {/* タイトル */}
                        <Text style={styles.practiceMenuTitle}>{menu.title}</Text>
                        {/* 説明 */}
                        <Text style={styles.practiceMenuDescription}>{menu.description}</Text>
                        {/* ステップリスト */}
                        <View style={styles.practiceMenuStepList}>
                          {menu.steps.map((step, i) => (
                            <View key={step.id ?? `step-${i}`} style={styles.practiceMenuStepItem}>
                              <Text style={styles.practiceMenuStepNum}>{i + 1}.</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.practiceMenuStepTitle}>{step.title}</Text>
                                <Text style={styles.practiceMenuStepDesc}>{step.description} <Text style={styles.practiceMenuStepTime}>({step.duration}分)</Text></Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.carouselIndicatorRow}>
                  {practiceMenus.map((_, idx) => (
                    <View
                      key={`dot-${idx}`}
                      style={[styles.carouselDot, activeMenuIndex === idx && styles.carouselDotActive]}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.recommendLoadingBox}>
                <MaterialIcons name="auto-awesome" size={dynamicStyles.iconSize * 1.5} color={theme.colors.borderLight} />
                <Text style={styles.recommendLoadingText}>練習メニューがありません</Text>
              </View>
            )}
          </View>

          {/* クイックアクセス */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>クイックアクセス</Text>
            <View style={styles.sectionDivider} />
            <QuickAccessColumn />
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
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  quickAccessCardIcon: {
    marginRight: 14,
  },
  quickAccessCardContent: {
    flex: 1,
  },
  quickAccessCardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
  },
  quickAccessCardSubtitle: {
    fontSize: 13,
    color: '#888',
    maxWidth: 180,
  },
  refreshButton: {
    padding: 6,
    borderRadius: 20,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
    borderRadius: 1,
  },
  recommendCard: {
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  recommendTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
  },
  recommendContent: {
    color: '#555',
    fontSize: 13,
    lineHeight: 18,
  },
  recommendLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  recommendLoadingText: {
    color: '#888',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  quickAccessColumn: {
    flexDirection: 'column',
    gap: 12,
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  carouselCard: {
    marginHorizontal: 0,
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 0,
    paddingRight: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  practiceMenuCardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  practiceMenuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginVertical: 8,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 6,
    position: 'relative',
  },
  practiceMenuAIBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  practiceMenuAIBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  practiceMenuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
    lineHeight: 28,
  },
  practiceMenuDescription: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
  },
  practiceMenuStepList: {
    marginTop: 2,
  },
  practiceMenuStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  practiceMenuStepNum: {
    fontWeight: '700',
    color: '#7C4DFF',
    fontSize: 15,
    marginRight: 6,
    marginTop: 1,
  },
  practiceMenuStepTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: '#333',
    marginBottom: 1,
  },
  practiceMenuStepDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  practiceMenuStepTime: {
    color: '#7C4DFF',
    fontSize: 13,
    fontWeight: '600',
  },
  carouselIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  carouselDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 5,
  },
  carouselDotActive: {
    backgroundColor: '#7C4DFF',
    width: 24,
  },
  practiceMenuAddButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#7C4DFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  practiceMenuAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
