import React from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
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
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <LessonForm
        formData={formData}
        isEditing={isEditing}
        onUpdateFormData={onUpdateFormData}
        onSave={onSave}
        onToggleFavorite={onToggleFavorite}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});

export default LessonDetailContent;
