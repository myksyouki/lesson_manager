import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LessonFormData } from '../../../../services/lessonService';
import { TextField } from '../../../../components/ui/TextField';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody } from '../../../../components/ui/Card';
import { useTheme } from '../../../../theme';

interface FormInputsProps {
  formData: LessonFormData;
  onUpdateFormData: (data: Partial<LessonFormData>) => void;
  onShowCalendar: () => void;
}

const FormInputs: React.FC<FormInputsProps> = ({
  formData,
  onUpdateFormData,
  onShowCalendar,
}) => {
  const [newPiece, setNewPiece] = useState('');
  const [newTag, setNewTag] = useState('');
  const theme = useTheme();

  // 曲目を追加する関数
  const addPiece = () => {
    if (newPiece.trim()) {
      onUpdateFormData({
        pieces: [...formData.pieces, newPiece.trim()],
      });
      setNewPiece('');
    }
  };

  // 曲目を削除する関数
  const removePiece = (index: number) => {
    const updatedPieces = [...formData.pieces];
    updatedPieces.splice(index, 1);
    onUpdateFormData({
      pieces: updatedPieces,
    });
  };

  // タグを追加する関数
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      onUpdateFormData({
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  // タグを削除する関数
  const removeTag = (index: number) => {
    const updatedTags = [...formData.tags];
    updatedTags.splice(index, 1);
    onUpdateFormData({
      tags: updatedTags,
    });
  };

  // 定義済みのタグリスト
  const predefinedTags = ['リズム', 'テクニック', '表現', 'ペダル', '音色', '強弱'];

  // 定義済みタグを選択する関数
  const togglePredefinedTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      onUpdateFormData({
        tags: formData.tags.filter(t => t !== tag),
      });
    } else {
      onUpdateFormData({
        tags: [...formData.tags, tag],
      });
    }
  };

  return (
    <View style={styles.container}>
      <TextField
        label="講師名"
        value={formData.teacherName}
        onChangeText={(text) => onUpdateFormData({ teacherName: text })}
        placeholder="講師の名前を入力"
      />

      <View style={styles.formGroup}>
        <Text style={styles.label}>レッスン日</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={onShowCalendar}
        >
          <Text style={styles.dateText}>{formData.date}</Text>
          <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>曲目</Text>
        <Card style={styles.listCard}>
          <CardBody>
            {formData.pieces.length > 0 ? (
              <View style={styles.piecesContainer}>
                {formData.pieces.map((piece, index) => (
                  <View key={index} style={styles.pieceItem}>
                    <Text style={styles.pieceText}>{piece}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removePiece(index)}
                    >
                      <MaterialIcons name="close" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>曲目が登録されていません</Text>
            )}
          </CardBody>
        </Card>
        
        <View style={styles.addItemContainer}>
          <TextField
            value={newPiece}
            onChangeText={setNewPiece}
            placeholder="曲名を入力"
            onSubmitEditing={addPiece}
            rightIcon={
              <MaterialIcons
                name="add"
                size={20}
                color={newPiece.trim() ? theme.colors.primary : theme.colors.textTertiary}
              />
            }
            onRightIconPress={newPiece.trim() ? addPiece : undefined}
            containerStyle={styles.addItemField}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>メモ</Text>
        <TextField
          value={formData.notes}
          onChangeText={(text) => onUpdateFormData({ notes: text })}
          placeholder="レッスンの内容や気づきをメモしましょう"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputStyle={styles.notesInput}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>タグ</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.predefinedTagsContainer}
          contentContainerStyle={styles.predefinedTagsContent}
        >
          {predefinedTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.predefinedTag,
                formData.tags.includes(tag) && styles.selectedPredefinedTag,
              ]}
              onPress={() => togglePredefinedTag(tag)}
            >
              <Text
                style={[
                  styles.predefinedTagText,
                  formData.tags.includes(tag) && styles.selectedPredefinedTagText,
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <Card style={styles.listCard}>
          <CardBody>
            {formData.tags.length > 0 ? (
              <View style={styles.tagsContainer}>
                {formData.tags.map((tag, index) => (
                  <View key={index} style={styles.tagItem}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeTag(index)}
                    >
                      <MaterialIcons name="close" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>タグが登録されていません</Text>
            )}
          </CardBody>
        </Card>
        
        <View style={styles.addItemContainer}>
          <TextField
            value={newTag}
            onChangeText={setNewTag}
            placeholder="カスタムタグを追加"
            onSubmitEditing={addTag}
            rightIcon={
              <MaterialIcons
                name="add"
                size={20}
                color={newTag.trim() && !formData.tags.includes(newTag.trim()) ? theme.colors.primary : theme.colors.textTertiary}
              />
            }
            onRightIconPress={newTag.trim() && !formData.tags.includes(newTag.trim()) ? addTag : undefined}
            containerStyle={styles.addItemField}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  dateText: {
    fontSize: 16,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  listCard: {
    padding: 0,
    marginBottom: 8,
  },
  piecesContainer: {
    marginBottom: 8,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DADCE0',
  },
  pieceText: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  removeButton: {
    padding: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemField: {
    flex: 1,
    marginBottom: 0,
  },
  notesInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  predefinedTagsContainer: {
    marginBottom: 12,
  },
  predefinedTagsContent: {
    paddingVertical: 8,
  },
  predefinedTag: {
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedPredefinedTag: {
    backgroundColor: '#E8F0FE',
  },
  predefinedTagText: {
    fontSize: 14,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectedPredefinedTagText: {
    color: '#4285F4',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#4285F4',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyText: {
    fontSize: 14,
    color: '#9AA0A6',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});

export default FormInputs;
