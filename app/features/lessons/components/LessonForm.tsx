import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TagManager from './TagManager';
import SummaryDisplay from './SummaryDisplay';
import Calendar from './Calendar';

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

interface LessonFormProps {
  formData: LessonFormData;
  isEditing: boolean;
  onUpdateFormData: (data: Partial<LessonFormData>) => void;
  onSave: () => void;
  onToggleFavorite: () => void;
}

export const LessonForm: React.FC<LessonFormProps> = ({
  formData,
  isEditing,
  onUpdateFormData,
  onSave,
  onToggleFavorite,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const contentPadding = isTablet ? 40 : 20;
  const inputMaxWidth = isTablet ? 600 : '100%';
  const [showCalendar, setShowCalendar] = React.useState(false);

  const handleAddTag = (tag: string) => {
    onUpdateFormData({ tags: [...formData.tags, tag] });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateFormData({
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleDateSelect = (date: Date) => {
    onUpdateFormData({ date: formatDate(date) });
    setShowCalendar(false);
  };

  return (
    <>
      <View 
        style={[styles.content, { padding: contentPadding }]} 
      >
        <View style={[styles.formContainer, { maxWidth: inputMaxWidth, alignSelf: isTablet ? 'center' : 'stretch' }]}>
          <View style={styles.section}>
            <Text style={styles.label}>講師名</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnly]}
              value={formData.teacher}
              onChangeText={(text) => onUpdateFormData({ teacher: text })}
              editable={isEditing}
              placeholder="講師名を入力"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>レッスン日</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => isEditing && setShowCalendar(true)}>
              <Text style={styles.dateText}>{formData.date}</Text>
              {isEditing && <MaterialIcons name="calendar-today" size={22} color="#5f6368" />}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>レッスン曲</Text>
            {formData.pieces && formData.pieces.length > 0 ? (
              <View style={styles.piecesList}>
                {formData.pieces.map((piece, index) => (
                  <View key={index} style={styles.pieceItem}>
                    <Text style={styles.pieceText}>{piece}</Text>
                    {isEditing && (
                      <TouchableOpacity
                        onPress={() => {
                          const newPieces = [...(formData.pieces || [])];
                          newPieces.splice(index, 1);
                          onUpdateFormData({ pieces: newPieces });
                        }}
                        style={styles.removeButton}
                      >
                        <MaterialIcons name="close" size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <TextInput
                style={[styles.input, !isEditing && styles.readOnly]}
                value={formData.piece || ''}
                onChangeText={(text) => onUpdateFormData({ piece: text })}
                editable={isEditing}
                placeholder="曲名を入力"
              />
            )}
            {isEditing && (
              <View style={styles.addPieceContainer}>
                <TextInput
                  style={[styles.input, styles.addPieceInput]}
                  placeholder="曲名を追加"
                  onSubmitEditing={(e) => {
                    if (e.nativeEvent.text.trim()) {
                      const newPieces = [...(formData.pieces || []), e.nativeEvent.text.trim()];
                      onUpdateFormData({ pieces: newPieces });
                      onUpdateFormData({ newPiece: '' });
                    }
                  }}
                  returnKeyType="done"
                  value={formData.newPiece}
                  onChangeText={(text) => onUpdateFormData({ newPiece: text })}
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>タグ</Text>
            <TagManager
              tags={formData.tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              isEditing={isEditing}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>AIサマリー</Text>
            <SummaryDisplay
              summary={formData.summary}
              status={formData.status}
            />
          </View>

          <View style={[styles.section, styles.memoSection]}>
            <Text style={styles.label}>マイメモ</Text>
            <TextInput
              style={[styles.input, styles.textArea, !isEditing && styles.readOnly]}
              value={formData.notes}
              onChangeText={(text) => onUpdateFormData({ notes: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={isEditing}
              placeholder="メモを入力"
            />
          </View>
        </View>
      </View>

      {showCalendar && (
        <Calendar
          isVisible={showCalendar}
          onClose={() => setShowCalendar(false)}
          onSelectDate={handleDateSelect}
          initialDate={formData.date ? new Date(formData.date.replace(/年|月|日/g, '/')) : new Date()}
          isTablet={isTablet}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  section: {
    marginBottom: 24,
  },
  memoSection: {
    marginBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 17,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  readOnly: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 140,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  piecesList: {
    marginTop: 8,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  pieceText: {
    flex: 1,
    fontSize: 16,
  },
  removeButton: {
    padding: 4,
  },
  addPieceContainer: {
    marginTop: 8,
  },
  addPieceInput: {
    backgroundColor: '#F2F2F7',
  },
});

export default LessonForm;
