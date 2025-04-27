import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTaskStore } from '../store/tasks';
import { useAuthStore } from '../store/auth';
import { getCurrentUserProfile } from '../services/userProfileService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { Button } from '@/components/ui/button';
import { Loader2, SearchIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import PracticeTools from './features/practice/components/PracticeTools';

const SCREEN_WIDTH = Dimensions.get('window').width;

// スキルレベルのリスト
const SKILL_LEVELS = ['初心者', '中級者', '上級者'];

// 練習メニュー生成のためのフォームデータの初期値
const DEFAULT_PRACTICE_DURATION = 60; // デフォルトの練習時間（分）

// 削除されたPracticeMenuServiceの型定義の代替
interface PracticeMenuItem {
  title: string;
  description: string;
  duration: number;
  category?: string;
  sheetMusicUrl?: string;  // 楽譜URL追加
  steps?: Array<{          // 練習ステップ追加
    id: string;
    title: string;
    description: string;
    duration: number;
    orderIndex: number;
  }>;
}

interface PracticeMenuRequest {
  instrument: string;
  skill_level: string;
  practice_duration: number;
  practice_content?: string;
  specific_goals?: string;
}

export default function PracticeMenuGenerator() {
  const params = useLocalSearchParams<{ 
    practiceMenu?: string, 
    chatRoomId?: string,
    redirectTo?: string,
    category?: string,
    mode?: string
  }>();
  const { user } = useAuthStore();
  const { addTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMenu, setGeneratedMenu] = useState<PracticeMenuItem[]>([]);
  const [menuSummary, setMenuSummary] = useState('');
  const [userInstrument, setUserInstrument] = useState('');
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [isMenuGenerated, setIsMenuGenerated] = useState(false);
  const [generatedMenus, setGeneratedMenus] = useState<PracticeMenuItem[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  // 選択されたメニューの状態を管理
  const [selectedMenuItems, setSelectedMenuItems] = useState<{[key: number]: boolean}>({});

  // 練習メニュー生成のためのフォームデータ
  const [formData, setFormData] = useState<PracticeMenuRequest>({
    instrument: '',
    skill_level: '中級者',
    practice_duration: DEFAULT_PRACTICE_DURATION,
    practice_content: '',
    specific_goals: ''
  });

  // 楽譜表示用の状態変数を追加
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  const [selectedSheetMusicUrl, setSelectedSheetMusicUrl] = useState<string | null>(null);

  // Firebaseのfunctions参照を取得
  const functions = getFunctions();

  // ユーザープロフィールから楽器情報を取得
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // ユーザープロファイルの取得
        const profile = await getCurrentUserProfile();
        if (profile && profile.selectedInstrument) {
          // 楽器IDを直接使用
          setUserInstrument(profile.selectedInstrument);
          
          // フォームデータにセット
          setFormData(prev => ({
            ...prev,
            instrument: profile.selectedInstrument
          }));
          
          console.log(`楽器ID設定: ${profile.selectedInstrument}`);
        } else {
          console.log('ユーザーの楽器が見つかりません');
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // 生成された練習メニューをタスクとして保存
  const handleSaveTasks = async () => {
    if (generatedMenus.length === 0) {
      Alert.alert('エラー', '練習メニューが生成されていません');
      return;
    }

    // 選択されたメニューがあるか確認
    const selectedMenus = generatedMenus.filter((_, index) => selectedMenuItems[index]);
    if (selectedMenus.length === 0) {
      Alert.alert('エラー', '保存する練習メニューが選択されていません');
      return;
    }

    try {
      setIsLoading(true);

      // 選択された練習項目をタスクとして保存
      const savedTasks = [];
      for (const menuItem of selectedMenus) {
        // 添付ファイルの準備（常に配列を設定し、undefinedにならないようにする）
        const attachments = params.chatRoomId ? [
          {
            type: 'text' as const,
            url: `/chatRooms/${params.chatRoomId}`
          }
        ] : [];

        // 楽譜URLがある場合は添付ファイルに追加
        if (menuItem.sheetMusicUrl) {
          attachments.push({
            type: 'image' as const,
            url: menuItem.sheetMusicUrl,
            format: 'image/jpeg' 
          });
        }

        const taskData: any = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 一意のIDを生成
          title: menuItem.title,
          description: menuItem.description,
          dueDate: new Date().toISOString(),
          isCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: menuItem.category ? [menuItem.category] : [],
          attachments: attachments, // 常に配列を設定（空配列の場合もある）
          sheetMusicUrl: menuItem.sheetMusicUrl || '', // 楽譜URLを追加
          steps: Array.isArray(menuItem.steps) ? menuItem.steps : [] // 練習ステップを追加
        };

        await addTask(taskData);
        savedTasks.push(taskData);
      }
      
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert(
          '保存完了', 
          `${savedTasks.length}個の練習メニューをタスクとして保存しました`,
          [{ text: 'OK', onPress: () => router.navigate({
            pathname: '/tabs/task',
            params: { isNewlyCreated: 'true' }
          })}]
        );
      }, 500);
      
    } catch (error) {
      console.error('タスク保存エラー:', error);
      Alert.alert('エラー', 'タスクの保存に失敗しました');
      setIsLoading(false);
    }
  };

  /**
   * 練習メニューを検索するボタンハンドラー
   */
  const handleSearchMenu = async () => {
    try {
      setIsMenuLoading(true);
      setMenuError(null);
      
      // プラットフォーム情報を出力
      console.log(`実行環境: ${Platform.OS}`);
      // シミュレーター情報はプラットフォーム依存なので安全に出力
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        console.log(`モバイル環境で実行中`);
      } else {
        console.log(`ウェブ環境で実行中`);
      }
      
      // プロジェクトIDを取得（未定義の場合はレッスン管理システムのデフォルト値を使用）
      const firebaseProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'lesson-manager-99ab9';
      console.log(`Firebase Project ID: ${firebaseProject}`);

      // 楽器情報を取得（そのまま使用）
      const instrumentId = formData.instrument || userInstrument || "piano";
      console.log(`使用する楽器ID: ${instrumentId}`);

      // 練習メニュー検索リクエストの準備
      const requestData = {
        practiceTheme: formData.practice_content || "", // 要約またはテーマ
        instrument: instrumentId, // 楽器IDをそのまま使用
        level: formData.skill_level || "中級", // デフォルト難易度
        specificGoals: formData.specific_goals || "" // 具体的な目標
      };

      console.log("検索リクエスト:", requestData);

      // Firebase SDKを使用した呼び出し
      try {
        // アプリケーション初期化確認
        const app = getApp();
        console.log("Firebase初期化済み: ", app.name);
        
        const functionsAsia = getFunctions(app, 'asia-northeast1');
        console.log("Functionsインスタンス取得完了 (region: asia-northeast1)");
        
        const generatePracticeRecommendationFn = httpsCallable(
          functionsAsia, 
          'generatePracticeRecommendation'
        );
        
        console.log("Firebase関数呼び出し開始: generatePracticeRecommendation");
        
        try {
          const result = await generatePracticeRecommendationFn(requestData);
          console.log("Firebase関数呼び出し完了:", result.data);
          
          // レスポンスの型とデータを詳細にログ出力
          console.log("レスポンスタイプ:", typeof result.data);
          console.log("レスポンスキー:", result.data ? Object.keys(result.data) : 'なし');
          
          const responseData = result.data as {
            success: boolean;
            recommendations?: PracticeMenuItem[];
            message?: string;
            error?: string;
          };
          
          if (responseData.success && responseData.recommendations) {
            console.log("Firebase SDK経由でメニュー検索成功:", responseData);
            
            // 共通処理関数を呼び出し
            processResponse(responseData);
            setGeneratedMenus(responseData.recommendations);
            setIsMenuGenerated(true);
            
            // アラート表示
            Alert.alert('検索成功', '練習メニューを見つけました！保存ボタンを押して練習タスクとして追加できます');
          } else {
            console.error("Firebase SDK経由でメニュー検索失敗:", responseData);
            // エラーメッセージを記録するが、まだHTTP呼び出しが残っているためアラートは表示しない
            setMenuError(responseData.message || "Firebase SDK経由での練習メニュー検索に失敗しました");
          }
        } catch (callError) {
          console.error("Firebase関数呼び出し実行エラー:", callError);
          if (callError instanceof Error) {
            console.error("エラー詳細:", callError.message);
            console.error("エラースタック:", callError.stack);
          }
          // メッセージ設定とアラート表示
          setMenuError("練習メニューの検索中に実行エラーが発生しました");
          Alert.alert('関数実行エラー', "関数の実行中にエラーが発生しました。詳細はログを確認してください。");
        }
      } catch (sdkError) {
        console.error("Firebase SDK呼び出しエラー:", sdkError);
        if (sdkError instanceof Error) {
          console.error("エラー詳細:", sdkError.message);
          console.error("エラースタック:", sdkError.stack);
        }
        
        // エラーメッセージの設定
        setMenuError("練習メニューの検索中にエラーが発生しました。もう一度お試しください。");
        
        // エラーメッセージを表示
        Alert.alert('接続エラー', "サーバーとの通信中にエラーが発生しました。ネットワーク接続を確認してもう一度お試しください");
      }
      
      // 直接HTTPリクエストも試行
      try {
        const projectId = firebaseProject || 'lesson-manager-99ab9';
        const functionUrl = `https://asia-northeast1-${projectId}.cloudfunctions.net/generatePracticeRecommendation`;
        
        console.log(`直接HTTP呼び出し開始: ${functionUrl}`);
        
        // ヘッダーを準備（プラットフォームに応じて調整）
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Web環境の場合のみOriginを設定
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          headers['Origin'] = window.location.origin;
        }
        
        console.log("HTTP呼び出しヘッダー:", headers);
        
        // リクエストデータをログ出力
        const httpRequestBody = JSON.stringify({
          data: requestData
        });
        console.log("HTTP呼び出しボディ:", httpRequestBody);
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: httpRequestBody,
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log("HTTP応答ステータス:", response.status);
        
        if (response.ok) {
          const responseText = await response.text();
          console.log("HTTP応答テキスト:", responseText);
          
          let data;
          try {
            data = JSON.parse(responseText);
            console.log("HTTP応答データ:", data);
            
            // HTTP応答からのデータ構造を処理
            if (data.result && data.result.success && data.result.recommendations && data.result.recommendations.length > 0) {
              console.log("HTTP経由でメニュー検索成功:", data);
              
              // 既にメニューが生成されていない場合のみ処理を行う
              if (!isMenuGenerated) {
                // 共通処理関数を呼び出し
                processResponse(data.result);
                setGeneratedMenus(data.result.recommendations);
                setIsMenuGenerated(true);
                
                // アラート表示
                Alert.alert('検索成功', '練習メニューを見つけました！保存ボタンを押して練習タスクとして追加できます');
              }
            }
          } catch (parseError) {
            console.error("JSONパースエラー:", parseError);
            console.log("パースできなかったテキスト:", responseText);
          }
        } else {
          console.error("HTTP応答エラー:", response.status, response.statusText);
        }
      } catch (httpError) {
        console.error("HTTP呼び出しエラー:", httpError);
      }
      
    } catch (error) {
      console.error("全体的なエラー:", error);
      setMenuError("予期せぬエラーが発生しました。もう一度お試しください。");
      Alert.alert('システムエラー', "予期せぬエラーが発生しました。時間をおいてから再度お試しください");
    } finally {
      setIsMenuLoading(false);
    }
  };
  
  // レスポンス処理関数
  const processResponse = (response: any) => {
    if (response && response.success && response.recommendations && response.recommendations.length > 0) {
      console.log('有効なレスポンスを受信:', response);
      
      // レスポンスデータのログ出力を詳細化
      console.log('レスポンスデータ詳細:');
      response.recommendations.forEach((menu: any, index: number) => {
        console.log(`メニュー ${index+1}:`, {
          title: menu.title,
          description: menu.description,
          category: menu.category,
          sheetMusicUrl: menu.sheetMusicUrl,
          stepsCount: menu.steps ? menu.steps.length : 0
        });
        // 楽譜URLの詳細をログ出力
        console.log(`メニュー ${index+1} 楽譜URL:`, menu.sheetMusicUrl);
        console.log(`メニュー ${index+1} 楽譜URL型:`, typeof menu.sheetMusicUrl);
        console.log(`メニュー ${index+1} 楽譜URLの長さ:`, menu.sheetMusicUrl ? menu.sheetMusicUrl.length : 0);
      });
      
      // 最大10件に制限する
      const limitedRecommendations = response.recommendations.slice(0, 10);
      
      // 取得した練習メニューを設定（楽譜URLとステップ情報も含める）
      const formattedMenus = limitedRecommendations.map((menu: any) => ({
        title: menu.title,
        description: menu.description,
        duration: menu.duration || 30,
        category: menu.category,
        sheetMusicUrl: menu.sheetMusicUrl || '',
        steps: Array.isArray(menu.steps) ? menu.steps : []
      }));
      
      // formattedMenusの楽譜URLも確認
      console.log('フォーマット済みメニューの楽譜URL:');
      formattedMenus.forEach((menu, index) => {
        console.log(`フォーマット済みメニュー ${index+1} 楽譜URL:`, menu.sheetMusicUrl);
      });
      
      // どちらの変数も同じ値に設定して一貫性を保つ
      setGeneratedMenu(formattedMenus);
      setGeneratedMenus(limitedRecommendations);
      
      // メニュー生成フラグをtrueに設定
      setIsMenuGenerated(true);
      
      // すべてのメニューを初期状態で未選択にする
      const initialSelections: {[key: number]: boolean} = {};
      limitedRecommendations.forEach((_, index) => {
        initialSelections[index] = false;
      });
      setSelectedMenuItems(initialSelections);
      
      // メニューの概要を設定
      const instrument = formData.instrument || userInstrument || 'サックス';
      const level = formData.skill_level || '中級者';
      setMenuSummary(`${instrument}の${level}向け「${formData.practice_content || '音階'}」の練習メニューです。最大10件まで表示され、選択したものをタスクとして追加できます。`);
    } else {
      console.error('無効なレスポンス:', JSON.stringify(response));
    }
  };

  // スキルレベルを選択
  const selectSkillLevel = (level: string) => {
    setFormData(prev => ({
      ...prev,
      skill_level: level
    }));
  };

  const handleCreateTask = async () => {
    try {
      // タスクデータを構築
      const taskData = {
        title: formData.practice_content || '',
        description: formData.specific_goals || '',
        dueDate: new Date(),
        isCompleted: false,
        completed: false,
        content: formData.specific_goals || '',
        tags: formData.practice_content ? [formData.practice_content] : [],
        practiceDate: new Date().toISOString(),
        steps: [],
        attachments: [{
          type: 'image' as const,
          url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAyAEsDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+/igAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD//Z',
          format: 'image/jpeg'
        }]
      };

      // タスクを作成
      await addTask(taskData);
      
      // フォームをクリア
      setFormData({
        instrument: '',
        skill_level: '中級者',
        practice_duration: DEFAULT_PRACTICE_DURATION,
        practice_content: '',
        specific_goals: ''
      });
      
      // タスク一覧画面に戻る
      router.navigate({
        pathname: '/tabs/task',
        params: { isNewlyCreated: 'true' }
      });
      
      // 成功メッセージを表示
      Alert.alert(
        'タスク作成完了',
        'タスクを作成しました',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('タスク作成エラー:', error);
      
      // エラーメッセージを表示
      Alert.alert(
        'タスク作成エラー',
        'タスクの作成に失敗しました',
        [{ text: 'OK' }]
      );
    }
  };

  // 楽譜表示処理
  const handleShowSheetMusic = (url: string) => {
    setSelectedSheetMusicUrl(url);
    setShowSheetMusic(true);
  };
  
  // 楽譜表示を閉じる処理
  const handleCloseSheetMusic = () => {
    setShowSheetMusic(false);
    setSelectedSheetMusicUrl(null);
  };

  // メニューアイテムの選択状態を切り替える関数
  const toggleMenuItemSelection = (index: number) => {
    setSelectedMenuItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 全てのメニューアイテムを選択/解除する関数
  const toggleAllMenuItems = (selectAll: boolean) => {
    const newSelections: {[key: number]: boolean} = {};
    generatedMenus.forEach((_, index) => {
      newSelections[index] = selectAll;
    });
    setSelectedMenuItems(newSelections);
  };

  // 修正：保存ボタンの表示条件を変更し、選択したメニューの数を表示
  const selectedCount = Object.values(selectedMenuItems).filter(selected => selected).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 楽譜表示モーダル */}
      {showSheetMusic && selectedSheetMusicUrl && (
        <View style={styles.practiceModeFull}>
          <PracticeTools 
            isVisible={true} 
            sheetMusicUrl={selectedSheetMusicUrl} 
            onClose={handleCloseSheetMusic}
          />
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>練習メニュー作成</Text>
          
          {/* 保存ボタンの表示条件を変更 */}
          {isMenuGenerated && generatedMenus.length > 0 && selectedCount > 0 && (
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveTasks}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>保存 ({selectedCount})</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {!isMenuGenerated ? (
            // 練習メニュー生成フォーム
            <View style={styles.form}>
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>練習メニュー作成</Text>
                
                <Text style={styles.subtitle}>練習情報を入力</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>スキルレベル<Text style={styles.required}>*</Text></Text>
                  <View style={styles.skillLevelContainer}>
                    {SKILL_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.skillLevelButton,
                          formData.skill_level === level && styles.skillLevelButtonActive
                        ]}
                        onPress={() => selectSkillLevel(level)}
                      >
                        <Text
                          style={[
                            styles.skillLevelText,
                            formData.skill_level === level && styles.skillLevelTextActive
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>練習したい内容 <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={formData.practice_content}
                    onChangeText={(text) => {
                      const limitedText = text.slice(0, 20);
                      setFormData({ ...formData, practice_content: limitedText });
                    }}
                    placeholder="例: 高音域の安定性、タンギング"
                    maxLength={20}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>具体的な目標（任意）</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.specific_goals}
                    onChangeText={(text) => setFormData({ ...formData, specific_goals: text })}
                    placeholder="具体的な目標を入力（例: コンクールの準備、アンサンブルの練習など）"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={handleSearchMenu}
                  disabled={isMenuLoading || !formData.practice_content}
                  style={[styles.button, isMenuLoading && styles.disabledButton]}
                >
                  {isMenuLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" style={{marginRight: 8}} />
                      <Text style={styles.buttonText}>検索中...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="search" size={18} color="#ffffff" style={{marginRight: 8}} />
                      <Text style={styles.buttonText}>練習メニューを検索</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : 
            // 生成された練習メニューの表示
            <View style={styles.generatedMenuContainer}>
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>練習メニューの概要</Text>
                <Text style={styles.summaryText}>{menuSummary}</Text>
              </View>

              {/* 選択ボタン追加 */}
              <View style={styles.selectionControls}>
                <TouchableOpacity 
                  style={styles.selectAllButton}
                  onPress={() => toggleAllMenuItems(true)}
                >
                  <Text style={styles.selectButtonText}>全て選択</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.selectNoneButton}
                  onPress={() => toggleAllMenuItems(false)}
                >
                  <Text style={styles.selectButtonText}>選択解除</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.menuSectionTitle}>練習メニュー項目 ({generatedMenus.length}件)</Text>
              
              {generatedMenus.map((item, index) => (
                <View key={index} style={[styles.menuItem, selectedMenuItems[index] && styles.menuItemSelected]}>
                  {/* 選択用チェックボックス */}
                  <TouchableOpacity 
                    style={styles.menuCheckbox}
                    onPress={() => toggleMenuItemSelection(index)}
                  >
                    <View style={[
                      styles.checkbox, 
                      selectedMenuItems[index] && styles.checkboxSelected
                    ]}>
                      {selectedMenuItems[index] && (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.menuItemContent}>
                    <View style={styles.menuItemHeader}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <View style={styles.menuItemMeta}>
                        <Text style={styles.menuItemDuration}>{item.duration}分</Text>
                        {item.category && (
                          <View style={styles.categoryPill}>
                            <Text style={styles.categoryText}>{item.category}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.menuItemDescription}>{item.description}</Text>
                    
                    {/* 楽譜URL表示 */}
                    {item.sheetMusicUrl && (
                      <View style={styles.sheetMusicContainer}>
                        <Text style={styles.sheetMusicTitle}>楽譜データ</Text>
                        {/* 楽譜URLのデバッグ情報表示 */}
                        <Text style={styles.sheetMusicDebug}>URL存在: {item.sheetMusicUrl ? 'あり' : 'なし'}</Text>
                        <Text style={styles.sheetMusicDebug}>URL長さ: {item.sheetMusicUrl ? item.sheetMusicUrl.length : 0}</Text>
                        <TouchableOpacity 
                          style={styles.sheetMusicButton}
                          onPress={() => {
                            // デバッグ情報をログに出力
                            console.log('楽譜表示ボタンが押されました');
                            console.log('楽譜URL:', item.sheetMusicUrl);
                            // 新しい楽譜表示モーダル処理に変更
                            if (item.sheetMusicUrl) {
                              handleShowSheetMusic(item.sheetMusicUrl);
                            }
                          }}
                        >
                          <FontAwesome5 name="music" size={16} color="#007AFF" style={{marginRight: 8}} />
                          <Text style={styles.sheetMusicButtonText}>楽譜を表示</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {/* 練習ステップ表示 */}
                    {item.steps && item.steps.length > 0 && (
                      <View style={styles.stepsContainer}>
                        <Text style={styles.stepsTitle}>練習手順</Text>
                        {item.steps.sort((a, b) => a.orderIndex - b.orderIndex).map((step, stepIndex) => (
                          <View key={stepIndex} style={styles.stepItem}>
                            <View style={styles.stepHeader}>
                              <Text style={styles.stepNumber}>{stepIndex + 1}</Text>
                              <Text style={styles.stepTitle}>{step.title}</Text>
                              <Text style={styles.stepDuration}>{step.duration}分</Text>
                            </View>
                            <Text style={styles.stepDescription}>{step.description}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          }
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginRight: 'auto',
  },
  form: {
    padding: 16,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  pill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  pillSelected: {
    backgroundColor: '#007AFF',
  },
  pillText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  // 生成された練習メニューのスタイル
  generatedMenuContainer: {
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: '#e4f5f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
  },
  menuItemSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  menuCheckbox: {
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItemMeta: {
    alignItems: 'flex-end',
  },
  menuItemDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  categoryPill: {
    backgroundColor: '#007AFF20',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  menuItemDescription: {
    fontSize: 15,
    color: '#3C3C3E',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonContainer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  backToFormButton: {
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  backToFormButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  required: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  noticeContainer: {
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noticeText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  formGroup: {
    marginBottom: 24,
  },
  skillLevelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  skillLevelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  skillLevelButtonActive: {
    backgroundColor: '#007AFF',
  },
  skillLevelText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  skillLevelTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  // 楽譜関連スタイル
  sheetMusicContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  sheetMusicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sheetMusicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sheetMusicButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // ステップ関連スタイル
  stepsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  stepItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    backgroundColor: '#007AFF',
    color: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  stepDuration: {
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },
  stepDescription: {
    fontSize: 14,
    color: '#3C3C3E',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  // 楽譜表示モーダル用スタイル
  practiceModeFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  // 選択コントロール用スタイル
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectAllButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectNoneButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sheetMusicDebug: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});
