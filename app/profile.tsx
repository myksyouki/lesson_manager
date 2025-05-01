import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLessonStore } from '../store/lessons';
import LessonCard from './features/lessons/components/list/LessonCard';
import { useAuthStore } from '../store/auth';
import { useRouter, useFocusEffect } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserInstrumentInfo, InstrumentInfo, getUserProfile, createUserProfile, UserProfile } from '../services/userProfileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portal, Provider as PaperProvider } from 'react-native-paper';

// AccountDeletionStatus型の定義
interface AccountDeletionStatus {
  isScheduledForDeletion: boolean;
  scheduledForDeletion: string | Date | null;
  remainingDays: number;
}

// デフォルト表示名
const DEFAULT_DISPLAY_NAME = '名称未設定';

export default function ProfileScreen() {
  const { getFavorites } = useLessonStore();
  const { 
    user, 
    setUser,
    scheduleAccountDeletion,
    cancelAccountDeletion,
    deletionStatus,
    checkDeletionStatus
  } = useAuthStore();
  const favoriteLesson = getFavorites();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);
  const [isLoadingInstrument, setIsLoadingInstrument] = useState(true);
  
  // アカウント削除関連の状態
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // 削除ステータスのチェック
  useEffect(() => {
    if (typeof checkDeletionStatus === 'function' && user && user.uid) {
      // ユーザーが確実にログインしているときのみ実行
      checkDeletionStatus();
      
      // 5分ごとに確認（残り日数が常に最新になるように）
      const interval = setInterval(() => {
        // エラーをキャッチして確実に実行を続ける
        try {
          checkDeletionStatus();
        } catch (error) {
          console.error('定期チェック中のエラー:', error);
        }
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [checkDeletionStatus, user]);

  const handleUpdateProfile = async () => {
    if (!displayName) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    setIsSaving(true);
    
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName
        });
        
        // ストアのユーザー情報も更新
        if (user) {
          setUser({
            ...user,
            displayName: displayName
          });
        }
        
        setIsEditing(false);
        Alert.alert('成功', '表示名を更新しました');
      } else {
        throw new Error('認証情報がありません');
      }
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToInstrumentSettings = () => {
    router.push('/instrument-settings');
  };

  const handleScheduleAccountDeletion = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await scheduleAccountDeletion(password);
      setShowDeleteModal(false);
      setPassword('');
      Alert.alert('アカウント削除予約完了', '30日後にアカウントが完全に削除されます。それまでは通常通りご利用いただけます。');
    } catch (error: any) {
      setDeleteError(error.message || '削除予約に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelAccountDeletion = async () => {
    setIsProcessingCancel(true);
    
    try {
      await cancelAccountDeletion();
      Alert.alert('削除キャンセル完了', 'アカウント削除予約をキャンセルしました。このままサービスをご利用いただけます。');
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'キャンセル処理に失敗しました');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const openDeleteModal = () => {
    Alert.alert(
      'アカウント削除',
      'アカウントを削除すると、すべてのデータが30日後に完全に削除されます。この操作は取り消せません。\n\n続行しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '削除を予約する',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true)
        }
      ],
      { cancelable: true }
    );
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

  // 削除予定日をYYYY年MM月DD日の形式にフォーマットする関数
  const formatDeletionDate = (date: string | Date | null): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // 残り日数を日本語でフォーマットする関数
  const formatRemainingDays = (days: number): string => {
    if (days <= 0) return '今日';
    if (days === 1) return 'あと1日';
    return `あと${days}日`;
  };

  return (
    <PaperProvider>
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* プロフィール情報 */}
        <Text style={styles.mainHeader}>プロフィール</Text>
        
        {/* 削除予約中の警告表示 */}
        {deletionStatus?.isScheduledForDeletion && (
          <View style={styles.deletionWarning}>
            <MaterialCommunityIcons name="alert" size={24} color="#e65100" />
            <View style={styles.deletionWarningContent}>
              <Text style={styles.deletionWarningTitle}>アカウント削除が予約されています</Text>
              
              <View style={styles.countdownDisplay}>
                <MaterialIcons name="timer" size={22} color="#d32f2f" />
                <Text style={{color: '#d32f2f', fontWeight: '500'}}>
                  {formatDeletionDate(deletionStatus.scheduledForDeletion)}に削除されます（残り {deletionStatus.remainingDays} 日）
                </Text>
              </View>
              
              <Text style={styles.deletionWarningText}>
                予約をキャンセルしない場合、上記の日付にあなたのアカウント情報、予約履歴、および関連するすべてのデータが完全に削除されます。この操作は取り消せません。
              </Text>
              
              <TouchableOpacity
                style={styles.cancelDeletionButton}
                onPress={handleCancelAccountDeletion}
                disabled={isProcessingCancel}
              >
                <Text style={styles.cancelDeletionButtonText}>
                  {isProcessingCancel ? '処理中...' : '削除をキャンセルする'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
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
                        onPress={handleUpdateProfile}
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
              <MaterialCommunityIcons name="music" size={24} color="#007AFF" />
              <Text style={styles.instrumentTitle}>現在選択中の楽器</Text>
            </View>
            
            {isLoadingInstrument ? (
              <Text style={styles.loadingText}>読み込み中...</Text>
            ) : instrumentInfo ? (
              <View style={styles.currentInstrument}>
                <Text style={styles.instrumentValue}>
                  {instrumentInfo.categoryName} / {instrumentInfo.instrumentName}
                  {instrumentInfo.modelName ? ` / ${instrumentInfo.modelName}` : ''}
                </Text>
                <TouchableOpacity 
                  style={styles.settingsButton}
                  onPress={navigateToInstrumentSettings}
                >
                  <MaterialIcons name="settings" size={16} color="#007AFF" />
                  <Text style={styles.settingsButtonText}>変更</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noInstrument}>
                <Text style={styles.noInstrumentText}>楽器が設定されていません</Text>
                <TouchableOpacity 
                  style={styles.settingsButton}
                  onPress={navigateToInstrumentSettings}
                >
                  <MaterialIcons name="add" size={16} color="#007AFF" />
                  <Text style={styles.settingsButtonText}>設定する</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* お気に入りレッスン */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionHeader}>お気に入りレッスン</Text>
          {favoriteLesson.length > 0 ? (
            favoriteLesson.map(lesson => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))
          ) : (
            <Text style={styles.emptyMessage}>お気に入りに追加したレッスンはまだありません</Text>
          )}
        </View>

        {/* アカウント設定 */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionHeader}>アカウント</Text>
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={openDeleteModal}
          >
            <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
            <Text style={styles.settingsItemTextDanger}>アカウント削除</Text>
          </TouchableOpacity>
        </View>
        
        {/* アカウント削除モーダル */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showDeleteModal}
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>アカウント削除の確認</Text>
              <Text style={styles.modalText}>
                アカウントを削除すると、すべてのデータが30日後に完全に削除されます。この操作は取り消せません。
              </Text>
              <Text style={styles.modalText}>
                削除を確認するためにパスワードを入力してください。
              </Text>
              
              <TextInput
                style={styles.passwordInput}
                placeholder="パスワードを入力"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              
              {deleteError && (
                <Text style={styles.errorText}>{deleteError}</Text>
              )}
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#E0E0E0' }]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setPassword('');
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  <Text style={[styles.modalButtonText, { color: '#333' }]}>キャンセル</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
                  onPress={handleScheduleAccountDeletion}
                  disabled={!password || isDeleting}
                >
                  <Text style={styles.modalButtonText}>
                    {isDeleting ? '処理中...' : '削除を予約'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
    </PaperProvider>
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
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#6e6e6e',
  },
  editNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  editNameText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 2,
  },
  editContainer: {
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#C8C8C8',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    color: '#3A3A3C',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  instrumentContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
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
  },
  instrumentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  currentInstrument: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instrumentValue: {
    fontSize: 15,
    color: '#3A3A3C',
    flex: 1,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
  },
  settingsButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
  },
  noInstrument: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noInstrumentText: {
    fontSize: 15,
    color: '#8E8E93',
    flex: 1,
  },
  loadingText: {
    fontSize: 15,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingsItemTextDanger: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 12,
  },
  emptyMessage: {
    fontSize: 15,
    color: '#8E8E93',
    fontStyle: 'italic',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deletionWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCCBC',
  },
  deletionWarningContent: {
    flex: 1,
    marginLeft: 12,
  },
  deletionWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  deletionWarningText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  countdownDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  cancelDeletionButton: {
    backgroundColor: '#e65100',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelDeletionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});