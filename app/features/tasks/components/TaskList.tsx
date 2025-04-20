import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Alert, Image } from 'react-native';
import { Task } from '../../../../types/_task';
import TaskCard from './TaskCard';
import { useTaskStore } from '../../../../store/tasks';
import { Ionicons, MaterialIcons, AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '../../../../config/firebase';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Animated, { FadeIn } from 'react-native-reanimated';

// タスクタブのテーマカラー
const TASK_THEME_COLOR = '#4CAF50';
const TASK_THEME_LIGHT = '#E8F5E9';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  error?: string | null;
  themeColor?: string;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, isLoading = false, error = null, themeColor = TASK_THEME_COLOR }) => {
  const [activeTab, setActiveTab] = useState<'incomplete' | 'completed'>('incomplete');
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([]);
  const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const { toggleTaskCompletion, fetchTasks, deleteTask, updateTaskOrder } = useTaskStore();

  useEffect(() => {
    // タスクを未完了／完了に分け、displayOrderとピン留め状態で並び替え
    const incompleteArr = tasks.filter(task => !task.completed);
    const completedArr = tasks.filter(task => task.completed);

    const sortByOrder = (a: Task, b: Task) => ( (a.displayOrder ?? 0) - (b.displayOrder ?? 0) );
    const sortAndGroup = (arr: Task[]) => {
      const pinned = arr.filter(task => task.isPinned).sort(sortByOrder);
      const notPinned = arr.filter(task => !task.isPinned).sort(sortByOrder);
      return [...pinned, ...notPinned];
    };

    setIncompleteTasks(sortAndGroup(incompleteArr));
    setCompletedTasks(sortAndGroup(completedArr));
  }, [tasks]);

  const handleToggleComplete = (taskId: string) => {
    toggleTaskCompletion(taskId);
    
    // 完了したタスクのIDを保存して、アニメーションを表示
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      setRecentlyCompletedTaskId(taskId);
      
      // 3秒後にリセット
      setTimeout(() => {
        setRecentlyCompletedTaskId(null);
      }, 3000);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const userId = auth.currentUser?.uid || 'guest-user';
      await fetchTasks(userId);
      console.log('タスク一覧を更新しました');
    } catch (error) {
      console.error('タスク更新エラー:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // タスクの選択を切り替える
  const handleSelectTask = (taskId: string) => {
    if (selectMode) {
      // すでに選択モードの場合は選択/選択解除
      setSelectedTaskIds(prevState => {
        if (prevState.includes(taskId)) {
          return prevState.filter(id => id !== taskId);
        } else {
          return [...prevState, taskId];
        }
      });
    } else {
      // 選択モードでない場合は選択モードに切り替え
      setSelectMode(true);
      setSelectedTaskIds([taskId]);
    }
  };

  // 選択モードをキャンセル
  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedTaskIds([]);
  };

  // 選択したタスクを削除
  const handleDeleteSelected = () => {
    if (selectedTaskIds.length === 0) return;

    Alert.alert(
      '選択したタスクの削除',
      `選択した${selectedTaskIds.length}件のタスクを削除しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedTaskIds) {
                await deleteTask(id);
              }

              // 削除後の状態更新
              if (activeTab === 'incomplete') {
                setIncompleteTasks(incompleteTasks.filter(task => !selectedTaskIds.includes(task.id)));
              } else {
                setCompletedTasks(completedTasks.filter(task => !selectedTaskIds.includes(task.id)));
              }

              // 選択モードを解除
              setSelectMode(false);
              setSelectedTaskIds([]);
            } catch (error) {
              Alert.alert('エラー', 'タスクの削除に失敗しました。');
            }
          }
        }
      ]
    );
  };

  // タスクの詳細画面に遷移
  const handleTaskPress = (taskId: string) => {
    router.push({
      pathname: '/task-detail' as any,
      params: { id: taskId }
    });
  };

  // すべてのタスクを選択
  const handleSelectAll = () => {
    const currentTasks = activeTab === 'incomplete' ? incompleteTasks : completedTasks;
    setSelectedTaskIds(currentTasks.map(task => task.id));
  };

  // 並び順を保存する関数
  const handleDragEnd = async ({ data }: { data: Task[] }) => {
    // UIの状態を即時更新
    if (activeTab === 'incomplete') {
      setIncompleteTasks(data);
    } else {
      setCompletedTasks(data);
    }

    try {
      // 各タスクに順序情報（displayOrder）を追加
      const tasksWithOrder = data.map((task, index) => ({
        ...task,
        displayOrder: index
      }));
      
      // Firestoreに保存（useTaskStoreに実装されていることを前提）
      await updateTaskOrder(tasksWithOrder, activeTab);
    } catch (error) {
      console.error('タスクの並び順保存エラー:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={[styles.loadingText, { color: themeColor }]}>読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#D32F2F" />
        <Text style={styles.errorText}>エラーが発生しました: {error}</Text>
      </View>
    );
  }

  // タブに表示するタスク
  const currentTasks = activeTab === 'incomplete' ? incompleteTasks : completedTasks;

  return (
    <View style={styles.container}>
      {/* 選択モード時のアクションバー */}
      {selectMode && (
        <View style={[styles.selectionBar, { backgroundColor: themeColor }]}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedTaskIds.length}件選択中
            </Text>
          </View>
          
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.selectionButtonText}>全選択</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.selectionButton, styles.deleteButton]}
              onPress={handleDeleteSelected}
              disabled={selectedTaskIds.length === 0}
            >
              <AntDesign name="delete" size={16} color="white" />
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={handleCancelSelect}
            >
              <Text style={styles.selectionButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* タブセレクター（選択モード時は非表示） */}
      {!selectMode && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'incomplete' && styles.activeTab
            ]}
            onPress={() => setActiveTab('incomplete')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'incomplete' && [styles.activeTabText, { color: themeColor }]
            ]}>
              未完了 ({incompleteTasks.length})
            </Text>
            {activeTab === 'incomplete' && <View style={[styles.tabIndicator, { backgroundColor: themeColor }]} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'completed' && styles.activeTab
            ]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'completed' && [styles.activeTabText, { color: themeColor }]
            ]}>
              完了済み ({completedTasks.length})
            </Text>
            {activeTab === 'completed' && <View style={[styles.tabIndicator, { backgroundColor: themeColor }]} />}
          </TouchableOpacity>
        </View>
      )}
      
      {currentTasks.length === 0 ? (
        <EmptyState activeTab={activeTab} themeColor={themeColor} />
      ) : (
        <DraggableFlatList
          data={currentTasks}
          keyExtractor={(item) => item.id}
          onDragEnd={handleDragEnd}
          dragItemOverflow={true}
          autoscrollThreshold={50}
          dragHitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          renderItem={({ item, drag, isActive }: RenderItemParams<Task>) => (
            <ScaleDecorator>
              <View style={[
                styles.taskCardContainer,
                isActive && styles.activeTaskCard
              ]}>
                <TaskCard 
                  task={item} 
                  onToggleComplete={!selectMode ? handleToggleComplete : undefined}
                  showAnimation={item.id === recentlyCompletedTaskId}
                  isSelectable={selectMode}
                  isSelected={selectedTaskIds.includes(item.id)}
                  onSelect={handleSelectTask}
                  onPress={!selectMode ? handleTaskPress : undefined}
                />
                {!selectMode && (
                  <TouchableOpacity
                    style={styles.dragHandle}
                    onPressIn={drag}
                    disabled={isActive}
                    activeOpacity={0.5}
                  >
                    <MaterialIcons name="drag-handle" size={24} color="#999999" />
                  </TouchableOpacity>
                )}
              </View>
            </ScaleDecorator>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[themeColor]}
              tintColor={themeColor}
              title="更新中..."
              titleColor={themeColor}
            />
          }
        />
      )}
    </View>
  );
};

// EmptyStateコンポーネント
const EmptyState = ({ activeTab, themeColor }: { activeTab: 'incomplete' | 'completed', themeColor: string }) => {
  return (
    <Animated.View 
      style={styles.emptyContainer}
      entering={FadeIn.duration(800)}
    >
      <View style={styles.emptyIconContainer}>
        {activeTab === 'incomplete' ? (
          <>
            <Ionicons name="musical-notes-outline" size={100} color="#E0E0E0" style={styles.emptyIcon} />
            <View style={[styles.iconBubble, { backgroundColor: themeColor }]}>
              <FontAwesome5 name="tasks" size={20} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <>
            <MaterialIcons name="check-circle-outline" size={100} color="#E0E0E0" style={styles.emptyIcon} />
            <View style={[styles.iconBubble, { backgroundColor: themeColor }]}>
              <MaterialIcons name="done-all" size={20} color="#FFFFFF" />
            </View>
          </>
        )}
      </View>
      
      <Text style={styles.emptyTitle}>
        {activeTab === 'incomplete' ? 'タスクがありません' : '完了済みタスクがありません'}
      </Text>
      
      <Text style={styles.emptyDescription}>
        {activeTab === 'incomplete' 
          ? 'タスクを追加して練習計画を立てましょう' 
          : '練習タスクを完了すると、ここに表示されます'}
      </Text>
      
      {activeTab === 'incomplete' && (
        <TouchableOpacity 
          style={[styles.emptyButton, { backgroundColor: themeColor }]}
          onPress={() => router.push('/task-form' as any)}
        >
          <AntDesign name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>新しいタスクを追加</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: TASK_THEME_LIGHT,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  activeTabText: {
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '40%',
    borderRadius: 1.5,
    alignSelf: 'center',
    marginBottom: 2,
  },
  selectionBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'column',
  },
  selectionInfo: {
    marginBottom: 8,
  },
  selectionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -30,
  },
  emptyIconContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  taskCardContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  dragHandle: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 12,
    zIndex: 10,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: 'rgba(245, 245, 245, 0.5)',
  },
  activeTaskCard: {
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    transform: [{ scale: 1.02 }],
  },
});

export default TaskList; 