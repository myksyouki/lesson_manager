import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

interface SummaryDisplayProps {
  summary: string | null;
  status: string | null;
  tags?: string[];
  isEditing?: boolean;
  onUpdateSummary?: (summary: string) => void;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ 
  summary, 
  status, 
  tags = [],
  isEditing = false,
  onUpdateSummary = () => {}
}) => {
  const [expanded, setExpanded] = useState(false);
  const maxCharacters = 200; // 折りたたみ状態で表示する最大文字数
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const renderSummary = () => {
    // 編集モードの場合はテキスト入力エリアを表示
    if (isEditing) {
      return (
        <TextInput
          style={styles.summaryTextInput}
          value={summary || ''}
          onChangeText={onUpdateSummary}
          multiline
          numberOfLines={6}
          placeholder="AIサマリーを入力"
          placeholderTextColor="#9AA0A6"
        />
      );
    }
    
    if (!summary) return null;
    
    // 概要が短い場合は展開ボタンを表示しない
    if (summary.length <= maxCharacters) {
      return <Text style={styles.summaryText}>{summary}</Text>;
    }
    
    if (expanded) {
      return (
        <View>
          <Text style={styles.summaryText}>{summary}</Text>
          <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>閉じる</Text>
            <MaterialIcons name="keyboard-arrow-up" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View>
          <Text style={styles.summaryText}>
            {summary.substring(0, maxCharacters)}...
          </Text>
          <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>もっと見る</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderTags = () => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <View style={styles.tagsContainer}>
        <Text style={styles.tagsTitle}>タグ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScrollView}>
          <View style={styles.tagsRow}>
            {tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['#F0F7FF', '#E1EFFF']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.titleContainer}>
          <MaterialIcons name="auto-awesome" size={22} color="#4285F4" style={styles.titleIcon} />
          <Text style={styles.title}>AIサマリー</Text>
        </View>
        
        {summary ? (
          <View style={styles.contentContainer}>
            <View style={styles.summaryContainer}>
              {renderSummary()}
            </View>
            {renderTags()}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            {status === 'error' && (
              <>
                <MaterialIcons name="error-outline" size={24} color="#EA4335" style={styles.placeholderIcon} />
                <Text style={styles.placeholderText}>サマリー取得エラー</Text>
              </>
            )}
            {status === 'processing' && (
              <>
                <MaterialIcons name="hourglass-bottom" size={24} color="#8E8E93" style={styles.placeholderIcon} />
                <Text style={styles.placeholderText}>音声ファイルを処理中...</Text>
              </>
            )}
            {status === 'transcribing' && (
              <>
                <MaterialIcons name="mic" size={24} color="#8E8E93" style={styles.placeholderIcon} />
                <Text style={styles.placeholderText}>文字起こし中...</Text>
              </>
            )}
            {status === 'summarizing' && (
              <>
                <MaterialIcons name="auto-awesome" size={24} color="#8E8E93" style={styles.placeholderIcon} />
                <Text style={styles.placeholderText}>生成中・・・</Text>
              </>
            )}
            {(status === 'completed' && !summary) && (
              <>
                <MaterialIcons name="info-outline" size={24} color="#8E8E93" style={styles.placeholderIcon} />
                <Text style={styles.placeholderText}>音声ファイルがアップロードされていないため、AIサマリーは生成されません。</Text>
              </>
            )}
            {!status && (
              <>
                <MaterialIcons name="info-outline" size={24} color="#8E8E93" style={styles.placeholderIcon} />
                <Text style={styles.placeholderText}>音声ファイルがアップロードされていないため、AIサマリーは生成されません。</Text>
              </>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  container: {
    padding: 16,
    borderRadius: 12,
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  summaryContainer: {
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#5F6368',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryTextInput: {
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    fontSize: 16,
    lineHeight: 24,
    color: '#202124',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagsContainer: {
    marginTop: 16,
  },
  tagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5F6368',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagsScrollView: {
    flexDirection: 'row',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  placeholderContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    minHeight: 120,
  },
  placeholderIcon: {
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    lineHeight: 24,
  },
});

export default SummaryDisplay;
