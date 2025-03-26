import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLessonStore } from './store/lessons';
import LessonCard from './features/lessons/components/list/LessonCard';
import { useAuthStore } from './store/auth';
import { useRouter } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { auth } from './config/firebase';

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

  useEffect(() => {
    // ユーザー名の初期設定
    if (user?.displayName) {
      setDisplayName(user.displayName);
    } else {
      setDisplayName(DEFAULT_DISPLAY_NAME);
    }
  }, [user]);

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
});