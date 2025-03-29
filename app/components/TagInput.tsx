/**
 * タグ入力コンポーネント
 * 
 * レッスンやタスクにタグを追加・削除するためのUI要素を提供します。
 * 入力フィールド、追加ボタン、タグの表示と削除機能を含みます。
 */
import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// 定数
const COLORS = {
  INPUT_BORDER: '#DDDDDD',
  INPUT_BACKGROUND: '#FFFFFF',
  BUTTON_ACTIVE: '#4285F4',
  BUTTON_DISABLED: '#F0F0F0',
  BUTTON_TEXT_ACTIVE: '#FFFFFF',
  BUTTON_TEXT_DISABLED: '#CCCCCC',
  TAG_BACKGROUND: '#E8F0FE',
  TAG_TEXT: '#4285F4',
  REMOVE_ICON: '#666666',
};

// 型定義
interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (index: number) => void;
  placeholder?: string;
}

/**
 * タグ入力コンポーネント
 */
const TagInput: React.FC<TagInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = 'タグを入力'
}) => {
  const [inputValue, setInputValue] = useState('');
  
  /**
   * 入力されたタグを追加する
   */
  const handleAddTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onAddTag(trimmedValue);
      setInputValue('');
    }
  };

  return (
    <View style={styles.container}>
      {renderInputField(inputValue, setInputValue, placeholder, handleAddTag)}
      {renderTagList(tags, onRemoveTag)}
    </View>
  );
};

/**
 * 入力フィールドと追加ボタンを表示
 */
function renderInputField(
  value: string, 
  onChangeText: (text: string) => void, 
  placeholder: string,
  onAddTag: () => void
) {
  const isButtonActive = value.trim().length > 0;

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onSubmitEditing={onAddTag}
        returnKeyType="done"
      />
      <TouchableOpacity
        onPress={onAddTag}
        style={[
          styles.addButton,
          !isButtonActive && styles.addButtonDisabled
        ]}
        disabled={!isButtonActive}
      >
        <MaterialIcons
          name="add"
          size={24}
          color={isButtonActive ? COLORS.BUTTON_TEXT_ACTIVE : COLORS.BUTTON_TEXT_DISABLED}
        />
      </TouchableOpacity>
    </View>
  );
}

/**
 * タグリストを表示
 */
function renderTagList(tags: string[], onRemoveTag: (index: number) => void) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.tagsContainer}>
      {tags.map((tag, index) => renderTag(tag, index, onRemoveTag))}
    </View>
  );
}

/**
 * 個別のタグを表示
 */
function renderTag(tag: string, index: number, onRemoveTag: (index: number) => void) {
  return (
    <View key={index} style={styles.tag}>
      <Text style={styles.tagText}>{tag}</Text>
      <TouchableOpacity
        onPress={() => onRemoveTag(index)}
        style={styles.removeButton}
      >
        <MaterialIcons name="close" size={16} color={COLORS.REMOVE_ICON} />
      </TouchableOpacity>
    </View>
  );
}

// スタイル定義
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.INPUT_BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.INPUT_BACKGROUND,
  },
  addButton: {
    backgroundColor: COLORS.BUTTON_ACTIVE,
    borderRadius: 8,
    marginLeft: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.BUTTON_DISABLED,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.TAG_BACKGROUND,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: COLORS.TAG_TEXT,
    fontSize: 14,
    marginRight: 4,
  },
  removeButton: {
    padding: 2,
  },
});

export default TagInput; 