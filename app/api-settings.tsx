import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from './config/firebase';
import { useAuthStore } from './store/auth';

// API設定の型定義
interface ApiSettings {
  flowType: 'separate' | 'custom';
  transcriptionApi: 'whisper' | 'speech-to-text';
  summaryApi: 'dify' | 'gemini';
}

// デフォルト設定
const defaultSettings: ApiSettings = {
  flowType: 'separate',
  transcriptionApi: 'whisper',
  summaryApi: 'dify'
};

export default function ApiSettingsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<ApiSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    loadSettings();
  }, []);

  // 設定の読み込み
  const loadSettings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const userSettingsRef = doc(collection(db, 'users', user.uid, 'settings'), 'apiPreferences');
      const settingsDoc = await getDoc(userSettingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as ApiSettings;
        setSettings({
          flowType: data.flowType || defaultSettings.flowType,
          transcriptionApi: data.transcriptionApi || defaultSettings.transcriptionApi,
          summaryApi: data.summaryApi || defaultSettings.summaryApi
        });
      }
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 設定の保存
  const saveSettings = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    setIsSaving(true);
    try {
      const userSettingsRef = doc(collection(db, 'users', user.uid, 'settings'), 'apiPreferences');
      await setDoc(userSettingsRef, settings, { merge: true });
      Alert.alert('完了', '設定を保存しました');
    } catch (error) {
      console.error('設定の保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 設定の更新
  const updateSettings = (key: keyof ApiSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.title}>AI処理設定</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>処理フロー</Text>
              <Text style={styles.description}>音声処理のワークフローを選択します</Text>
              
              <TouchableOpacity
                style={[
                  styles.option,
                  settings.flowType === 'separate' && styles.selectedOption
                ]}
                onPress={() => updateSettings('flowType', 'separate')}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>個別APIの選択</Text>
                  <Text style={styles.optionDescription}>文字起こしと要約に異なるAPIを使用する</Text>
                </View>
                {settings.flowType === 'separate' && (
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.option,
                  settings.flowType === 'custom' && styles.selectedOption
                ]}
                onPress={() => updateSettings('flowType', 'custom')}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>カスタムフロー</Text>
                  <Text style={styles.optionDescription}>Whisper + OpenAI(要約) + Gemini 1.5 Flash(タグ)</Text>
                </View>
                {settings.flowType === 'custom' && (
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            {settings.flowType === 'separate' && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>文字起こしAPI</Text>
                  <Text style={styles.description}>音声データから文字起こしを行うAIサービスを選択します</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.option,
                      settings.transcriptionApi === 'whisper' && styles.selectedOption
                    ]}
                    onPress={() => updateSettings('transcriptionApi', 'whisper')}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>OpenAI Whisper</Text>
                      <Text style={styles.optionDescription}>高精度な文字起こし。ファイルサイズの制限あり（25MB）</Text>
                    </View>
                    {settings.transcriptionApi === 'whisper' && (
                      <MaterialIcons name="check" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.option,
                      settings.transcriptionApi === 'speech-to-text' && styles.selectedOption
                    ]}
                    onPress={() => updateSettings('transcriptionApi', 'speech-to-text')}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Google Speech-to-Text</Text>
                      <Text style={styles.optionDescription}>より大きなファイルサイズに対応。長時間録音向け</Text>
                    </View>
                    {settings.transcriptionApi === 'speech-to-text' && (
                      <MaterialIcons name="check" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>要約・タグ生成API</Text>
                  <Text style={styles.description}>文字起こしデータから要約とタグを生成するAIサービスを選択します</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.option,
                      settings.summaryApi === 'dify' && styles.selectedOption
                    ]}
                    onPress={() => updateSettings('summaryApi', 'dify')}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Dify (OpenAI)</Text>
                      <Text style={styles.optionDescription}>詳細な要約とタグを生成。GPT-4モデルを使用</Text>
                    </View>
                    {settings.summaryApi === 'dify' && (
                      <MaterialIcons name="check" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.option,
                      settings.summaryApi === 'gemini' && styles.selectedOption
                    ]}
                    onPress={() => updateSettings('summaryApi', 'gemini')}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Google Gemini</Text>
                      <Text style={styles.optionDescription}>高速な要約生成。より短い要約とキーポイントを提供</Text>
                    </View>
                    {settings.summaryApi === 'gemini' && (
                      <MaterialIcons name="check" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {settings.flowType === 'custom' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>カスタムフロー詳細</Text>
                <Text style={styles.description}>このフローでは以下の処理が行われます</Text>
                
                <View style={styles.infoCard}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>文字起こし:</Text>
                    <Text style={styles.infoValue}>OpenAI Whisper</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>音声分割:</Text>
                    <Text style={styles.infoValue}>あり（25MB制限対応）</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>要約生成:</Text>
                    <Text style={styles.infoValue}>OpenAI（Dify経由）</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>タグ生成:</Text>
                    <Text style={styles.infoValue}>Gemini 1.5 Flash</Text>
                  </View>
                </View>
                
                <Text style={styles.noteText}>
                  注意: このフローでは音声ファイルは自動的に分割され、Whisperの25MB制限を回避します。
                  文字起こし結果は一つの文章にまとめられた後、要約と別々にタグ生成が行われます。
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.savingButton]}
              onPress={saveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialIcons name="save" size={24} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>設定を保存</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  infoValue: {
    fontSize: 15,
    color: '#0056B3',
    fontWeight: '500',
  },
  noteText: {
    fontSize: 14,
    color: '#505050',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  savingButton: {
    backgroundColor: '#80BDFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
}); 