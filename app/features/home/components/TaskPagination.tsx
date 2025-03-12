import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TaskPaginationProps {
  totalCount: number;
  currentIndex: number;
  maxDots?: number;
}

export const TaskPagination: React.FC<TaskPaginationProps> = ({
  totalCount,
  currentIndex,
  maxDots = 5,
}) => {
  return (
    <View style={styles.pagination}>
      {Array.from({ length: Math.min(totalCount, maxDots) }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            currentIndex === index && styles.paginationDotActive,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#1a73e8',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default TaskPagination;
