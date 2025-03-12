import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

export const ActionButton: React.FC = () => {
  const handleUpload = async () => {
    try {
      // lesson-form に直接遷移
      router.push('/lesson-form');
    } catch (err) {
      console.error(err);
      Alert.alert('エラー', '処理中にエラーが発生しました');
    }
  };

  return (
    <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
      <Text style={styles.uploadButtonText}>レッスンを記録</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  uploadButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ActionButton;
