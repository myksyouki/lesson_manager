import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

interface SummaryDisplayProps {
  summary: string;
  status: string;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary, status }) => {
  return (
    <View style={styles.summaryBox}>
      {summary ? (
        <Text style={styles.summaryText}>{summary}</Text>
      ) : status === 'processing' ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#007AFF" style={styles.processingIndicator} />
          <Text style={styles.processingText}>音声ファイルを処理中...</Text>
        </View>
      ) : status === 'transcribed' ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#007AFF" style={styles.processingIndicator} />
          <Text style={styles.processingText}>文字起こしが完了しました。要約を生成中...</Text>
        </View>
      ) : (
        <Text style={styles.placeholderText}>AIサマリーはまだありません</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  summaryBox: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 100,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  processingIndicator: {
    marginRight: 10,
  },
  processingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default SummaryDisplay;
