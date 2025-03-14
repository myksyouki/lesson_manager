import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TagManagerProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  isEditing: boolean;
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  isEditing,
}) => {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag('');
    }
  };

  return (
    <View>
      {isEditing && (
        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagInput}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="新しいタグを入力"
            onSubmitEditing={handleAddTag}
            returnKeyType="done"
          />
          <TouchableOpacity 
            style={[styles.addTagButton, !newTag.trim() && styles.addTagButtonDisabled]} 
            onPress={handleAddTag}
            disabled={!newTag.trim()}
          >
            <Text style={styles.addTagButtonText}>追加</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.tagContainer}>
        {tags.map((tag, index) => (
          <View key={index} style={[styles.tag, styles.tagSelected]}>
            <Text style={styles.tagTextSelected}>{tag}</Text>
            {isEditing && (
              <TouchableOpacity
                style={styles.removeTagButton}
                onPress={() => onRemoveTag(tag)}
              >
                <MaterialIcons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    fontSize: 17,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  addTagButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addTagButtonDisabled: {
    backgroundColor: '#B0B0B8',
  },
  addTagButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    backgroundColor: '#007AFF',
  },
  tagTextSelected: {
    color: 'white',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  removeTagButton: {
    marginLeft: 6,
    padding: 2,
  },
});

export default TagManager;
