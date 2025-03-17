import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AudioUploaderProps {
  selectedFile: { uri: string; name: string } | null;
  onSelectFile: () => void;
  onClearFile: () => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({
  selectedFile,
  onSelectFile,
  onClearFile,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>音声ファイル</Text>
      <Text style={styles.subtitle}>
        レッスン音声をアップロードすると、AIが自動で文字起こしと要約を行います
      </Text>
      
      {selectedFile ? (
        <View style={styles.selectedFileContainer}>
          <View style={styles.fileInfo}>
            <MaterialIcons name="audio-file" size={24} color="#4285F4" />
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
              {selectedFile.name}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onClearFile}
          >
            <MaterialIcons name="delete-outline" size={24} color="#5F6368" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onSelectFile}
        >
          <MaterialIcons name="upload-file" size={24} color="#4285F4" />
          <Text style={styles.uploadButtonText}>音声ファイルを選択</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.helperText}>
        サポートされている形式: MP3, WAV, M4A (最大20MB)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: '#5F6368',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4285F4',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#4285F4',
    marginLeft: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#202124',
    marginLeft: 8,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  removeButton: {
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default AudioUploader;
