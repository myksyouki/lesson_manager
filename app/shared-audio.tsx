import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SharedAudioReceiver } from './features/sharing/SharedAudioReceiver';
import { useAuthStore } from './store/auth';
import { Button } from './components/ui/Button';

/**
 * 共有された音声ファイルを処理する画面
 */
export default function SharedAudioScreen() {
  const params = useLocalSearchParams<{ uri: string; fileName: string }>();
  const uri = params.uri as string;
  const fileName = params.fileName as string;
  const { user, isLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 認証状態の確認
    if (!isLoading && user) {
      setIsReady(true);
    }
  }, [isLoading, user]);

  const handleGoBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.text}>読み込み中...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>ログインが必要です</Text>
        <Button title="ホームに戻る" onPress={handleGoBack} style={styles.button} />
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>音声ファイルが見つかりません</Text>
        <Button title="ホームに戻る" onPress={handleGoBack} style={styles.button} />
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.text}>準備中...</Text>
      </View>
    );
  }

  return (
    <SharedAudioReceiver 
      uri={uri} 
      fileName={fileName || `shared_audio_${Date.now()}.m4a`} 
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    marginVertical: 10,
  },
});
