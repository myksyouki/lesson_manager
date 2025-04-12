import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { submitErrorReport, getDeviceInfoString } from '../services/errorReportService';

export default function ErrorReportScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeDeviceInfo, setIncludeDeviceInfo] = useState(true);

  const handleSubmit = async () => {
    // バリデーション
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    if (!description.trim()) {
      Alert.alert('エラー', '説明を入力してください');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // エラー報告データを作成
      const reportData = {
        title: title.trim(),
        description: description.trim(),
        deviceInfo: includeDeviceInfo ? await getDeviceInfoString() : undefined,
      };

      // エラー報告を送信
      const result = await submitErrorReport(reportData);

      if (result.success) {
        Alert.alert(
          '送信完了',
          'エラー報告を受け付けました。ご協力ありがとうございます。',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        throw new Error('送信に失敗しました');
      }
    } catch (error) {
      console.error('エラー報告送信エラー:', error);
      Alert.alert('エラー', '送信中にエラーが発生しました。後でもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>エラー報告</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            <Text style={styles.label}>タイトル <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="エラー内容を簡潔に"
              placeholderTextColor="#999"
              maxLength={100}
            />

            <Text style={styles.label}>詳細説明 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="発生した状況、操作手順、表示されたエラーメッセージなど"
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.optionRow}>
              <Text style={styles.checkboxLabel}>デバイス情報を含める（推奨）</Text>
              <Switch
                value={includeDeviceInfo}
                onValueChange={setIncludeDeviceInfo}
                trackColor={{ false: '#ccc', true: '#4A90E2' }}
                thumbColor={includeDeviceInfo ? '#007BFF' : '#f4f3f4'}
              />
            </View>

            <Text style={styles.note}>
              * エラー報告には個人を特定する情報は含まれません。デバイス情報は問題の特定に役立ちます。
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>報告を送信</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: 'red',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 120,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  note: {
    fontSize: 14,
    color: '#777',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 