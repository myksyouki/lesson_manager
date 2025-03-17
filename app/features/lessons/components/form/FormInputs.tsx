import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FormInputsProps {
  formData: {
    teacherName: string;
    date: string;
    pieces: string[];
    notes: string;
    tags: string[];
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    teacherName: string;
    date: string;
    pieces: string[];
    notes: string;
    tags: string[];
  }>>;
  onDatePress: () => void;
}

const FormInputs: React.FC<FormInputsProps> = ({
  formData,
  setFormData,
  onDatePress,
}) => {
  const [newPiece, setNewPiece] = useState('');
  const [newTag, setNewTag] = useState('');

  // 曲目を追加する関数
  const addPiece = () => {
    if (newPiece.trim()) {
      setFormData({
        ...formData,
        pieces: [...formData.pieces, newPiece.trim()],
      });
      setNewPiece('');
    }
  };

  // 曲目を削除する関数
  const removePiece = (index: number) => {
    const updatedPieces = [...formData.pieces];
    updatedPieces.splice(index, 1);
    setFormData({
      ...formData,
      pieces: updatedPieces,
    });
  };

  // タグを追加する関数
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  // タグを削除する関数
  const removeTag = (index: number) => {
    const updatedTags = [...formData.tags];
    updatedTags.splice(index, 1);
    setFormData({
      ...formData,
      tags: updatedTags,
    });
  };

  // 定義済みのタグリスト
  const predefinedTags = ['リズム', 'テクニック', '表現', 'ペダル', '音色', '強弱'];

  // 定義済みタグを選択する関数
  const togglePredefinedTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: formData.tags.filter(t => t !== tag),
      });
    } else {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>講師名</Text>
        <TextInput
          style={styles.input}
          value={formData.teacherName}
          onChangeText={(text) => setFormData({ ...formData, teacherName: text })}
          placeholder="講師の名前を入力"
          placeholderTextColor="#9AA0A6"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>レッスン日</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={onDatePress}
        >
          <Text style={styles.dateText}>{formData.date}</Text>
          <MaterialIcons name="calendar-today" size={20} color="#4285F4" />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>曲目</Text>
        <View style={styles.piecesContainer}>
          {formData.pieces.map((piece, index) => (
            <View key={index} style={styles.pieceItem}>
              <Text style={styles.pieceText}>{piece}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePiece(index)}
              >
                <MaterialIcons name="close" size={16} color="#9AA0A6" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.addItemContainer}>
          <TextInput
            style={styles.addItemInput}
            value={newPiece}
            onChangeText={setNewPiece}
            placeholder="曲名を入力"
            placeholderTextColor="#9AA0A6"
            onSubmitEditing={addPiece}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addPiece}
            disabled={!newPiece.trim()}
          >
            <MaterialIcons
              name="add"
              size={20}
              color={newPiece.trim() ? "#4285F4" : "#9AA0A6"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>メモ</Text>
        <TextInput
          style={styles.notesInput}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="レッスンの内容や気づきをメモしましょう"
          placeholderTextColor="#9AA0A6"
          multiline
          textAlignVertical="top"
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
        <View style={styles.tagsContainer}>
          {formData.tags.map((tag, index) => (
            <View key={index} style={styles.tagItem}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeTag(index)}
              >
                <MaterialIcons name="close" size={16} color="#9AA0A6" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.addItemContainer}>
          <TextInput
            style={styles.addItemInput}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="カスタムタグを追加"
            placeholderTextColor="#9AA0A6"
            onSubmitEditing={addTag}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addTag}
            disabled={!newTag.trim() || formData.tags.includes(newTag.trim())}
          >
            <MaterialIcons
              name="add"
              size={20}
              color={newTag.trim() && !formData.tags.includes(newTag.trim()) ? "#4285F4" : "#9AA0A6"}
            />
          </TouchableOpacity>
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
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  piecesContainer: {
    marginBottom: 8,
  },
  pieceItem: {
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pieceText: {
    color: '#4285F4',
    marginRight: 4,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  removeButton: {
    padding: 2,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  addButton: {
    padding: 12,
    marginLeft: 8,
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
    color: '#202124',
    height: 120,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  predefinedTagsContainer: {
    marginBottom: 8,
  },
  predefinedTagsContent: {
    paddingVertical: 8,
  },
  predefinedTag: {
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  selectedPredefinedTag: {
    backgroundColor: '#E8F0FE',
  },
  predefinedTagText: {
    color: '#5F6368',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectedPredefinedTagText: {
    color: '#4285F4',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tagItem: {
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: '#4285F4',
    marginRight: 4,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default FormInputs;
