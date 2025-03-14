import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type FilterType = 'all' | 'completed' | 'pending';

interface TaskFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({ currentFilter, onFilterChange }) => {
  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, currentFilter === 'all' && styles.activeFilter]}
        onPress={() => onFilterChange('all')}
      >
        <Text style={[styles.filterText, currentFilter === 'all' && styles.activeFilterText]}>すべて</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, currentFilter === 'pending' && styles.activeFilter]}
        onPress={() => onFilterChange('pending')}
      >
        <Text style={[styles.filterText, currentFilter === 'pending' && styles.activeFilterText]}>未完了</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, currentFilter === 'completed' && styles.activeFilter]}
        onPress={() => onFilterChange('completed')}
      >
        <Text style={[styles.filterText, currentFilter === 'completed' && styles.activeFilterText]}>完了</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    paddingBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  activeFilterText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default TaskFilter;
