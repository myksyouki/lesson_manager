import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

interface SummaryDisplayProps {
  summary: string | null;
  status: string | null;
  tags?: string[];
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary, status, tags = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const maxCharacters = 200; // 折りたたみ状態で表示する最大文字数
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const renderSummary = () => {
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
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    padding: 20,
    minHeight: 150,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
  summaryText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    letterSpacing: 0.2,
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
  expandButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginRight: 4,
  },
  tagsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagsScrollView: {
    marginHorizontal: -4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingHorizontal: 4,
  },
  tag: {
    backgroundColor: '#E8F0FD',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  tagText: {
    color: '#4285F4',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default SummaryDisplay;
