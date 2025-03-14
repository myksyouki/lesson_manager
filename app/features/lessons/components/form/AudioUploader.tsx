import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface AudioUploaderProps {
  selectedFile: string | null;
  uploadProgress: number;
  isProcessing: boolean;
  processingStep: string;
  onUpload: () => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  selectedFile,
  uploadProgress,
  isProcessing,
  processingStep,
  onUpload,
}) => {
  const isIOS = Platform.OS === 'ios';

  return (
    <View style={styles.uploadSection}>
      <Text style={styles.sectionTitle}>レッスン録音</Text>
      
      {!selectedFile && !isProcessing && (
        <View>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={onUpload}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="white" />
            <Text style={styles.uploadButtonText}>音声ファイルを選択</Text>
          </TouchableOpacity>
          
          {isIOS && (
            <View style={styles.iosHelpContainer}>
              <Text style={styles.iosHelpText}>
                <Text style={styles.boldText}>iOSユーザーへの注意:</Text> ボイスメモから直接音声を選択するには、
                ボイスメモアプリで録音を選択し、共有ボタンをタップして「ファイル」を選択してください。
                その後、このアプリに戻って「音声ファイルを選択」をタップすると、保存した音声ファイルを選択できます。
              </Text>
            </View>
          )}
        </View>
      )}

      {selectedFile && !isProcessing && (
        <View style={styles.fileInfo}>
          <Ionicons name="document-attach" size={24} color="#007AFF" />
          <Text style={styles.fileName}>{selectedFile}</Text>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}
        </View>
      )}

      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>{processingStep}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  uploadSection: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1C1C1E',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'right',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  iosHelpContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  iosHelpText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
  },
});

export default AudioUploader;
