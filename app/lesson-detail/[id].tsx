import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Text,
  Modal,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import LessonDetailHeader from '../features/lessons/components/detail/LessonDetailHeader';
import LessonDetailContent from '../features/lessons/components/detail/LessonDetailContent';
import { useLessonStore } from '../../store/lessons';
import { getCurrentUserProfile } from '../../services/userProfileService';
import { updateTask, createTask, getUserTasks, Task } from '../../services/taskService';
import { Timestamp } from "firebase/firestore";

// PracticeMenuとPracticeStepインターフェース
interface PracticeStep {
  title: string;
  description: string;
  estimatedTime?: number;
  // レガシーフィールド
  id?: string;
  duration?: number;
  orderIndex?: number;
}

interface PracticeMenu {
  title: string;
  description: string;
  steps: PracticeStep[];
  category?: string;
  difficultyLevel?: string;
  tags?: string[];
  // レガシーフィールド
  id?: string;
  instrument?: string;
  difficulty?: string;
  duration?: number;
}

export default function LessonDetail() {
  const params = useLocalSearchParams();
  const lessonId = params.id as string;
  console.log('レッスン詳細画面: パラメータID=', lessonId);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<any>({
    id: lessonId,
    teacherName: '',
    date: '',
    pieces: [],
    notes: '',
    tags: [],
    summary: '',
    status: '',
    isFavorite: false,
    isArchived: false,
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  // メニュー選択モーダル用の状態
  const [showMenuSelectModal, setShowMenuSelectModal] = useState(false);
  const [generatedMenus, setGeneratedMenus] = useState<PracticeMenu[]>([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState<{[key: number]: boolean}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 練習タブをリフレッシュするためのトリガー
  const [practiceRefreshTrigger, setPracticeRefreshTrigger] = useState(0);
  
  // レッスンストアからアーカイブ関連のメソッドを取得
  const { archiveLesson, unarchiveLesson } = useLessonStore();
  
  const [formData, setFormData] = useState({
    id: lessonId,
    teacherName: '',
    date: '',
    pieces: [] as string[],
    notes: '',
    tags: [] as string[],
    priority: 'medium' as 'high' | 'medium' | 'low',
    summary: '',
    status: '',
    isFavorite: false,
    transcription: '',
    isArchived: false,
    archivedDate: '',
    aiInstructions: '',
  });

  // Firestoreからのリアルタイム更新を監視
  useEffect(() => {
    // lessonIdとユーザーIDが揃ったタイミングで監視を開始
    const userId = auth.currentUser?.uid;
    if (!lessonId || !userId) {
      console.log('LessonDetail: ユーザーまたはレッスンIDが未設定のため監視をスキップ');
      return;
    }
    console.log(`レッスン詳細画面: ID ${lessonId} のリアルタイム監視を開始します (ユーザーID=${userId})`);

    // Firestoreの参照を取得
    const lessonRef = doc(db, `users/${userId}/lessons`, lessonId);
    console.log(`レッスンパス: users/${userId}/lessons/${lessonId}`);
    
    const unsubscribe = onSnapshot(lessonRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const lessonData = docSnapshot.data();
        console.log(`レッスンデータ更新を検出:`, lessonData);
        
        // 更新されたデータを状態に反映
        const updatedLesson = {
          id: lessonId,
          teacherName: lessonData.teacher || lessonData.teacherName || '',
          date: lessonData.date || new Date().toISOString().split('T')[0],
          pieces: lessonData.pieces || [],
          notes: lessonData.notes || '',
          tags: lessonData.tags || [],
          priority: lessonData.priority || 'medium',
          summary: lessonData.summary || '',
          status: lessonData.status || '',
          isFavorite: lessonData.isFavorite || false,
          transcription: lessonData.transcription || '',
          isArchived: lessonData.isArchived || false,
          archivedDate: lessonData.archivedDate || '',
          aiInstructions: lessonData.aiInstructions || '',
        };
        
        setCurrentLesson(updatedLesson);
        
        setFormData(prev => ({
          ...prev,
          teacherName: updatedLesson.teacherName,
          date: updatedLesson.date,
          pieces: updatedLesson.pieces,
          notes: updatedLesson.notes,
          tags: updatedLesson.tags,
          priority: updatedLesson.priority,
          summary: updatedLesson.summary,
          status: updatedLesson.status,
          isFavorite: updatedLesson.isFavorite,
          transcription: updatedLesson.transcription,
          isArchived: updatedLesson.isArchived,
        }));
      }
    });

    return () => {
      console.log(`レッスン詳細画面: ID ${lessonId} のリアルタイム監視を終了します`);
      unsubscribe();
    };
  }, [lessonId, auth.currentUser?.uid]);

  const handleSave = async () => {
    try {
      // 単一の曲名がある場合は、pieces配列に追加
      let updatedPieces = [...(formData.pieces || [])];
      
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      console.log(`レッスンの更新: users/${userId}/lessons/${formData.id}`);
      
      // 更新したレッスンデータをFirestoreに直接保存
      await updateDoc(lessonRef, {
        teacherName: formData.teacherName,
        date: formData.date,
        pieces: updatedPieces,
        notes: formData.notes,
        tags: formData.tags,
        user_id: userId,
        isFavorite: formData.isFavorite,
        status: formData.status || 'completed',
        transcription: formData.transcription || '',
        updated_at: serverTimestamp(),
        // 既存のデータを保持
        audioUrl: currentLesson?.audioUrl,
        isDeleted: false,
        processingId: currentLesson?.processingId || '',
        priority: formData.priority,
        summary: formData.summary,
        aiInstructions: formData.aiInstructions,
      });
      
      console.log(`レッスンを更新しました: ${formData.id}`);
      setIsEditing(false);
    } catch (error) {
      console.error('レッスン更新エラー:', error);
      Alert.alert('エラー', 'レッスンの更新に失敗しました');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      
      // お気に入り状態を反転
      const newFavoriteState = !formData.isFavorite;
      
      // Firestoreのお気に入り状態を更新
      await updateDoc(lessonRef, {
        isFavorite: newFavoriteState,
        updated_at: serverTimestamp()
      });
      
      // ローカルの状態も更新
      setFormData({ ...formData, isFavorite: newFavoriteState });
    } catch (error) {
      console.error('お気に入り更新エラー:', error);
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    }
  };

  const handleUpdateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleEditSave = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    // 編集をキャンセルして元の状態に戻す
    setFormData({
      id: currentLesson.id,
      teacherName: currentLesson.teacherName || '',
      date: currentLesson.date || '',
      pieces: currentLesson.pieces || [],
      notes: currentLesson.notes || '',
      tags: currentLesson.tags || [],
      priority: currentLesson.priority || 'medium',
      summary: currentLesson.summary || '',
      status: currentLesson.status || '',
      isFavorite: currentLesson.isFavorite || false,
      transcription: currentLesson.transcription || '',
      isArchived: currentLesson.isArchived || false,
      archivedDate: currentLesson.archivedDate || '',
      aiInstructions: currentLesson.aiInstructions || '',
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      
      // 論理削除を実行（isDeletedフラグを設定）
      await updateDoc(lessonRef, {
        isDeleted: true,
        updated_at: serverTimestamp()
      });
      
      console.log(`レッスンを削除しました: ${formData.id}`);
      router.back();
    } catch (error) {
      console.error('レッスン削除エラー:', error);
      Alert.alert('エラー', 'レッスンの削除に失敗しました');
    }
  };

  // エクスポートモーダルを表示
  const openExportModal = () => {
    setShowExportModal(true);
  };

  // タスク生成画面へ遷移
  const navigateToGenerateTasks = () => {
    setShowExportModal(false);
    router.push({
      pathname: '/generate-tasks' as any,
      params: { 
        lessonIds: lessonId
      }
    });
  };

  // AIに相談画面へ遷移
  const handleChat = () => {
    setShowExportModal(false); // モーダルを閉じる
    
    if (currentLesson?.summary) {
      router.push({
        pathname: '/consult-ai',
        params: {
          lessonIds: JSON.stringify([lessonId]),
          summaryContext: currentLesson.summary,
          initialPrompt: `このレッスンについて質問があります。${currentLesson.pieces && currentLesson.pieces.length > 0 ? '曲目は ' + currentLesson.pieces.join(', ') + ' です。' : ''}`
        }
      });
    } else {
      Alert.alert('エラー', 'このレッスンはAIチャットに使用できません。サマリーがありません。');
    }
  };
  
  /**
   * AIでタスクを生成する
   */
  const handleGenerateTasks = async () => {
    setShowExportModal(false);
    
    if (!auth.currentUser) {
      alert('タスクを生成するにはログインが必要です');
      return;
    }

    if (!currentLesson || !currentLesson.summary) {
      alert('タスクを生成するにはレッスンのサマリーが必要です');
      return;
    }

    setIsLoadingTasks(true);
    console.log('=========== タスク生成開始 ===========');
    console.log('レッスンID:', lessonId);
    console.log('サマリー長さ:', currentLesson.summary?.length || 0);
    console.log('タグ:', currentLesson.tags);

    // プロファイルから選択楽器を取得
    const profile = await getCurrentUserProfile();
    const instrumentSelected = profile?.selectedInstrument.toLowerCase() || 'piano';
    console.log('選択された楽器:', instrumentSelected);
    console.log('ユーザープロファイル:', JSON.stringify(profile));

    // 共通で使うリクエストデータ
    const functionParams = {
      lessonId,
      aiSummary: currentLesson.summary,
      tags: currentLesson.tags,
      instrument: instrumentSelected
    };
    console.log('Function パラメーター:', JSON.stringify(functionParams));
    
    // 1. まず直接HTTP呼び出しを試みる
    console.log('======== 直接HTTP呼び出し実行 ========');
    try {
      // ユーザーが認証済みか確認
      if (!auth.currentUser) {
        throw new Error('HTTP呼び出しには認証が必要です');
      }
      
      // 認証トークンを取得
      console.log('認証トークンを取得中...');
      const idToken = await auth.currentUser.getIdToken();
      console.log('認証トークン取得成功（最初の10文字）:', idToken.substring(0, 10) + '...');
      
      // プロジェクトID取得
      const firebaseProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'lesson-manager-99ab9';
      console.log('Firebase プロジェクトID:', firebaseProject);
      
      // URL構築
      const url = `https://asia-northeast1-${firebaseProject}.cloudfunctions.net/generateTasksFromLesson`;
      console.log('HTTP URL:', url);
      
      // リクエストボディ構築
      const requestBody = { 
        data: {
          ...functionParams
        } 
      };
      console.log('HTTP リクエストボディ:', JSON.stringify(requestBody).substring(0, 100) + '...');
      
      // リクエスト送信
      console.log('HTTP リクエスト開始');
      const httpStartTime = Date.now();
      
      // ヘッダーに認証トークンを含める
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };
      console.log('リクエストヘッダー:', Object.keys(headers).join(', '));
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      const httpEndTime = Date.now();
      console.log(`HTTP リクエスト時間: ${httpEndTime - httpStartTime}ms`);
      console.log('HTTP レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
        ok: response.ok
      });
      
      // レスポンスの解析
      console.log('HTTP レスポンス本文取得中');
      const responseText = await response.text();
      
      // エラーレスポンスの場合は詳細に表示
      if (!response.ok) {
        console.error('HTTP エラーレスポンス:', {
          status: response.status,
          text: responseText
        });
        throw new Error(`HTTP エラー ${response.status}: ${responseText}`);
      }
      
      console.log('HTTP 成功レスポンス本文:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      
      // JSONパース
      console.log('レスポンスJSONパース');
      let json;
      try {
        json = JSON.parse(responseText);
        console.log('JSONパース完了:', Object.keys(json).join(', '));
      } catch (parseError) {
        console.error('JSONパースエラー:', parseError);
        console.log('HTTP呼び出しに失敗、SDKフォールバックへ移行');
        throw new Error('JSONパースエラー');
      }
      
      // ここではresponse.okをチェックする必要がない（上ですでにチェック済み）
      console.log('HTTP レスポンス解析');
      
      // データ形式を解析（data.resultまたはresult.menusまたはdata.menus形式をサポート）
      const resultData = json.result || json.data || json;
      console.log('レスポンスデータ構造:', Object.keys(resultData).join(', '));
      
      const menus = resultData.menus || [];
      console.log('メニュー配列:', Array.isArray(menus) ? 'はい' : 'いいえ', 'サイズ:', menus.length);
      
      if (menus.length === 0) {
        console.log('メニューが見つかりませんでした (HTTP呼び出し)');
        Alert.alert('検索結果', '練習メニューが見つかりませんでした');
        setIsLoadingTasks(false);
        console.log('=========== HTTP呼び出しが成功したため処理を終了します ===========');
        return;
      } else {
        // 選択モーダル用にメニューを保存
        console.log(`HTTP呼び出し: メニュー取得成功: ${menus.length}個のメニュー`);
        setGeneratedMenus(menus);
        
        // すべてのメニューを初期状態で未選択にする
        const initialSelections: {[key: number]: boolean} = {};
        menus.forEach((_, index) => {
          initialSelections[index] = false;
        });
        setSelectedMenuItems(initialSelections);
        
        // 選択モーダルを表示
        setShowMenuSelectModal(true);
        setIsLoadingTasks(false);
        console.log('=========== HTTP呼び出しが成功したため処理を終了します ===========');
        return;
      }
    } catch (httpError: any) {
      console.error('HTTP呼び出し例外:', httpError.message || JSON.stringify(httpError));
      console.log('SDK呼び出しへフォールバック');
    }

    // 2. HTTP呼び出しに失敗した場合、SDK経由で呼び出す
    console.log('======== SDK呼び出し開始 (フォールバック) ========');
    try {
      console.log('Firebase App取得');
      const app = getApp();
      console.log('Firebase App名:', app.name);
      
      console.log('Functionsインスタンス取得');
      const functionsInstance = getFunctions(app, 'asia-northeast1');
      console.log('Functions設定確認:', {
        region: functionsInstance.region,
        customDomain: functionsInstance.customDomain,
        app: functionsInstance.app?.name
      });
      
      console.log('httpsCallable関数作成');
      const generateTasksFn = httpsCallable(functionsInstance, 'generateTasksFromLesson');
      
      console.log('関数呼び出し開始');
      const startTime = Date.now();
      const result = await generateTasksFn(functionParams);
      // 関数実行後の時間を記録
      const endTime = Date.now();
      console.log(`関数実行時間: ${endTime - startTime}ms`);
      console.log('SDKレスポンス:', result.data ? JSON.stringify(result.data) : '応答データなし');

      const menus = (result.data as { menus: PracticeMenu[] })?.menus || [];
      console.log('SDK経由で取得したメニュー数:', menus.length);
      if (menus.length === 0) {
        console.log('メニューが見つかりませんでした (SDK)');
        Alert.alert('検索結果', '練習メニューが見つかりませんでした');
        setIsLoadingTasks(false);
        return;
      } else {
        // 選択モーダル用にメニューを保存
        console.log(`SDK呼び出し: メニュー取得成功: ${menus.length}個のメニュー`);
        setGeneratedMenus(menus);
        
        // すべてのメニューを初期状態で未選択にする
        const initialSelections: {[key: number]: boolean} = {};
        menus.forEach((_, index) => {
          initialSelections[index] = false;
        });
        setSelectedMenuItems(initialSelections);
        
        // 選択モーダルを表示
        setShowMenuSelectModal(true);
      }
    } catch (sdkError: any) {
      console.error('Firebase関数呼び出しエラー:', JSON.stringify(sdkError));
      console.log('SDKエラー詳細:', sdkError.code, sdkError.message, sdkError.details);
      Alert.alert('エラー', 'タスク生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoadingTasks(false);
      console.log('=========== タスク生成終了 ===========');
    }
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
    generatedMenus.forEach((_: PracticeMenu, index: number) => {
      newSelections[index] = selectAll;
    });
    setSelectedMenuItems(newSelections);
  };

  // 選択したメニューを保存する関数
  const saveSelectedMenus = async () => {
    try {
      setIsSubmitting(true);
      const selectedMenusList = Object.entries(selectedMenuItems)
        .filter(([_, isSelected]) => isSelected)
        .map(([index]) => generatedMenus[parseInt(index)]);

      if (selectedMenusList.length === 0) {
        Alert.alert('選択エラー', 'メニューを少なくとも1つ選択してください');
        setIsSubmitting(false);
        return;
      }

      // 選択されたメニューごとにタスクを作成
      let createdCount = 0;
      for (const menu of selectedMenusList) {
        const fullDescription = `${menu.title}\n\n${menu.description}`;
        try {
          // taskServiceのcreateTaskを使用してタスクを作成
          const task = await createTask(
            userId,
            menu.title,
            fullDescription,
            undefined, // dueDate
            [{ // attachments
              type: 'text',
              url: `/lessons/${currentLesson.id}`
            }]
          );

          // タスクにタグを追加
          await updateTask(task.id, {
            tags: ['練習メニュー', '自動生成', menu.category || '基本練習'],
            lessonId: currentLesson.id
          } as any, userId);

          createdCount++;
        } catch (err) {
          console.error('タスク作成エラー:', err);
        }
      }

      console.log(`${createdCount}個のタスクを作成しました`);
      
      // 練習タブのデータを再取得するための状態更新
      setPracticeRefreshTrigger(prev => prev + 1);
      
      // モーダルを閉じる
      setShowMenuSelectModal(false);
      setIsSubmitting(false);
      
      // 成功メッセージ
      Alert.alert('保存完了', `${createdCount}個の練習メニューをタスクとして保存しました。`);
    } catch (error) {
      console.error('メニュー保存エラー:', error);
      setIsSubmitting(false);
      Alert.alert('エラー', 'タスクの保存中にエラーが発生しました。');
    }
  };

  // ローカルで練習メニューを作成する関数
  const createLocalPracticeMenu = async (instrument: string) => {
    try {
      console.log("ローカル練習メニュー生成開始");
      if (!auth.currentUser?.uid) {
        console.error('ユーザーが認証されていません');
        throw new Error('認証が必要です。ログインしてください。');
      }

      const now = new Date();
      const sampleMenu: PracticeMenu = {
        id: `local_${now.getTime()}`,
        title: `${instrument}の基本練習`,
        description: 'レッスンで学んだ内容を定着させるための基本練習メニューです。',
        instrument: instrument,
        category: '基礎練習',
        difficulty: 'INTERMEDIATE',
        duration: 30,
        steps: [
          {
            id: 'step1',
            title: 'ウォームアップ',
            description: '基本的なポジションの確認と簡単なウォームアップ練習',
            duration: 5,
            orderIndex: 0
          },
          {
            id: 'step2',
            title: '基本テクニック',
            description: 'レッスンで学んだ基本テクニックの復習',
            duration: 15,
            orderIndex: 1
          },
          {
            id: 'step3',
            title: '応用練習',
            description: '基本テクニックを組み合わせた応用練習',
            duration: 10,
            orderIndex: 2
          }
        ],
        tags: ['基礎', 'ウォームアップ', 'テクニック']
      };

      const stepsText = sampleMenu.steps.map(step => 
        `- ${step.title}: ${step.description} (${step.duration || step.estimatedTime || 0}分)`
      ).join('\n');
      
      const fullDescription = `${sampleMenu.description}\n\n【練習ステップ】\n${stepsText}\n\n【目安時間】${sampleMenu.duration || 30}分\n【難易度】${sampleMenu.difficultyLevel || sampleMenu.difficulty || "中級"}\n【カテゴリ】${sampleMenu.category || "基本練習"}`;
      
      // タスクを作成
      try {
        await createTask(
          auth.currentUser.uid,
          sampleMenu.title,
          fullDescription,
          undefined,
          [{
            type: 'text',
            url: `/lessons/${lessonId}`
          }]
        );
        
        Alert.alert('完了', 'ローカルで練習メニューを作成しました。タスク一覧を表示しますか？', [
          {
            text: 'いいえ',
            style: 'cancel'
          },
          {
            text: 'はい',
            onPress: () => router.push('/task' as any)
          }
        ]);
      } catch (error) {
        console.error('タスク作成エラー:', error);
        Alert.alert('エラー', 'タスク作成に失敗しました');
      }
    } catch (error) {
      console.error('ローカル練習メニュー生成エラー:', error);
      Alert.alert('エラー', '練習メニューの生成に失敗しました');
    }
  };

  const toggleArchive = async () => {
    try {
      // 現在のユーザーIDを取得
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('ユーザーが認証されていません');
        Alert.alert('エラー', 'ユーザー認証が必要です');
        return;
      }
      
      // レッスンドキュメントへの正しい参照を取得
      const lessonRef = doc(db, `users/${userId}/lessons`, formData.id);
      
      // アーカイブ状態を反転
      const newArchivedState = !formData.isArchived;
      
      // Firestoreのアーカイブ状態を更新
      await updateDoc(lessonRef, {
        isArchived: newArchivedState,
        updated_at: serverTimestamp()
      });
      
      // ローカルの状態も更新
      setFormData({ ...formData, isArchived: newArchivedState });
    } catch (error) {
      console.error('アーカイブ更新エラー:', error);
      Alert.alert('エラー', 'アーカイブの更新に失敗しました');
    }
  };

  const handleShare = () => {
    // Implement share functionality
    router.push({
      pathname: '/generate-tasks' as any,
      params: { 
        lessonIds: lessonId
      }
    });
  };

  // リフレッシュ処理を追加
  const handleRefresh = () => {
    setRefreshing(true);
    // データを再読み込みする処理
    setTimeout(() => {
      // ここでレッスンデータを再読み込みする処理を呼び出す（例：loadChatRoom()など）
      setRefreshing(false);
    }, 1000);
  };

  // 練習データを取得
  useEffect(() => {
    if (!currentLesson?.id || !isActive) return;
    
    const fetchPractices = async () => {
      setIsPracticeLoading(true);
      try {
        const practices = await getPracticesByLessonId(currentLesson.id);
        setPractices(practices);
      } catch (error) {
        console.error('練習データ取得エラー:', error);
      } finally {
        setIsPracticeLoading(false);
      }
    };
    
    fetchPractices();
  }, [currentLesson?.id, isActive, practiceRefreshTrigger]);

  return (
    <SafeAreaView style={styles.container}>
      <LessonDetailHeader 
        id={lessonId}
        date={formData.date}
        teacher={formData.teacherName}
        isEditing={isEditing}
        isArchived={formData.isArchived || false}
        isFavorite={formData.isFavorite || false}
        onEdit={handleEditSave}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
      />
      
      <View style={styles.content}>
        <LessonDetailContent 
          formData={formData}
          isEditing={isEditing}
          onUpdateFormData={handleUpdateFormData}
          afterSummary={
            <>
              {formData.status === 'processing' ? (
                <View style={styles.processingIndicator}>
                  <View style={styles.processingIconContainer}>
                    <MaterialIcons name="refresh" size={20} color="#4285F4" />
                  </View>
                  <Text style={styles.processingText}>AIが処理中...</Text>
                  <TouchableOpacity onPress={handleRefresh}>
                    <MaterialIcons name="refresh" size={24} color="#4285F4" />
                  </TouchableOpacity>
                </View>
              ) : null}
              
              <TouchableOpacity
                style={[styles.inlineActionButton, { backgroundColor: '#4285F4' }]}
                onPress={openExportModal}
              >
                <MaterialIcons name="share" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>エクスポート</Text>
              </TouchableOpacity>
            </>
          }
        />
      </View>
      
      {/* エクスポート選択モーダル */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>エクスポート</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => handleGenerateTasks()}
            >
              <MaterialIcons name="assignment" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>タスク生成</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => handleChat()}
            >
              <MaterialIcons name="smart-toy" size={24} color="#5856D6" />
              <Text style={styles.modalOptionText}>AIに相談</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 練習メニュー選択モーダル */}
      <Modal
        visible={showMenuSelectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenuSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitleText}>練習メニュー選択</Text>
              <TouchableOpacity onPress={() => setShowMenuSelectModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.menuModalSubtitle}>
              レッスン内容に合った練習メニューが見つかりました。追加したいメニューを選択してください。
            </Text>
            
            {/* 選択ボタン */}
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
            
            {/* メニューリスト */}
            <ScrollView style={styles.menuList}>
              {generatedMenus.map((menu, index) => (
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
                      <Text style={styles.menuItemTitle}>{menu.title}</Text>
                      <View style={styles.menuItemMeta}>
                        <Text style={styles.menuItemDuration}>{menu.duration || 30}分</Text>
                        {menu.category && (
                          <View style={styles.categoryPill}>
                            <Text style={styles.categoryText}>{menu.category}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.menuItemDescription}>{menu.description}</Text>
                    
                    {/* ステップ */}
                    <View style={styles.stepsContainer}>
                      {menu.steps && menu.steps.map((step, stepIndex) => (
                        <View key={stepIndex} style={styles.stepItem}>
                          <Text style={styles.stepNumber}>{stepIndex + 1}.</Text>
                          <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text style={styles.stepDescription}>{step.description}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {/* 保存ボタン */}
            <View style={styles.selectionActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowMenuSelectModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveSelectedMenus}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    選択したメニューを追加
                    {Object.values(selectedMenuItems).filter(Boolean).length > 0 && 
                     ` (${Object.values(selectedMenuItems).filter(Boolean).length}件)`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1, // コンテンツが画面いっぱいに広がるように設定
  },
  inlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: -4,
    marginBottom: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 16,
  },
  cancelOption: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  archiveBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#34A853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  archiveBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 10,
  },
  popoverMenu: {
    position: 'relative',
    width: '60%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#EBF3FB',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  processingIconContainer: {
    marginRight: 8,
  },
  processingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  exportOptionText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  menuModalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  menuModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    marginRight: 8,
  },
  selectNoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#333',
  },
  menuList: {
    maxHeight: 500,
  },
  menuItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  menuItemSelected: {
    borderColor: '#4285F4',
    backgroundColor: '#EBF3FB',
  },
  menuCheckbox: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  menuItemContent: {
    marginRight: 32,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  menuItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemDuration: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  stepDescription: {
    fontSize: 12,
    color: '#666',
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#333',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
});