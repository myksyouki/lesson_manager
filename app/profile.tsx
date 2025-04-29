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
import { RadioButton, Menu, Button } from 'react-native-paper';

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
    checkDeletionStatus,
    isNewUser,
    setIsNewUser
  } = useAuthStore();
  const favoriteLesson = getFavorites();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);
  const [isLoadingInstrument, setIsLoadingInstrument] = useState(true);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [practiceGoal, setPracticeGoal] = useState('hobby');
  
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

  // プロフィール情報を読み込む
  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
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
    loadUserProfile();
    
    // 新規ユーザーの場合は編集モードをデフォルトで有効に
    if (isNewUser) {
      setIsEditing(true);
    }
  }, [user, isNewUser]);

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
    } else {
      console.error('checkDeletionStatus is not available or user not logged in:', checkDeletionStatus);
    }
  }, [checkDeletionStatus, user]);

  // 画面を離れるときに新規ユーザーフラグをリセット
  useEffect(() => {
    return () => {
      if (isNewUser) {
        setIsNewUser(false);
      }
    };
  }, [isNewUser, setIsNewUser]);

  // プロフィール情報を更新
  const handleUpdateProfile = async () => {
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
        
        // プロフィール情報を更新
        const updatedProfile: Partial<UserProfile> = {
          displayName: displayName.trim(),
          skillLevel,
          practiceGoal,
        };
        await createUserProfile(updatedProfile);
        
        // ローカルのユーザー状態も更新
        if (user) {
          setUser({
            ...user,
            displayName: displayName.trim()
          });
        }
        
        Alert.alert('成功', 'プロフィールを更新しました');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('プロフィールの更新に失敗しました:', error);
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // アカウント削除予約処理
  const handleScheduleAccountDeletion = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await scheduleAccountDeletion('');  // 空文字列を渡す
      setShowDeleteModal(false);
      setPassword('');
    } catch (error: any) {
      console.error('アカウント削除予約エラー:', error);
      setDeleteError(error.message || 'アカウント削除予約中にエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  // 削除予約キャンセル処理
  const handleCancelAccountDeletion = async () => {
    setIsProcessingCancel(true);
    try {
      await cancelAccountDeletion();
      // 成功メッセージはストアで表示
    } catch (error: any) {
      Alert.alert('エラー', '削除予約のキャンセルに失敗しました');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // 削除確認モーダルを表示
  const openDeleteModal = () => {
    Alert.alert(
      'アカウント削除の確認',
      'アカウントを削除すると、すべてのデータが完全に削除され、復元できません。30日間の猶予期間があり、この間はキャンセル可能です。続行しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: handleScheduleAccountDeletion,  // モーダル表示せずに直接削除予約処理を実行
        },
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* プロフィール情報 */}
        <Text style={styles.mainHeader}>プロフィール</Text>
        
        {/* 新規ユーザー向け歓迎メッセージ */}
        {isNewUser && (
          <View style={styles.welcomeContainer}>
            <MaterialIcons name="emoji-people" size={24} color="#4285F4" />
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>ようこそ！詳細設定を完了しましょう</Text>
              <Text style={styles.welcomeText}>
                プロフィール情報と楽器設定を入力して、パーソナライズされた体験を始めましょう。
                これらの情報は後でいつでも変更できます。
              </Text>
            </View>
          </View>
        )}
        
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
                  <Text style={styles.instrumentLabel}>プラン:</Text>
                  <Text style={styles.instrumentValue}>
                    {instrumentInfo.isArtistModel
                      ? 'プロフェッショナルプラン'
                      : instrumentInfo.modelName.replace('モデル','プラン')}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={isNewUser ? styles.changeInstrumentButtonHighlighted : styles.changeInstrumentButton}
                  onPress={() => router.push('/instrument-settings')}
                >
                  <Text style={isNewUser ? styles.changeInstrumentTextHighlighted : styles.changeInstrumentText}>
                    {isNewUser ? '楽器設定をしましょう' : '楽器設定を変更'}
                  </Text>
                  <MaterialIcons 
                    name="arrow-forward" 
                    size={16} 
                    color={isNewUser ? "#FFFFFF" : "#007AFF"} 
                  />
                </TouchableOpacity>
                
                {isNewUser && (
                  <Text style={styles.instrumentTip}>
                    楽器設定をすることで、あなたに最適な練習メニューが提案されます
                  </Text>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.errorText}>楽器情報を取得できませんでした</Text>
                <TouchableOpacity 
                  style={styles.changeInstrumentButtonHighlighted}
                  onPress={() => router.push('/instrument-settings')}
                >
                  <Text style={styles.changeInstrumentTextHighlighted}>楽器設定をする</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* 演奏レベルと練習目標の設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>演奏設定</Text>
          
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>演奏レベル</Text>
            <View style={styles.radioGroup}>
              {SKILL_LEVELS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.radioOption}
                  onPress={() => setSkillLevel(item.value)}
                >
                  <RadioButton
                    value={item.value}
                    status={skillLevel === item.value ? 'checked' : 'unchecked'}
                    onPress={() => setSkillLevel(item.value)}
                    color="#4285F4"
                  />
                  <Text style={styles.radioLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>練習の目標</Text>
            <View style={styles.radioGroup}>
              {PRACTICE_GOALS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.radioOption}
                  onPress={() => setPracticeGoal(item.value)}
                >
                  <RadioButton
                    value={item.value}
                    status={practiceGoal === item.value ? 'checked' : 'unchecked'}
                    onPress={() => setPracticeGoal(item.value)}
                    color="#4285F4"
                  />
                  <Text style={styles.radioLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.updateButton,
              { opacity: isSaving ? 0.7 : 1 }
            ]}
            onPress={handleUpdateProfile}
            disabled={isSaving}
          >
            <Text style={styles.updateButtonText}>
              {isSaving ? '更新中...' : '設定を保存'}
            </Text>
          </TouchableOpacity>
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
        
        {/* アカウント削除セクション - ここに移動 */}
        <View style={[styles.deleteAccountSection, styles.bottomSection]}>
          <Text style={styles.deleteAccountTitle}>アカウント管理</Text>
          <Text style={styles.deleteAccountDescription}>
            アカウントを削除すると、すべてのデータ（レッスン、課題、設定など）が完全に削除され、復元できません。
            削除予約後、30日間の猶予期間があり、この期間内であればキャンセルが可能です。
          </Text>
          {!deletionStatus?.isScheduledForDeletion ? (
            <TouchableOpacity 
              style={styles.deleteAccountButton}
              onPress={openDeleteModal}
            >
              <MaterialIcons name="delete-forever" size={18} color="#fff" />
              <Text style={styles.deleteAccountButtonText}>アカウントを削除する</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.deletionScheduledContainer}>
              <View style={styles.countdownDisplay}>
                <MaterialIcons name="timer" size={22} color="#d32f2f" />
                <Text style={styles.deletionScheduledText}>
                  {formatDeletionDate(deletionStatus.scheduledForDeletion)}に削除されます
                </Text>
                <Text style={styles.countdownDays}>
                  （残り{deletionStatus.remainingDays}日）
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.cancelDeletionButtonAlt}
                onPress={handleCancelAccountDeletion}
                disabled={isProcessingCancel}
              >
                <MaterialIcons name="restore" size={18} color="#007AFF" />
                <Text style={styles.cancelDeletionButtonAltText}>
                  {isProcessingCancel ? '処理中...' : '削除をキャンセルする'}
                </Text>
              </TouchableOpacity>
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

      {/* アカウント削除確認モーダル - 不要なので削除または非表示に */}
      <Modal
        visible={false}  // 常に非表示に変更
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>アカウント削除の確認</Text>
            <Text style={styles.modalText}>
              アカウントの削除を予約します。
              削除は30日後に実行され、それまでの間はいつでもキャンセルできます。
            </Text>
            
            {deleteError && (
              <Text style={styles.errorText}>{deleteError}</Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setPassword('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelModalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleScheduleAccountDeletion}
                disabled={isDeleting}
              >
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? '処理中...' : '削除を予約する'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  changeInstrumentButtonHighlighted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  changeInstrumentTextHighlighted: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 4,
  },
  instrumentTip: {
    fontSize: 14,
    color: '#4A6572',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 12,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
    fontSize: 14,
  },
  // アカウント削除関連のスタイル
  deleteAccountSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  deleteAccountTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  deleteAccountDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteAccountButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // モーダル関連のスタイル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
    color: '#333',
    textAlign: 'center',
  },
  passwordInput: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelModalButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // 削除予約中の警告表示
  deletionWarning: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    alignItems: 'flex-start',
  },
  deletionWarningContent: {
    flex: 1,
    marginLeft: 12,
  },
  deletionWarningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  deletionWarningText: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
    lineHeight: 20,
  },
  cancelDeletionButton: {
    backgroundColor: '#e65100',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  cancelDeletionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // 削除予約スケジュール済み表示
  deletionScheduledContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  deletionScheduledText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  cancelDeletionButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  cancelDeletionButtonAltText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // カウントダウン表示のスタイル
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E53935',
    marginHorizontal: 4,
  },
  countdownDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  countdownDays: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginHorizontal: 6,
  },
  // 下部に配置するセクション用の追加スタイル
  bottomSection: {
    marginTop: 30,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344955',
    marginBottom: 16,
  },
  settingGroup: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    color: '#4A6572',
    marginBottom: 8,
    fontWeight: '500',
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    fontSize: 15,
    color: '#4A6572',
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  welcomeContainer: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#bbdefb',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    alignItems: 'flex-start',
  },
  welcomeContent: {
    flex: 1,
    marginLeft: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#37474f',
    lineHeight: 20,
  },
});