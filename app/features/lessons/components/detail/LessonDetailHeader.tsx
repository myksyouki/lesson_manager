import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface LessonDetailHeaderProps {
  title: string;
  isFavorite: boolean;
  isEditing: boolean;
  onToggleFavorite: () => void;
  onEditSave: () => void;
  onDelete: () => void;
}

export const LessonDetailHeader: React.FC<LessonDetailHeaderProps> = ({
  title,
  isFavorite,
  isEditing,
  onToggleFavorite,
  onEditSave,
  onDelete,
}) => {
  const handleDelete = () => {
    Alert.alert(
      'レッスンの削除',
      'このレッスンを削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', onPress: onDelete, style: 'destructive' }
      ]
    );
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={26} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleDelete}
        >
          <MaterialIcons name="delete" size={26} color="#FF3B30" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onToggleFavorite}
        >
          <MaterialIcons 
            name={isFavorite ? "favorite" : "favorite-border"} 
            size={26} 
            color={isFavorite ? "#FF3B30" : "#007AFF"} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onEditSave}
          style={styles.editButton}>
          <Text style={styles.editButtonText}>{isEditing ? '保存' : '編集'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default LessonDetailHeader;
