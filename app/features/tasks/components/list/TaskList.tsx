import React from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TaskCard from '../TaskCard';
import { Task } from '../../../../types/task';

interface TaskListProps {
  tasks: Task[];
  refreshing: boolean;
  onRefresh: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  refreshing,
  onRefresh,
}) => {
  return (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
        />
      }
    >
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="assignment" size={64} color="#d1d1d6" />
          <Text style={styles.emptyText}>タスクがありません</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
  },
});

export default TaskList;
