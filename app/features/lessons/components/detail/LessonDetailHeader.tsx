import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDate } from '@app/_ignore/utils/_dateUtils';
import { useLessonStore } from '../../../../store/lessons';
import { router } from 'expo-router';

interface LessonDetailHeaderProps {
  id: string;
  date?: string | null;
  teacher?: string;
  isEditing: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export const LessonDetailHeader: React.FC<LessonDetailHeaderProps> = ({
  id,
  date = '',
  teacher = '',
  isEditing,
  isArchived = false,
  isFavorite = false,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleFavorite,
}) => {
  const { archiveLesson, unarchiveLesson } = useLessonStore();

  const handleArchiveToggle = async () => {
    try {
      console.log(`アーカイブ操作開始: ID=${id}, 現在の状態=${isArchived ? 'アーカイブ済み' : '未アーカイブ'}`);
      
      if (isArchived) {
        console.log('アーカイブ解除を実行します');
        await unarchiveLesson(id);
        console.log('アーカイブ解除完了');
      } else {
        console.log('アーカイブを実行します');
        await archiveLesson(id);
        console.log('アーカイブ完了');
      }
      
      // 操作後に表示を更新するためにレッスン一覧に戻る
      router.back();
    } catch (error) {
      console.error('アーカイブ操作エラー:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.headerContainer}>
        <View style={styles.dateTeacherContainer}>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
          <Text style={styles.teacherText}>{teacher}</Text>
        </View>
        
        <View style={styles.actionButtonsContainer}>
          {!isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.iconButton, styles.deleteButton]}
                onPress={onDelete}
              >
                <MaterialIcons 
                  name="delete"
                  size={24} 
                  color="#D32F2F"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, styles.favoriteButton]}
                onPress={onToggleFavorite}
              >
                <MaterialIcons 
                  name={isFavorite ? "favorite" : "favorite-border"}
                  size={24} 
                  color={isFavorite ? "#D32F2F" : "#555"}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.iconButton, styles.archiveButton]}
                onPress={handleArchiveToggle}
              >
                <MaterialIcons 
                  name={isArchived ? "unarchive" : "archive"}
                  size={24} 
                  color="#555"
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.iconButton, styles.editButton]}
                onPress={onEdit}
              >
                <MaterialIcons name="edit" size={24} color="#555" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.iconButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <MaterialIcons name="close" size={24} color="#D32F2F" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.iconButton, styles.saveButton]}
                onPress={onSave}
              >
                <MaterialIcons name="check" size={24} color="#34A853" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButtonContainer: {
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTeacherContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teacherText: {
    fontSize: 16,
    color: '#666',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#f5f5f5',
  },
  archiveButton: {
    backgroundColor: '#f5f5f5',
  },
  favoriteButton: {
    backgroundColor: '#f5f5f5',
  },
  deleteButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#E8F5E9',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
  },
});

export default LessonDetailHeader;
