import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, TouchableOpacity } from 'react-native';

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = '保存中...', 
  progress = 0, 
  showProgress = false,
  onCancel,
  showCancelButton = false
}) => {
  return (
    <View style={styles.container}>
      {!showProgress && <ActivityIndicator size="large" color="#007AFF" />}
      
      {showProgress && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${progress}%` }
              ]} 
            />
          </View>
        </View>
      )}
      
      <Text style={styles.text}>
        {message}
        {showProgress && ` (${Math.round(progress)}%)`}
      </Text>

      {showCancelButton && onCancel && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '80%',
    marginVertical: 10,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default LoadingOverlay;
