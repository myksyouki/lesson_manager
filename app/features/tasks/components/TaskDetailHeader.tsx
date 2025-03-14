import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TaskDetailHeaderProps {
  title: string;
  isCompleted: boolean;
  onBack: () => void;
  onToggleComplete: () => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  title,
  isCompleted,
  onBack,
  onToggleComplete,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
      >
        <Ionicons name="chevron-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity
        style={styles.completeButton}
        onPress={onToggleComplete}
      >
        <Ionicons
          name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
          size={28}
          color={isCompleted ? "#34C759" : "#8E8E93"}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  completeButton: {
    padding: 8,
  },
});

export default TaskDetailHeader;
