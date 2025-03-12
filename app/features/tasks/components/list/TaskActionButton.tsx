import React from 'react';
import { StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { router } from 'expo-router';

export const TaskActionButton: React.FC = () => {
  const handleAddTask = () => {
    router.push({
      pathname: '/task-form',
      params: { mode: 'create' }
    });
  };

  return (
    <FAB
      style={styles.fab}
      icon="plus"
      onPress={handleAddTask}
      color="#ffffff"
    />
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
  },
});

export default TaskActionButton;
