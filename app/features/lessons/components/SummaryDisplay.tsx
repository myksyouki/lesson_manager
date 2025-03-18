import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';

interface SummaryDisplayProps {
  summary: string | null;
  status: string | null;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary, status }) => {
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
            <Text style={styles.expandButtonText}>もっと見る...</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AIサマリー</Text>
      {summary ? (
        renderSummary()
      ) : (
        <View style={styles.placeholderContainer}>
          {status === 'processing' && (
            <Text style={styles.placeholderText}>音声ファイルを処理中...</Text>
          )}
          {status === 'transcribing' && (
            <Text style={styles.placeholderText}>文字起こし中...</Text>
          )}
          {status === 'summarizing' && (
            <Text style={styles.placeholderText}>生成中・・・</Text>
          )}
          {status === 'completed' && !summary && (
            <Text style={styles.placeholderText}>音声ファイルがアップロードされていないため、AIサマリーは生成されません。</Text>
          )}
          {!status && (
            <Text style={styles.placeholderText}>音声ファイルがアップロードされていないため、AIサマリーは生成されません。</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 150,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  expandButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  expandButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default SummaryDisplay;
