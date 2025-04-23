import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TaskFilter from '../TaskFilter';

interface TaskHeaderProps {
  currentFilter: 'all' | 'completed' | 'pending';
  onFilterChange: (filter: 'all' | 'completed' | 'pending') => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>練習</Text>
      <TaskFilter 
        currentFilter={currentFilter} 
        onFilterChange={onFilterChange} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#1c1c1e',
  },
});

export default TaskHeader;
