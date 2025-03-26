import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (index: number) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = 'タグを入力'
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    if (inputValue.trim()) {
      onAddTag(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={handleAddTag}
          style={[
            styles.addButton,
            !inputValue.trim() && styles.addButtonDisabled
          ]}
          disabled={!inputValue.trim()}
        >
          <MaterialIcons
            name="add"
            size={24}
            color={inputValue.trim() ? '#FFFFFF' : '#CCCCCC'}
          />
        </TouchableOpacity>
      </View>

      {tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => onRemoveTag(index)}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={16} color="#666666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

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
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    marginLeft: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4285F4',
    fontSize: 14,
    marginRight: 4,
  },
  removeButton: {
    padding: 2,
  },
});

export default TagInput; 