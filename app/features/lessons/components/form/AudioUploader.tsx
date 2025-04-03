import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../../theme';

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
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>音声ファイル</Text>
      <Text style={styles.description}>
        レッスン内容の音声ファイルをアップロードできます。（任意）
      </Text>
      
      {selectedFile ? (
        <View style={styles.selectedFileContainer}>
          <View style={styles.fileInfoContainer}>
            <MaterialIcons name="audio-file" size={24} color={theme.colors.primary} />
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
              {selectedFile.name}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={onClearFile}
          >
            <MaterialIcons name="close" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={onSelectFile}
        >
          <MaterialIcons name="file-upload" size={24} color={theme.colors.primary} />
          <Text style={styles.uploadButtonText}>ファイルを選択</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.fileNote}>
        サポートフォーマット: .mp3, .m4a, .wav (最大 100MB)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#e0eeff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  uploadButtonText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0eeff',
    backgroundColor: '#f8faff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  clearButton: {
    padding: 8,
  },
  fileNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AudioUploader;
