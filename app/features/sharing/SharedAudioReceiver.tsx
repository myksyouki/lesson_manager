import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { handleSharedAudioFile, copySharedFileToTemp } from '../../services/sharingService';
import { useLessonStore } from '../../store/lessons';
import { useAuthStore } from '../../store/auth';
import { Button } from '../../components/ui/Button';
import { auth } from '../../config/firebase';

interface SharedAudioReceiverProps {
  uri: string;
  fileName: string;
}

/**
 * 共有された音声ファイルを受け取り、処理するコンポーネント
 */
export const SharedAudioReceiver: React.FC<SharedAudioReceiverProps> = ({ uri, fileName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { fetchLessons } = useLessonStore();

  useEffect(() => {
    // URIとファイル名が存在し、かつユーザーがログインしていて、かつURIとファイル名が空文字やundefinedでない場合のみ処理を実行
    if (uri && 
        fileName && 
        user && 
        uri !== 'undefined' && 
        fileName !== 'undefined' && 
        uri !== '' && 
        fileName !== '' &&
        uri.length > 5) { // 最低限の長さチェック
      
      console.log('共有音声ファイルの処理を開始します:', { uri, fileName });
      const processSharedFile = async () => {
        try {
          setLoading(true);
          
          // ファイルURIを一時ディレクトリにコピー
          let tempUri;
          try {
            tempUri = await copySharedFileToTemp(uri, fileName);
            console.log('コピーされたファイルURI:', tempUri);
          } catch (copyError) {
            console.error('ファイルコピーエラー:', copyError);
            setError('ファイルのコピー中にエラーが発生しました。別のファイルを試してください。');
            setLoading(false);
            return;
          }
          
          // 音声ファイルを処理
          try {
            const result = await handleSharedAudioFile(tempUri, fileName);
            
            if (result.success) {
              setLessonId(result.lessonId || null);
              // レッスン一覧を更新（ユーザーIDを渡す）
              if (user) {
                fetchLessons(user.uid);
              }
              // 共有機能からの処理の場合のみアラートを表示
              if (uri && uri.startsWith('file://') && uri.length > 10) {
                Alert.alert('成功', '音声ファイルの処理を開始しました');
              }
            } else {
              console.error('処理エラー:', result.error);
              setError(result.error || '音声ファイルの処理中にエラーが発生しました');
            }
          } catch (processError) {
            console.error('音声処理エラー:', processError);
            
            // エラーメッセージをより具体的に
            let errorMessage = '音声ファイルの処理中にエラーが発生しました。';
            
            if (processError instanceof Error) {
              if (processError.message.includes('crypto.getRandomValues()')) {
                errorMessage = 'ファイルの一意識別子生成に問題が発生しました。アプリを再起動してお試しください。';
              } else if (processError.message.includes('ファイルのアップロード')) {
                errorMessage = 'ファイルのアップロードに失敗しました。ネットワーク接続を確認してください。';
              }
            }
            
            setError(errorMessage);
          }
        } catch (err: any) {
          console.error('共有ファイル処理エラー:', err);
          setError(err.message || '予期せぬエラーが発生しました');
        } finally {
          setLoading(false);
        }
      };

      processSharedFile();
    } else {
      console.log('共有音声ファイルの処理をスキップします:', { uri, fileName, userLoggedIn: !!user });
    }
  }, [uri, fileName, user]); // 依存配列にuriとfileNameとuserを追加

  const handleGoToLesson = () => {
    if (lessonId) {
      router.push({
        pathname: '/lesson-detail',
        params: { id: lessonId }
      });
    } else {
      router.push('/');
    }
  };

  const handleGoToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.text}>音声ファイルを処理中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>エラー: {error}</Text>
        <Button 
          title="ホームに戻る"
          onPress={handleGoToHome} 
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.successText}>音声ファイルの処理を開始しました</Text>
      <Text style={styles.infoText}>
        音声の文字起こしと要約が完了するまで数分かかる場合があります。
      </Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="レッスン詳細を見る"
          onPress={handleGoToLesson} 
          style={styles.button}
        />
        <Button 
          title="ホームに戻る"
          onPress={handleGoToHome} 
          style={styles.button}
        />
      </View>
    </View>
  );
};

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
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  button: {
    marginVertical: 10,
  },
});
