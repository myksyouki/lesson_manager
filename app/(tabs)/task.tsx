import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '../store/tasks';
import TaskHeader from '../features/tasks/components/list/TaskHeader';
import TaskList from '../features/tasks/components/list/TaskList';
import TaskActionButton from '../features/tasks/components/list/TaskActionButton';

export default function TaskScreen() {
  const { tasks } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.isCompleted;
    if (filter === 'pending') return !task.isCompleted;
    return true;
  });

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: データ再取得処理
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TaskHeader 
        currentFilter={filter} 
        onFilterChange={setFilter} 
      />
      
      <TaskList 
        tasks={filteredTasks}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <TaskActionButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
