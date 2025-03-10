import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTaskStore } from '../store/tasks';
import TaskCard from '../components/TaskCard';
import { Task } from '../types/task';

export default function TaskScreen() {
  const { tasks } = useTaskStore();

  return (
    <ScrollView style={styles.container}>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
});
