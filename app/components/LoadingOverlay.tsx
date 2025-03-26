import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, ProgressBarAndroid } from 'react-native';

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = '保存中...', 
  progress = 0, 
  showProgress = false 
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
  }
});

export default LoadingOverlay;
