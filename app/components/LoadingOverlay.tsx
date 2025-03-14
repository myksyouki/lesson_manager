import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

const LoadingOverlay = ({ message = '保存中...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  }
});

export default LoadingOverlay;
