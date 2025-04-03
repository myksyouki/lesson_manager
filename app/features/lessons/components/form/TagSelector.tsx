import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../../theme';

// 定義済みのタグリスト
const PREDEFINED_TAGS = [
  '音の支え', 'アタック', '音のつながり', 'レガート', 'スタッカート',
  'クレッシェンド', 'デクレッシェンド', 'ペダリング', 'ハノン', 'ツェルニー',
  'バッハ', 'モーツァルト', 'ベートーヴェン', 'ショパン', 'リスト',
  '初見', '暗譜', '表現力', '音色', 'テンポ'
];

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const [newTag, setNewTag] = useState('');
  const theme = useTheme();

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      onTagsChange([...selectedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = [...selectedTags];
    newTags.splice(index, 1);
    onTagsChange(newTags);
  };

  return (
    <View>
      {/* 定義済みタグ一覧 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.predefinedTagsContainer}
        contentContainerStyle={styles.predefinedTagsContent}
      >
        {PREDEFINED_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.predefinedTag,
                isSelected && styles.selectedPredefinedTag
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text 
                style={[
                  styles.predefinedTagText,
                  isSelected && styles.selectedPredefinedTagText
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 選択済みタグ */}
      {selectedTags.length > 0 ? (
        <View style={styles.selectedTagsContainer}>
          <View style={styles.selectedTagsList}>
            {selectedTags.map((tag, index) => (
              <View key={index} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>{tag}</Text>
                <TouchableOpacity
                  style={styles.removeTagButton}
                  onPress={() => removeTag(index)}
                >
                  <MaterialIcons name="close" size={18} color="#0066cc" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>タグが選択されていません</Text>
        </View>
      )}

      {/* 新規タグ追加 */}
      <View style={styles.addTagContainer}>
        <View style={styles.addTagInput}>
          <TextInput
            style={styles.input}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="新しいタグを入力..."
            placeholderTextColor="#999"
            returnKeyType="done"
            onSubmitEditing={addCustomTag}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addCustomTag}
            disabled={!newTag.trim() || selectedTags.includes(newTag.trim())}
          >
            <MaterialIcons
              name="add-circle-outline"
              size={24}
              color={!newTag.trim() || selectedTags.includes(newTag.trim()) ? '#999' : theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 定義済みタグスタイル
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
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  selectedPredefinedTag: {
    borderColor: '#0066cc',
    backgroundColor: '#e6f0ff',
  },
  predefinedTagText: {
    fontSize: 14,
    color: '#333',
  },
  selectedPredefinedTagText: {
    color: '#0066cc',
    fontWeight: '500',
  },
  selectedTagsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#0066cc',
    backgroundColor: '#e6f0ff',
  },
  selectedTagText: {
    fontSize: 14,
    marginRight: 4,
    color: '#0066cc',
  },
  removeTagButton: {
    padding: 2,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  addTagContainer: {
    marginTop: 8,
  },
  addTagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  addButton: {
    padding: 8,
  },
}); 