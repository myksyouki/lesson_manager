import React from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TaskCard from '../TaskCard';
import { Task } from '../../../../../types/_task';

interface TaskListProps {
  tasks: Task[];
  refreshing: boolean;
  onRefresh: () => void;
  onTaskComplete?: (taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  refreshing,
  onRefresh,
  onTaskComplete,
}) => {
  const calculateCompletionCounts = () => {
    const completionCounts: Record<string, Record<string, number>> = {};
    
    tasks.forEach(task => {
      if (task.completed) {
        const category = task.tags && task.tags.length > 0 ? task.tags[0] : 'その他';
        
        if (!completionCounts[task.title]) {
          completionCounts[task.title] = {};
        }
        
        if (!completionCounts[task.title][category]) {
          completionCounts[task.title][category] = 0;
        }
        
        completionCounts[task.title][category]++;
      }
    });
    
    return completionCounts;
  };
  
  const completionCounts = calculateCompletionCounts();
  
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollViewContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
        />
      }
    >
      {tasks.length > 0 ? (
        tasks.map((task, index) => {
          const category = task.tags && task.tags.length > 0 ? task.tags[0] : 'その他';
          
          const completionCount = completionCounts[task.title] && 
            completionCounts[task.title][category] ? 
            completionCounts[task.title][category] : 0;
          
          return (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggleComplete={onTaskComplete ? () => onTaskComplete(task.id) : undefined}
            />
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name={"assignment" as const} size={64} color="#d1d1d6" />
          <Text style={styles.emptyText}>タスクがありません</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
  },
});

export default TaskList;
