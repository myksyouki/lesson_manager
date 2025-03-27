import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLessonStore } from './store/lessons';
import LessonCard from './features/lessons/components/list/LessonCard';
import { useAuthStore } from './store/auth';
import { useRouter, useFocusEffect } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { auth } from './config/firebase';
import { getUserInstrumentInfo, InstrumentInfo } from './services/userProfileService';

// デフォルト表示名
const DEFAULT_DISPLAY_NAME = '名称未設定';

export default function ProfileScreen() {
  const { getFavorites } = useLessonStore();
  const { user, setUser } = useAuthStore();
  const favoriteLesson = getFavorites();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);
  const [isLoadingInstrument, setIsLoadingInstrument] = useState(true);

  // 楽器情報を読み込む関数をコンポーネントレベルで定義
  const loadUserInstrument = async () => {
    try {
      setIsLoadingInstrument(true);
      // 常に最新情報を取得するためにforceRefreshをtrueに設定
      const updatedInfo = await getUserInstrumentInfo(true);
      console.log('=== 楽器情報デバッグ ===', updatedInfo);
      setInstrumentInfo(updatedInfo);
    } catch (error) {
      console.error('楽器情報取得エラー:', error);
    } finally {
      setIsLoadingInstrument(false);
    }
  };

  useEffect(() => {
    // ユーザー名の初期設定
    if (user?.displayName) {
      setDisplayName(user.displayName);
    } else {
      setDisplayName(DEFAULT_DISPLAY_NAME);
    }

    console.log('=== ユーザー情報デバッグ ===', user);
    
    // 初期ロード時に楽器情報を取得
    loadUserInstrument();
  }, [user]);

  // 画面がフォーカスされたときに楽器情報を再読み込み
  useFocusEffect(
    React.useCallback(() => {
      // プロフィール画面が表示されたときに楽器情報を更新
      loadUserInstrument();
    }, [])
  );

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    try {
      setIsSaving(true);
      
      // Firebaseの認証ユーザー情報を更新
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: displayName.trim()
        });
        
        // ローカルのユーザー状態も更新
        if (user) {
          setUser({
            ...user,
            displayName: displayName.trim()
          });
        }
        
        Alert.alert('成功', '表示名を更新しました');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('表示名の更新に失敗しました:', error);
      Alert.alert('エラー', '表示名の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 現在表示するべき名前を取得
  const getCurrentDisplayName = () => {
    return displayName || DEFAULT_DISPLAY_NAME;
  };

  // アバターに表示する頭文字を取得
  const getInitial = () => {
    if (displayName && displayName !== DEFAULT_DISPLAY_NAME) {
      return displayName.charAt(0).toUpperCase();
    }
    // メールアドレスがある場合はその頭文字
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    // どちらもない場合はデフォルト
    return 'U';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* プロフィール情報 */}
        <Text style={styles.mainHeader}>プロフィール</Text>
        <View style={styles.profileSection}>
          <View style={styles.userInfoContainer}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {getInitial()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              {isEditing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="表示名を入力"
                    maxLength={20}
                    autoFocus
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity 
                      style={[styles.editButton, styles.cancelButton]} 
                      onPress={() => {
                        setIsEditing(false);
                        // キャンセル時は元の表示名に戻す
                        if (user?.displayName) {
                          setDisplayName(user.displayName);
                        } else {
                          setDisplayName(DEFAULT_DISPLAY_NAME);
                        }
                      }}
                      disabled={isSaving}
                    >
                      <Text style={styles.cancelButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.editButton, styles.saveButton]} 
                      onPress={handleUpdateDisplayName}
                      disabled={isSaving}
                    >
                      <Text style={styles.saveButtonText}>
                        {isSaving ? '保存中...' : '保存'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.nameContainer}>
                  <Text style={styles.userName}>
                    {getCurrentDisplayName()}
                  </Text>
                  <TouchableOpacity 
                    style={styles.editNameButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <MaterialIcons name="edit" size={16} color="#007AFF" />
                    <Text style={styles.editNameText}>編集</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
          </View>
          
          {/* 楽器情報 */}
          <View style={styles.instrumentContainer}>
            <View style={styles.instrumentHeader}>
              <MaterialCommunityIcons name="saxophone" size={24} color="#007AFF" />
              <Text style={styles.instrumentTitle}>現在選択中の楽器</Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={loadUserInstrument}
                disabled={isLoadingInstrument}
              >
                <MaterialIcons name="refresh" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            {isLoadingInstrument ? (
              <Text style={styles.loadingText}>読み込み中...</Text>
            ) : instrumentInfo ? (
              <View style={styles.instrumentInfo}>
                <View style={styles.instrumentRow}>
                  <Text style={styles.instrumentLabel}>カテゴリ:</Text>
                  <Text style={styles.instrumentValue}>{instrumentInfo.categoryName}</Text>
                </View>
                <View style={styles.instrumentRow}>
                  <Text style={styles.instrumentLabel}>楽器:</Text>
                  <Text style={styles.instrumentValue}>{instrumentInfo.instrumentName}</Text>
                </View>
                <View style={styles.instrumentRow}>
                  <Text style={styles.instrumentLabel}>モデル:</Text>
                  <Text style={styles.instrumentValue}>
                    {instrumentInfo.modelName}
                    {instrumentInfo.isArtistModel && (
                      <Text style={styles.artistModelText}> (アーティストモデル)</Text>
                    )}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.changeInstrumentButton}
                  onPress={() => router.push('/instrument-settings')}
                >
                  <Text style={styles.changeInstrumentText}>楽器設定を変更</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.errorText}>楽器情報を取得できませんでした</Text>
            )}
          </View>
        </View>

        {/* お気に入りレッスン */}
        <Text style={styles.header}>お気に入りレッスン</Text>
        <View style={styles.lessonCardsContainer}>
          {favoriteLesson.length > 0 ? (
            favoriteLesson.map(lesson => (
              <View key={lesson.id} style={styles.lessonCardWrapper}>
                <LessonCard
                  lesson={lesson}
                  showFavoriteButton={true}
                  onPress={() => router.push(`/lesson-detail/${lesson.id}` as any)}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyFavorites}>
              <MaterialIcons name="favorite-border" size={48} color="#8E8E93" />
              <Text style={styles.emptyFavoritesText}>
                お気に入りのレッスンはまだありません
              </Text>
              <Text style={styles.emptyFavoritesSubtext}>
                レッスン一覧から♡マークをタップして追加できます
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* フッターに HOME に戻るボタン */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.push("/")}>
          <MaterialIcons name="home" size={24} color="white" />
          <Text style={styles.homeButtonText}>HOMEに戻る</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 20 },
  mainHeader: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  profileSection: {
    marginBottom: 30,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  editNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  editNameText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  editContainer: {
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F1F3F5',
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  header: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  lessonCardsContainer: {
    marginBottom: 24,
  },
  lessonCardWrapper: {
    marginBottom: 12,
  },
  emptyFavorites: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyFavoritesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyFavoritesSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 16,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // 新しく追加した楽器情報用スタイル
  instrumentContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
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
  instrumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  instrumentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
  },
  refreshButton: {
    padding: 8,
  },
  instrumentInfo: {
    paddingHorizontal: 4,
  },
  instrumentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  instrumentLabel: {
    fontSize: 16,
    color: '#666',
  },
  instrumentValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  artistModelText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '400',
  },
  changeInstrumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  changeInstrumentText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 12,
  },
});