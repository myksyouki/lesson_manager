import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Dimensions
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';
import { router } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  getUserInstrumentInfo, 
  InstrumentInfo, 
  getUserProfile, 
  createUserProfile, 
  UserProfile,
  instrumentCategories,
  saveSelectedCategory,
  saveSelectedInstrument
} from '../services/userProfileService';
import { Menu, Button, Checkbox, Divider, List } from 'react-native-paper';
import { Portal, Provider as PaperProvider, Modal as PaperModal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

// 固定の楽器設定（サクソフォンのみ）
const FIXED_CATEGORY_ID = 'woodwind';
const FIXED_INSTRUMENT_ID = 'saxophone';
const FIXED_CATEGORY_NAME = '管楽器';
const FIXED_INSTRUMENT_NAME = 'サクソフォン';

export default function InitialSetupScreen() {
  const { user, setUser, setIsNewUser } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);
  const [isLoadingInstrument, setIsLoadingInstrument] = useState(true);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [practiceGoal, setPracticeGoal] = useState('hobby');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsContent, setTermsContent] = useState('読み込み中...');
  const [privacyContent, setPrivacyContent] = useState('読み込み中...');

  // 楽器情報を読み込む関数
  const loadUserInstrument = async () => {
    try {
      setIsLoadingInstrument(true);
      const updatedInfo = await getUserInstrumentInfo(true);
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
    
    // 初期ロード時に楽器情報を取得
    loadUserInstrument();
    loadUserProfile();
    
    // 利用規約とプライバシーポリシーの内容を読み込む
    loadTermsContent();
    loadPrivacyContent();
  }, [user]);

  const loadTermsContent = async () => {
    // 簡略化された利用規約
    const termsText = `
利用規約

1. はじめに
本アプリケーション（以下「本サービス」）は、楽器の練習をサポートするためのレッスン管理ツールを提供します。本利用規約は、ユーザーと本サービス提供者の間の契約です。

2. サービスの利用
ユーザーは、本サービスを個人的な音楽練習の目的にのみ使用することができます。本サービスを違法な目的や本規約に違反する目的で使用することはできません。

3. アカウント
ユーザーは自分のアカウント情報の機密性を維持する責任があります。アカウントで行われる活動はすべてユーザーの責任となります。

4. プライバシー
個人情報の取り扱いについては、プライバシーポリシーに定められています。本サービスを使用することにより、ユーザーはプライバシーポリシーに同意したことになります。

5. 知的財産権
本サービスに関連するすべての知的財産権は、本サービス提供者に帰属します。ユーザーは、個人的な使用以外の目的で本サービスのコンテンツを複製、配布、または使用することはできません。

6. 免責事項
本サービスは「現状のまま」提供され、特定の目的への適合性や商品性を含む、明示的または黙示的な保証はありません。本サービス提供者は、本サービスの使用によって生じるいかなる損害についても責任を負いません。

7. 変更
本サービス提供者は、いつでも本規約を変更する権利を有します。変更された規約は、本サービス上で公開されるか、ユーザーに通知されます。

8. 準拠法
本規約は日本法に準拠し、解釈されます。本規約に関連する紛争は、日本の裁判所の専属管轄とします。

以上
    `;
    setTermsContent(termsText);
  };

  const loadPrivacyContent = async () => {
    // 簡略化されたプライバシーポリシー
    const privacyText = `
プライバシーポリシー

1. 収集する情報
本サービスは、以下の情報を収集することがあります：
- アカウント情報（メールアドレス、名前など）
- デバイス情報
- 利用状況データ
- 楽器情報や練習記録

2. 情報の使用
収集した情報は、以下の目的で使用されます：
- サービスの提供・維持・改善
- ユーザー体験のカスタマイズ
- 分析と統計
- コミュニケーション

3. 情報の共有
ユーザーの個人情報は、以下の場合を除き第三者と共有されません：
- ユーザーの同意がある場合
- 法的要請に応じる必要がある場合
- サービス提供に必要なパートナーとの共有

4. データセキュリティ
当社は、ユーザーの個人情報を保護するために適切なセキュリティ対策を講じています。ただし、100%の安全性を保証するものではありません。

5. データの保持
当社は、サービス提供に必要な期間、または法的義務を満たすために必要な期間、ユーザーの情報を保持します。

6. ユーザーの権利
ユーザーは、自身の個人情報へのアクセス、修正、削除を要求する権利を有します。

7. 変更
本プライバシーポリシーは、必要に応じて更新されることがあります。変更があった場合は、サービス上で通知します。

8. お問い合わせ
プライバシーに関するご質問やご懸念は、サポートまでお問い合わせください。

以上
    `;
    setPrivacyContent(privacyText);
  };

  const navigateToPrivacyPolicy = () => {
    // モーダルで表示
    setPrivacyModalVisible(true);
  };

  const navigateToTermsOfService = () => {
    // モーダルで表示
    setTermsModalVisible(true);
  };

  const saveInstrumentSettings = async () => {
    try {
      // カテゴリーとサクソフォンを保存
      await saveSelectedCategory(FIXED_CATEGORY_ID);
      await saveSelectedInstrument(FIXED_CATEGORY_ID, FIXED_INSTRUMENT_ID);
      
      return true;
    } catch (error) {
      console.error('楽器設定保存エラー:', error);
      Alert.alert('エラー', '楽器情報の保存に失敗しました');
      return false;
    }
  };

  const handleComplete = async () => {
    // 利用規約の同意確認
    if (!termsAccepted) {
      Alert.alert('エラー', '利用規約とプライバシーポリシーに同意してください');
      return;
    }

    setIsSaving(true);
    
    try {
      // 1. 楽器設定を保存
      const instrumentSaved = await saveInstrumentSettings();
      if (!instrumentSaved) {
        setIsSaving(false);
        return;
      }
      
      // 2. 表示名を更新
      if (displayName && displayName !== DEFAULT_DISPLAY_NAME && auth.currentUser) {
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
      }
      
      // 3. プロフィール情報を保存
      await createUserProfile({
        skillLevel,
        practiceGoal,
        termsAccepted: true,
        selectedCategory: FIXED_CATEGORY_ID,
        selectedInstrument: FIXED_INSTRUMENT_ID,
        selectedModel: 'standard'
      });
      
      // 4. 新規ユーザーフラグをリセット
      setIsNewUser(false);
      
      // 5. ホーム画面に遷移
      router.push('/');
      
    } catch (error) {
      console.error('設定保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PaperProvider>
      <Portal>
        {/* 利用規約モーダル */}
        <PaperModal
          visible={termsModalVisible}
          onDismiss={() => setTermsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>利用規約</Text>
            <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalText}>{termsContent}</Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButtonAccept, { backgroundColor: '#4285F4' }]}
              onPress={() => {
                setTermsAccepted(true);
                setTermsModalVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>同意する</Text>
            </TouchableOpacity>
          </View>
        </PaperModal>

        {/* プライバシーポリシーモーダル */}
        <PaperModal
          visible={privacyModalVisible}
          onDismiss={() => setPrivacyModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>プライバシーポリシー</Text>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalText}>{privacyContent}</Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButtonAccept, { backgroundColor: '#4285F4' }]}
              onPress={() => {
                setTermsAccepted(true);
                setPrivacyModalVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>同意する</Text>
            </TouchableOpacity>
          </View>
        </PaperModal>
      </Portal>
      
      <LinearGradient
        colors={['#F5F9FF', '#EEF6FF', '#E5F1FF']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView style={styles.container}>
              <View style={styles.headerContainer}>
                <Text style={styles.mainHeader}>初期設定</Text>
                <Text style={styles.subHeader}>アプリを始めるための設定を行いましょう</Text>
              </View>
              
              {/* プログレスインジケーター */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={styles.progressFill}></View>
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>プロフィール</Text>
                  <Text style={styles.progressLabel}>楽器設定</Text>
                  <Text style={styles.progressLabel}>完了</Text>
                </View>
              </View>
              
              {/* 名前設定セクション */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person" size={24} color="#4285F4" />
                  <Text style={styles.sectionHeader}>プロフィール情報</Text>
                </View>
                <View style={styles.divider} />
                
                <Text style={styles.settingLabel}>表示名</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="表示名を入力"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              
              {/* 楽器設定セクション */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="music" size={24} color="#4285F4" />
                  <Text style={styles.sectionHeader}>楽器設定</Text>
                </View>
                <View style={styles.divider} />
                
                <View style={styles.fixedInstrumentContainer}>
                  <Text style={styles.settingLabel}>楽器</Text>
                  <View style={styles.fixedInstrumentContent}>
                    <MaterialCommunityIcons name="saxophone" size={24} color="#4285F4" style={styles.instrumentIcon} />
                    <View>
                      <Text style={styles.fixedInstrumentCategory}>{FIXED_CATEGORY_NAME}</Text>
                      <Text style={styles.fixedInstrumentName}>{FIXED_INSTRUMENT_NAME}</Text>
                    </View>
                  </View>
                  <Text style={styles.testPhaseMessage}>※ 現在はテスト段階のため、サクソフォンのみ対応しています</Text>
                </View>
              </View>
              
              {/* 演奏情報セクション */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="equalizer" size={24} color="#4285F4" />
                  <Text style={styles.sectionHeader}>演奏情報</Text>
                </View>
                <View style={styles.divider} />
                
                <Text style={styles.settingLabel}>スキルレベル</Text>
                <View style={styles.radioGroup}>
                  {SKILL_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={styles.radioOption}
                      onPress={() => setSkillLevel(level.value)}
                    >
                      <View style={[
                        styles.radioButton,
                        skillLevel === level.value && styles.radioButtonActive
                      ]}>
                        {skillLevel === level.value && <View style={styles.radioButtonSelected} />}
                      </View>
                      <Text style={[
                        styles.radioLabel,
                        skillLevel === level.value && styles.radioLabelActive
                      ]}>{level.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.settingLabel}>練習の目標</Text>
                <View style={styles.radioGroup}>
                  {PRACTICE_GOALS.map((goal) => (
                    <TouchableOpacity
                      key={goal.value}
                      style={styles.radioOption}
                      onPress={() => setPracticeGoal(goal.value)}
                    >
                      <View style={[
                        styles.radioButton,
                        practiceGoal === goal.value && styles.radioButtonActive
                      ]}>
                        {practiceGoal === goal.value && <View style={styles.radioButtonSelected} />}
                      </View>
                      <Text style={[
                        styles.radioLabel,
                        practiceGoal === goal.value && styles.radioLabelActive
                      ]}>{goal.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* 利用規約同意セクション */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="description" size={24} color="#4285F4" />
                  <Text style={styles.sectionHeader}>利用規約</Text>
                </View>
                <View style={styles.divider} />
                
                <View style={styles.termsContainer}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setTermsAccepted(!termsAccepted)}
                  >
                    <View style={[
                      styles.checkbox,
                      termsAccepted && styles.checkboxActive
                    ]}>
                      {termsAccepted && <MaterialIcons name="check" size={18} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      <Text>
                        <Text onPress={navigateToTermsOfService} style={styles.termsLink}>利用規約</Text>
                        <Text> および </Text>
                        <Text onPress={navigateToPrivacyPolicy} style={styles.termsLink}>プライバシーポリシー</Text>
                        <Text> に同意します</Text>
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* 完了ボタン */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    (!termsAccepted || isSaving) && styles.disabledButton
                  ]}
                  onPress={handleComplete}
                  disabled={!termsAccepted || isSaving}
                >
                  <Text style={styles.buttonText}>
                    {isSaving ? '保存中...' : '設定を完了'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: { 
    flex: 1, 
  },
  container: { 
    flex: 1, 
    padding: 20 
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center'
  },
  mainHeader: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center'
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    width: '33%',
    height: 4,
    backgroundColor: '#4285F4',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    width: '33%',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    fontSize: 16,
    color: '#333',
  },
  fixedInstrumentContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  fixedInstrumentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  instrumentIcon: {
    marginRight: 16,
  },
  fixedInstrumentCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fixedInstrumentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  testPhaseMessage: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
  },
  radioGroup: {
    marginTop: 8,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioButtonActive: {
    borderColor: '#4285F4',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4285F4',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  radioLabelActive: {
    color: '#1C1C1E',
    fontWeight: '500',
  },
  termsContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  termsLink: {
    color: '#4285F4',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  completeButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalScrollView: {
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButtonAccept: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 