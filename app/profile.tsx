import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLessonStore } from '../store/lessons';
import LessonCard from './features/lessons/components/list/LessonCard';
import { useAuthStore } from '../store/auth';
import { useRouter, useFocusEffect } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  getUserInstrumentInfo, 
  InstrumentInfo, 
  getUserProfile, 
  createUserProfile, 
  UserProfile,
  saveUserProfile
} from '../services/userProfileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portal, Provider as PaperProvider, Menu, Button } from 'react-native-paper';

// AccountDeletionStatus型の定義
interface AccountDeletionStatus {
  isScheduledForDeletion: boolean;
  scheduledForDeletion: string | Date | null;
  remainingDays: number;
}

// デフォルト表示名
const DEFAULT_DISPLAY_NAME = '名称未設定';

// レベルのリスト
const SKILL_LEVELS = [
  { label: '初心者', value: 'beginner' },
  { label: '中級者', value: 'intermediate' },
  { label: '上級者', value: 'advanced' },
];

// 目標のリスト
const PRACTICE_GOALS = [
  { label: '趣味として楽しむ', value: 'hobby' },
  { label: '演奏技術の向上', value: 'improvement' },
  { label: 'コンサート/発表会出演', value: 'performance' },
  { label: 'プロを目指す', value: 'professional' },
];

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

  // 追加：ユーザープロファイル関連
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [practiceGoal, setPracticeGoal] = useState('hobby');
  const [showSkillLevelMenu, setShowSkillLevelMenu] = useState(false);
  const [showPracticeGoalMenu, setShowPracticeGoalMenu] = useState(false);

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

  // 追加：プロフィール情報を読み込む関数
  const loadUserProfileData = async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
        setUserProfile(profile);
        setSkillLevel(profile.skillLevel || 'beginner');
        setPracticeGoal(profile.practiceGoal || 'hobby');
      }
    } catch (error) {
      console.error('プロフィール情報取得エラー:', error);
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
    // 追加：プロフィール情報を取得
    loadUserProfileData();
  }, [user]);

  // 画面がフォーカスされたときに楽器情報を再読み込み
  useFocusEffect(
    React.useCallback(() => {
      // プロフィール画面が表示されたときに楽器情報を更新
      loadUserInstrument();
      // 追加：プロフィール情報も更新
      loadUserProfileData();
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

  // 追加：プロフィール設定を保存する関数
  const handleSaveUserProfile = async () => {
    setIsSaving(true);
    
    try {
      // プロフィール情報を保存
      await saveUserProfile({
        skillLevel,
        practiceGoal,
        ...userProfile
      });
      
      setIsEditingProfile(false);
      Alert.alert('成功', 'プロフィール設定を更新しました');
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
      Alert.alert('エラー', 'プロフィール設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToInstrumentSettings = () => {
    router.push('/instrument-settings');
  };

  // 追加：スキルレベルの表示名を取得
  const getSkillLevelLabel = (value: string) => {
    const level = SKILL_LEVELS.find(item => item.value === value);
    return level ? level.label : '未設定';
  };

  // 追加：練習目標の表示名を取得
  const getPracticeGoalLabel = (value: string) => {
    const goal = PRACTICE_GOALS.find(item => item.value === value);
    return goal ? goal.label : '未設定';
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
      {/* 戻るボタン */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        <Text style={styles.backButtonText}>戻る</Text>
      </TouchableOpacity>
      
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
        
        {/* プロフィールカード */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitial()}</Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              {isEditing ? (
                <View style={styles.editNameContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="表示名を入力"
                    maxLength={20}
                    autoFocus
                  />
                  <View style={styles.editButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.smallButton, styles.cancelButton]} 
                      onPress={() => {
                        setIsEditing(false);
                        setDisplayName(user?.displayName || DEFAULT_DISPLAY_NAME);
                      }}
                    >
                      <Text style={styles.smallButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.smallButton, styles.saveButton]}
                      onPress={handleUpdateProfile}
                      disabled={isSaving}
                    >
                      <Text style={styles.smallButtonText}>
                        {isSaving ? '保存中...' : '保存'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.nameContainer}>
                    <Text style={styles.displayName}>{getCurrentDisplayName()}</Text>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => setIsEditing(true)}
                    >
                      <MaterialIcons name="edit" size={16} color="#007AFF" />
                      <Text style={styles.editButtonText}>編集</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* 追加：プロフィール設定カード */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person-outline" size={22} color="#555" />
            <Text style={styles.sectionTitle}>プロフィール設定</Text>
            {!isEditingProfile ? (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setIsEditingProfile(true)}
              >
                <MaterialIcons name="edit" size={16} color="#007AFF" />
                <Text style={styles.editButtonText}>編集</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveUserProfile}
                disabled={isSaving}
              >
                <Text style={styles.smallButtonText}>
                  {isSaving ? '保存中...' : '保存'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.sectionContent}>
            {/* スキルレベル */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>スキルレベル</Text>
              {isEditingProfile ? (
                <Menu
                  visible={showSkillLevelMenu}
                  onDismiss={() => setShowSkillLevelMenu(false)}
                  anchor={
                    <TouchableOpacity 
                      style={styles.dropdownButton}
                      onPress={() => setShowSkillLevelMenu(true)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {getSkillLevelLabel(skillLevel)}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color="#555" />
                    </TouchableOpacity>
                  }
                >
                  {SKILL_LEVELS.map((level) => (
                    <Menu.Item 
                      key={level.value}
                      onPress={() => {
                        setSkillLevel(level.value);
                        setShowSkillLevelMenu(false);
                      }} 
                      title={level.label} 
                    />
                  ))}
                </Menu>
              ) : (
                <Text style={styles.settingValue}>{getSkillLevelLabel(skillLevel)}</Text>
              )}
            </View>

            {/* 練習目標 */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>練習目標</Text>
              {isEditingProfile ? (
                <Menu
                  visible={showPracticeGoalMenu}
                  onDismiss={() => setShowPracticeGoalMenu(false)}
                  anchor={
                    <TouchableOpacity 
                      style={styles.dropdownButton}
                      onPress={() => setShowPracticeGoalMenu(true)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {getPracticeGoalLabel(practiceGoal)}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color="#555" />
                    </TouchableOpacity>
                  }
                >
                  {PRACTICE_GOALS.map((goal) => (
                    <Menu.Item 
                      key={goal.value}
                      onPress={() => {
                        setPracticeGoal(goal.value);
                        setShowPracticeGoalMenu(false);
                      }} 
                      title={goal.label} 
                    />
                  ))}
                </Menu>
              ) : (
                <Text style={styles.settingValue}>{getPracticeGoalLabel(practiceGoal)}</Text>
              )}
            </View>
          </View>
        </View>
        
        {/* 楽器設定カード */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="saxophone" size={22} color="#555" />
            <Text style={styles.sectionTitle}>楽器設定</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={navigateToInstrumentSettings}
            >
              <MaterialIcons name="edit" size={16} color="#007AFF" />
              <Text style={styles.editButtonText}>変更</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.sectionContent}>
            {isLoadingInstrument ? (
              <Text style={styles.loadingText}>読み込み中...</Text>
            ) : (
              <>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>カテゴリー</Text>
                  <Text style={styles.settingValue}>{instrumentInfo?.categoryName || '未設定'}</Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>楽器</Text>
                  <Text style={styles.settingValue}>{instrumentInfo?.instrumentName || '未設定'}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        
        {/* アカウント管理カード */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="security" size={22} color="#555" />
            <Text style={styles.sectionTitle}>アカウント管理</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={openDeleteModal}
          >
            <MaterialIcons name="delete-forever" size={20} color="#f44336" />
            <Text style={styles.dangerButtonText}>アカウントを削除</Text>
          </TouchableOpacity>
          
          <Text style={styles.dangerNote}>
            アカウントを削除すると、すべてのデータが完全に削除されます。
            この操作は取り消せません。
          </Text>
        </View>
        
        <View style={styles.footer} />
      </ScrollView>

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
              アカウントを削除するには、パスワードを入力してください。
              削除は30日後に完了し、その間はログインしてキャンセルできます。
            </Text>
            
            <TextInput
              style={styles.passwordInput}
              placeholder="パスワードを入力"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            
            {deleteError && (
              <Text style={styles.deleteErrorText}>{deleteError}</Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setPassword('');
                  setDeleteError(null);
                }}
              >
                <Text style={styles.cancelModalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.deleteModalButton,
                  { opacity: password ? 1 : 0.5 }
                ]}
                onPress={handleScheduleAccountDeletion}
                disabled={!password || isDeleting}
              >
                <Text style={styles.deleteModalButtonText}>
                  {isDeleting ? '処理中...' : '削除を予約'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  mainHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
    color: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 4,
  },
  editNameContainer: {
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  sectionContent: {
    
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    padding: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  dangerButtonText: {
    color: '#f44336',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  dangerNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    lineHeight: 16,
  },
  footer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    color: '#333',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 16,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  deleteErrorText: {
    color: '#f44336',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  cancelModalButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  deleteModalButton: {
    backgroundColor: '#f44336',
    marginLeft: 8,
  },
  deleteModalButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  deletionWarning: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e65100',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deletionWarningContent: {
    marginLeft: 12,
    flex: 1,
  },
  deletionWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  countdownDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelDeletionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e65100',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  cancelDeletionButtonText: {
    color: '#e65100',
    fontWeight: '500',
    fontSize: 14,
  },
  // 追加：プロフィール設定関連スタイル
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
});