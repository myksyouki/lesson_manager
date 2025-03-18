import React from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, RefreshControl } from 'react-native';
import LessonForm from '../LessonForm';

interface LessonFormData {
  id: string;
  teacher: string;
  date: string;
  piece?: string;
  pieces?: string[];
  summary: string;
  notes: string;
  tags: string[];
  isFavorite: boolean;
  status: string;
  transcription: string;
  newPiece?: string;
}

interface LessonDetailContentProps {
  formData: LessonFormData;
  isEditing: boolean;
  onUpdateFormData: (data: Partial<LessonFormData>) => void;
  onSave: () => void;
  onToggleFavorite: () => void;
}

export const LessonDetailContent: React.FC<LessonDetailContentProps> = ({
  formData,
  isEditing,
  onUpdateFormData,
  onSave,
  onToggleFavorite,
}) => {
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // データを再読み込みする処理
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1C1C1E"
            colors={['#1C1C1E']}
          />
        }
      >
        <LessonForm
          formData={formData}
          isEditing={isEditing}
          onUpdateFormData={onUpdateFormData}
          onSave={onSave}
          onToggleFavorite={onToggleFavorite}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default LessonDetailContent;
