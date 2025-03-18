import React, { useState, useCallback, useMemo } from 'react';
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

  // 定義済みのタグリスト
  const predefinedTags = useMemo(() => 
    [],
    []
  );

  // 曲目を追加する関数
  const addPiece = useCallback(() => {
    if (newPiece.trim()) {
      onUpdateFormData({
        pieces: [...formData.pieces, newPiece.trim()],
      });
      setNewPiece('');
    }
  }, [newPiece, formData.pieces, onUpdateFormData]);

  // 曲目を削除する関数
  const removePiece = useCallback((index: number) => {
    const updatedPieces = [...formData.pieces];
    updatedPieces.splice(index, 1);
    onUpdateFormData({
      pieces: updatedPieces,
    });
  }, [formData.pieces, onUpdateFormData]);

  // タグを追加する関数
  const addTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      onUpdateFormData({
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  }, [newTag, formData.tags, onUpdateFormData]);

  // タグを削除する関数
  const removeTag = useCallback((index: number) => {
    const updatedTags = [...formData.tags];
    updatedTags.splice(index, 1);
    onUpdateFormData({
      tags: updatedTags,
    });
  }, [formData.tags, onUpdateFormData]);

  // 定義済みタグを選択する関数
  const togglePredefinedTag = useCallback((tag: string) => {
    if (formData.tags.includes(tag)) {
      onUpdateFormData({
        tags: formData.tags.filter(t => t !== tag),
      });
    } else {
      onUpdateFormData({
        tags: [...formData.tags, tag],
      });
    }
  }, [formData.tags, onUpdateFormData]);

  // テキスト変更ハンドラー
  const handleTeacherNameChange = useCallback((text: string) => {
    onUpdateFormData({ teacherName: text });
  }, [onUpdateFormData]);

  const handleNotesChange = useCallback((text: string) => {
    onUpdateFormData({ notes: text });
  }, [onUpdateFormData]);

  // 追加ボタンを無効にするかどうかの計算
  const isAddTagDisabled = useMemo(() => 
    !newTag.trim() || formData.tags.includes(newTag.trim()),
    [newTag, formData.tags]
  );

  return (
    <View style={styles.container}>
      <TextField
        label="講師名"
        value={formData.teacherName}
        onChangeText={handleTeacherNameChange}
        placeholder="講師の名前を入力"
      />

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>レッスン日</Text>
        <TouchableOpacity
          style={[styles.dateInput, { 
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md
          }]}
          onPress={onShowCalendar}
          accessibilityLabel="レッスン日を選択"
          accessibilityHint="カレンダーから日付を選択するために押します"
        >
          <Text style={[styles.dateText, { color: theme.colors.text }]}>
            {formData.date}
          </Text>
          <MaterialIcons 
            name="calendar-today" 
            size={20} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>曲目</Text>
        <Card style={styles.listCard}>
          <CardBody>
            {formData.pieces.length > 0 ? (
              <View style={styles.piecesContainer}>
                {formData.pieces.map((piece, index) => (
                  <View key={index} style={[styles.pieceItem, { 
                    borderBottomColor: theme.colors.borderLight 
                  }]}>
                    <Text style={[styles.pieceText, { 
                      color: theme.colors.text 
                    }]}>
                      {piece}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removePiece(index)}
                      accessibilityLabel={`${piece}を削除`}
                      accessibilityHint="タップすると曲目を削除します"
                    >
                      <MaterialIcons 
                        name="close" 
                        size={16} 
                        color={theme.colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { 
                color: theme.colors.textTertiary 
              }]}>
                曲目が登録されていません
              </Text>
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
        <Text style={[styles.label, { color: theme.colors.text }]}>メモ</Text>
        <TextField
          value={formData.notes}
          onChangeText={handleNotesChange}
          placeholder="レッスンの内容や気づきをメモしましょう"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputStyle={styles.notesInput}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>タグ</Text>
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
                { backgroundColor: theme.colors.backgroundTertiary },
                formData.tags.includes(tag) && [
                  styles.selectedPredefinedTag,
                  { backgroundColor: theme.colors.primaryLight }
                ],
              ]}
              onPress={() => togglePredefinedTag(tag)}
              accessibilityLabel={formData.tags.includes(tag) ? `${tag}（選択済み）` : tag}
              accessibilityHint={formData.tags.includes(tag) ? 
                "タップするとタグ選択を解除します" : 
                "タップするとタグを選択します"}
            >
              <Text
                style={[
                  styles.predefinedTagText,
                  { color: theme.colors.textSecondary },
                  formData.tags.includes(tag) && [
                    styles.selectedPredefinedTagText,
                    { color: theme.colors.primary }
                  ],
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
                  <View key={index} style={[styles.tagItem, { 
                    backgroundColor: theme.colors.primaryLight 
                  }]}>
                    <Text style={[styles.tagText, { 
                      color: theme.colors.primary 
                    }]}>
                      {tag}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeTag(index)}
                      accessibilityLabel={`${tag}を削除`}
                      accessibilityHint="タップするとタグを削除します"
                    >
                      <MaterialIcons 
                        name="close" 
                        size={16} 
                        color={theme.colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { 
                color: theme.colors.textTertiary 
              }]}>
                タグが登録されていません
              </Text>
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
                color={!isAddTagDisabled 
                  ? theme.colors.primary 
                  : theme.colors.textTertiary}
              />
            }
            onRightIconPress={!isAddTagDisabled ? addTag : undefined}
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
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
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
  },
  pieceText: {
    flex: 1,
    fontSize: 16,
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
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedPredefinedTag: {},
  predefinedTagText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectedPredefinedTagText: {
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});

export default FormInputs;
