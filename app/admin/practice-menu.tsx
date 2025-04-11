import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import Slider from '@react-native-community/slider';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// 練習メニュー登録画面
export default function PracticeMenuScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  
  // フォームデータ
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instrument, setInstrument] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState(50); // 難易度を数値として初期値50に設定
  const [duration, setDuration] = useState('30');
  const [steps, setSteps] = useState([
    { id: `step_${Date.now()}_0`, title: '', description: '', duration: '10', orderIndex: 0 }
  ]);
  const [tags, setTags] = useState<string[]>([]);
  
  // 過去に登録されたカテゴリリスト
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  
  // 楽譜データ
  const [sheetMusicSvg, setSheetMusicSvg] = useState('');
  const [sheetMusicTitle, setSheetMusicTitle] = useState('');
  const [sheetMusicTags, setSheetMusicTags] = useState<string[]>([]);
  const [hasSheetMusic, setHasSheetMusic] = useState(false);
  
  // 画像アップロード関連
  const [sheetMusicImage, setSheetMusicImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // 楽器の選択肢
  const instruments = [
    '選択してください', 
    'piano', 
    'guitar', 
    'violin', 
    'saxophone', 
    'trumpet', 
    'flute', 
    'drums'
  ];
  
  // ユーザーが管理者かどうかをチェック
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          Alert.alert('エラー', 'ログインが必要です。');
          router.replace('/');
          return;
        }
        
        const db = getFirestore();
        const userDocRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userDocRef);
        
        const hasAdminRole = userSnapshot.exists() && userSnapshot.data()?.isAdmin === true;
        setIsAdmin(hasAdminRole);
        
        if (!hasAdminRole) {
          Alert.alert('アクセス拒否', '管理者権限が必要です。');
          router.replace('/');
        }
      } catch (error) {
        console.error('管理者ステータス確認エラー:', error);
        Alert.alert('エラー', '認証情報の確認中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
    loadExistingCategories();
  }, []);
  
  // 既存のカテゴリを取得
  const loadExistingCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const db = getFirestore();
      
      const categoriesSet = new Set<string>();

      // 楽器ごとのドキュメントを取得
      const instrumentsRef = collection(db, 'practiceMenus');
      const instrumentsSnapshot = await getDocs(instrumentsRef);
      
      // 各楽器ドキュメントのカテゴリサブコレクションを取得
      for (const instrumentDoc of instrumentsSnapshot.docs) {
        try {
          const categoriesRef = collection(db, 'practiceMenus', instrumentDoc.id, 'categories');
          const categoriesSnapshot = await getDocs(categoriesRef);
          
          // カテゴリIDを追加
          categoriesSnapshot.docs.forEach(doc => {
            categoriesSet.add(doc.id);
          });
        } catch (error) {
          console.error(`${instrumentDoc.id}のカテゴリ取得エラー:`, error);
        }
      }
      
      // デフォルトカテゴリを追加
      const defaultCategories = ['基礎', 'テクニック', '表現', 'リズム', '音色'];
      defaultCategories.forEach(category => categoriesSet.add(category));
      
      // カテゴリをソート
      const sortedCategories = Array.from(categoriesSet).sort();
      
      setExistingCategories(sortedCategories);
      console.log('カテゴリ取得完了:', sortedCategories);
    } catch (error) {
      console.error('カテゴリデータ取得エラー:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // ステップを追加
  const addStep = () => {
    const newStep = {
      id: `step_${Date.now()}_${steps.length}`,
      title: '',
      description: '',
      duration: '10',
      orderIndex: steps.length
    };
    
    setSteps([...steps, newStep]);
  };
  
  // ステップを削除
  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      Alert.alert('エラー', '少なくとも1つのステップが必要です。');
      return;
    }
    
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    
    // orderIndexを更新
    const updatedSteps = newSteps.map((step, idx) => ({
      ...step,
      orderIndex: idx
    }));
    
    setSteps(updatedSteps);
  };
  
  // ステップの内容を更新
  const updateStep = (index: number, field: string, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value
    };
    
    setSteps(newSteps);
  };
  
  // 画像選択ハンドラー
  const pickImage = async () => {
    try {
      // 権限をリクエスト
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限エラー', '画像ライブラリへのアクセス権限が必要です');
        return;
      }

      // 画像ピッカーを起動
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSheetMusicImage(result.assets[0].uri);
        // SVGモードをオフにする
        setHasSheetMusic(false);
        // タイトルが空の場合は練習メニューのタイトルを使用
        if (!sheetMusicTitle) {
          setSheetMusicTitle(title);
        }
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択中にエラーが発生しました');
    }
  };

  // 画像のリセット
  const resetImage = () => {
    setSheetMusicImage(null);
  };
  
  // フォームのバリデーション
  const validateForm = () => {
    if (!title) {
      Alert.alert('エラー', 'タイトルは必須です');
      return false;
    }
    if (!description) {
      Alert.alert('エラー', '説明は必須です');
      return false;
    }
    if (!instrument || instrument === '選択してください') {
      Alert.alert('エラー', '楽器を選択してください');
      return false;
    }
    if (!category) {
      Alert.alert('エラー', 'カテゴリは必須です');
      return false;
    }
    
    // 少なくとも1つのステップが必要、かつ各ステップにタイトルと説明が必要
    if (steps.length === 0) {
      Alert.alert('エラー', '少なくとも1つの練習ステップを追加してください');
      return false;
    }
    
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].title || !steps[i].description) {
        Alert.alert('エラー', `ステップ ${i + 1} のタイトルと説明は必須です`);
        return false;
      }
    }

    // 楽譜画像またはSVGが必要
    if (hasSheetMusic && !sheetMusicSvg && !sheetMusicImage) {
      Alert.alert('エラー', '楽譜データが入力されていません');
      return false;
    }

    return true;
  };
  
  // フォーム送信ハンドラ
  const handleSubmit = async () => {
    try {
      if (!validateForm()) {
        return;
      }
      
      setIsSaving(true);
      
      try {
        const db = getFirestore();
        // 一意のメニューIDを生成（タイムスタンプを含む）
        const menuId = `menu_${Date.now()}`;
        
        // 楽器のドキュメント参照
        const instrumentDocRef = doc(db, 'practiceMenus', instrument);
        
        // 楽器ドキュメントをチェック、なければ作成
        const instrumentDocSnapshot = await getDoc(instrumentDocRef);
        if (!instrumentDocSnapshot.exists()) {
          await setDoc(instrumentDocRef, {
            name: instrument,
            createdAt: serverTimestamp(),
          });
        }
        
        // カテゴリのドキュメント参照
        const categoryCollectionRef = collection(instrumentDocRef, 'categories');
        const categoryDocRef = doc(categoryCollectionRef, category);
        
        // カテゴリドキュメントをチェック、なければ作成
        const categoryDocSnapshot = await getDoc(categoryDocRef);
        if (!categoryDocSnapshot.exists()) {
          await setDoc(categoryDocRef, {
            name: category,
            createdAt: serverTimestamp(),
          });
        }
        
        // メニューのコレクション参照
        const menuCollectionRef = collection(categoryDocRef, 'menus');
        
        // メニューのドキュメント参照
        const menuDocRef = doc(menuCollectionRef, menuId);
        
        // 画像のアップロード
        let sheetMusicUrl = '';
        if (sheetMusicImage) {
          setIsUploading(true);
          
          // URIからBlobを取得
          const response = await fetch(sheetMusicImage);
          const blob = await response.blob();
          
          // Storageの参照を作成
          const imagePath = `sheetMusic/${menuId}.jpg`;
          const storageRef = ref(storage, imagePath);
          
          // アップロード
          const uploadResult = await uploadBytes(storageRef, blob);
          
          // ダウンロードURLを取得
          sheetMusicUrl = await getDownloadURL(uploadResult.ref);
          
          setIsUploading(false);
        }
        
        // メニューデータを作成
        const menuData = {
          id: menuId,
          title,
          description,
          instrument,
          category,
          difficulty: Number(difficulty),
          estimatedDuration: Number(duration),
          steps: steps.map((step, index) => ({
            ...step,
            order: index + 1,
          })),
          tags,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        // メニューデータを保存
        await setDoc(menuDocRef, menuData);
        
        console.log('練習メニューが作成されました:', menuId);
        
        // 楽譜データがある場合は保存
        if (hasSheetMusic && sheetMusicSvg) {
          const sheetMusicCollectionRef = collection(menuDocRef, 'sheetMusic');
          const sheetMusicDocRef = doc(sheetMusicCollectionRef, 'default');
          
          await setDoc(sheetMusicDocRef, {
            menuId,
            svg: sheetMusicSvg,
            title: sheetMusicTitle || title,
            tags: sheetMusicTags.join(','),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
          console.log('SVG楽譜データが保存されました');
        } else if (sheetMusicImage && sheetMusicUrl) {
          // 画像がアップロードされている場合
          const sheetMusicCollectionRef = collection(menuDocRef, 'sheetMusic');
          const sheetMusicDocRef = doc(sheetMusicCollectionRef, 'default');
          
          await setDoc(sheetMusicDocRef, {
            menuId,
            imageUrl: sheetMusicUrl,
            title: sheetMusicTitle || title,
            tags: sheetMusicTags.join(','),
            format: 'image/jpeg',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
          console.log('画像楽譜データが保存されました');
        }
        
        // フォームをリセット
        resetForm();
        
        Alert.alert('成功', '練習メニューが保存されました');
      } catch (error: unknown) {
        console.error('保存エラー:', error);
        Alert.alert('エラー', `保存に失敗しました: ${error instanceof FirebaseError ? error.message : '不明なエラー'}`);
      }

      setIsSaving(false);
    } catch (error) {
      console.error('エラー:', error);
      Alert.alert('エラー', '予期せぬエラーが発生しました');
      setIsSaving(false);
    }
  };
  
  // フォームリセット処理にsheetMusicImageも追加
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstrument('');
    setCategory('');
    setDifficulty(1);
    setDuration('');
    setSteps([
      { id: `step_${Date.now()}_0`, title: '', description: '', duration: '10', orderIndex: 0 }
    ]);
    setTags([]);
    setHasSheetMusic(false);
    setSheetMusicSvg('');
    setSheetMusicTitle('');
    setSheetMusicTags([]);
    setSheetMusicImage(null);
  };
  
  // SelectInput コンポーネント
  const SelectInput = ({ 
    label, 
    value, 
    onValueChange, 
    options 
  }: { 
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
  }) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectContainer}>
        {options.map((option: string, index: number) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.option,
              value === option && styles.selectedOption
            ]}
            onPress={() => onValueChange(option)}
          >
            <Text
              style={[
                styles.optionText,
                value === option && styles.selectedOptionText
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  // タグ処理関数
  const handleTagsChange = (text: string) => {
    // コンマで区切り、各タグをトリムして配列に変換
    const tagsArray = text.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setTags(tagsArray);
  };

  const handleSheetMusicTagsChange = (text: string) => {
    // コンマで区切り、各タグをトリムして配列に変換
    const tagsArray = text.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setSheetMusicTags(tagsArray);
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B68EE" />
      </View>
    );
  }
  
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text>管理者権限がありません</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen 
        options={{
          title: '練習コンテンツ登録',
          headerStyle: { backgroundColor: '#7B68EE' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <StatusBar style="light" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>練習コンテンツ登録</Text>
          <Text style={styles.pageSubtitle}>新しい練習メニューと楽譜をセットで登録します</Text>
        </View>
        
        <View style={styles.form}>
          <Text style={styles.formSectionTitle}>基本情報</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="練習メニューのタイトル"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>説明</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="練習メニューの説明"
              multiline={true}
              numberOfLines={4}
            />
          </View>
          
          <SelectInput
            label="楽器"
            value={instrument}
            onValueChange={setInstrument}
            options={instruments}
          />
          
          {/* カテゴリ入力（自由入力＋過去のカテゴリから選択可能） */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>カテゴリ</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="カテゴリを入力してください"
              onFocus={() => setShowCategoryOptions(true)}
              onBlur={() => setTimeout(() => setShowCategoryOptions(false), 200)}
            />
            {showCategoryOptions && existingCategories.length > 0 && (
              <View style={styles.categoryOptions}>
                <Text style={styles.categoryOptionsTitle}>既存のカテゴリ</Text>
                <View style={styles.selectContainer}>
                  {existingCategories.map((cat, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.option,
                        category === cat && styles.selectedOption
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryOptions(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          category === cat && styles.selectedOptionText
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
          
          {/* 難易度入力（0〜100のスライダー） */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>難易度指標 ({difficulty}/100)</Text>
            <View style={styles.difficultyContainer}>
              <Slider
                style={styles.slider}
                value={Number(difficulty)}
                onValueChange={(value: number) => setDifficulty(Math.round(value))}
                minimumValue={0}
                maximumValue={100}
                step={1}
                minimumTrackTintColor="#7B68EE"
                maximumTrackTintColor="#ddd"
                thumbTintColor="#7B68EE"
              />
              <View style={styles.difficultyLabelContainer}>
                <Text style={styles.difficultyLabel}>簡単</Text>
                <Text style={styles.difficultyLabel}>難しい</Text>
              </View>
            </View>
            <TextInput
              style={styles.difficultyInput}
              value={String(difficulty)}
              onChangeText={(value) => {
                const num = parseInt(value);
                if (isNaN(num)) {
                  setDifficulty(0);
                } else if (num > 100) {
                  setDifficulty(100);
                } else {
                  setDifficulty(num);
                }
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>所要時間（分）</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="30"
              keyboardType="number-pad"
            />
          </View>
          
          {/* タグ */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>タグ（コンマ区切り）:</Text>
            <TextInput
              style={styles.input}
              value={tags.join(', ')}
              onChangeText={handleTagsChange}
              placeholder="演奏技術, 初心者向け, 音色"
              multiline={false}
            />
          </View>
          
          <View style={styles.divider} />
          
          {/* 楽譜セクション */}
          <View style={styles.divider} />
          <Text style={styles.formSectionTitle}>楽譜データ</Text>
          
          <View style={styles.formGroup}>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>楽譜を登録する</Text>
              <Switch
                value={hasSheetMusic}
                onValueChange={setHasSheetMusic}
                trackColor={{ false: '#D1D1D6', true: '#b4a7f5' }}
                thumbColor={hasSheetMusic ? '#7B68EE' : '#f4f3f4'}
              />
            </View>
          </View>
          
          {hasSheetMusic && (
            <View style={styles.sheetMusicSection}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>タイトル（オプション）</Text>
                <TextInput
                  style={styles.input}
                  value={sheetMusicTitle}
                  onChangeText={setSheetMusicTitle}
                  placeholder="楽譜のタイトル（未入力の場合、メニュータイトルを使用）"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>タグ（コンマ区切り）</Text>
                <TextInput
                  style={styles.input}
                  value={sheetMusicTags.join(', ')}
                  onChangeText={handleSheetMusicTagsChange}
                  placeholder="例: 初級, スケール, 教本"
                />
              </View>
              
              <Text style={styles.label}>楽譜データ</Text>
              
              <View style={styles.sheetMusicOptions}>
                <TouchableOpacity 
                  style={[styles.fileButton, { backgroundColor: '#4285F4' }]}
                  onPress={pickImage}
                >
                  <MaterialIcons name="image" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.fileButtonText}>画像をアップロード</Text>
                </TouchableOpacity>
                
                {sheetMusicImage && (
                  <View style={styles.selectedImageContainer}>
                    <Image 
                      source={{ uri: sheetMusicImage }} 
                      style={styles.previewImage} 
                      resizeMode="contain"
                    />
                    <TouchableOpacity 
                      style={styles.removeImageButton} 
                      onPress={resetImage}
                    >
                      <MaterialIcons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                
                <Text style={styles.orText}>または</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>SVGデータ</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={sheetMusicSvg}
                    onChangeText={setSheetMusicSvg}
                    placeholder="<svg>...</svg>"
                    multiline={true}
                    numberOfLines={6}
                  />
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.divider} />
          
          {/* 練習ステップセクション */}
          <Text style={styles.formSectionTitle}>練習ステップ</Text>
          <View style={styles.stepsSectionHeader}>
            <Text style={styles.stepsSectionTitle}>練習手順</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addStep}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>ステップを追加</Text>
            </TouchableOpacity>
          </View>
          
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepItem}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>ステップ {index + 1}</Text>
                <TouchableOpacity
                  onPress={() => removeStep(index)}
                >
                  <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>タイトル</Text>
                <TextInput
                  style={styles.input}
                  value={step.title}
                  onChangeText={(value) => updateStep(index, 'title', value)}
                  placeholder="ステップのタイトル"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>説明</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={step.description}
                  onChangeText={(value) => updateStep(index, 'description', value)}
                  placeholder="ステップの説明"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>所要時間（分）</Text>
                <TextInput
                  style={styles.input}
                  value={step.duration}
                  onChangeText={(value) => updateStep(index, 'duration', value)}
                  placeholder="10"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          ))}
          
          <TouchableOpacity
            style={[styles.submitButton, isSaving && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>登録する</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* タブナビゲーション (画面下部) */}
      <View style={styles.bottomTabContainer}>
        {[
          { name: 'ホーム', icon: 'home', route: '/' },
          { name: 'コンテンツ管理', icon: 'library-music', route: '/admin' },
          { name: 'ユーザー管理', icon: 'people', route: '/admin?tab=users' }
        ].map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.bottomTab,
              index === 1 && styles.activeTab
            ]}
            onPress={() => {
              if (index !== 1) {
                router.push(tab.route as any);
              }
            }}
          >
            <MaterialIcons 
              name={tab.icon as any} 
              size={24} 
              color={index === 1 ? '#7B68EE' : '#888'} 
            />
            <Text style={[
              styles.bottomTabLabel,
              index === 1 && styles.activeTabLabel
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80, // タブナビゲーションの高さ分余白を確保
  },
  headerContainer: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    marginBottom: 8,
    color: '#444',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 4,
    backgroundColor: '#f9f9f9',
  },
  selectedOption: {
    backgroundColor: '#7B68EE',
    borderColor: '#7B68EE',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '500',
  },
  stepsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B68EE',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  stepItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#7B68EE',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#B5B5B5',
    shadowOpacity: 0.1,
  },
  bottomTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bottomTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomTabLabel: {
    fontSize: 11,
    marginTop: 2,
    color: '#888',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#7B68EE',
  },
  activeTabLabel: {
    color: '#7B68EE',
    fontWeight: 'bold',
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  sheetMusicSection: {
    backgroundColor: '#f8f8ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#7B68EE',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  fileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  categoryOptions: {
    marginTop: 10,
  },
  categoryOptionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
  },
  difficultyLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 100,
  },
  difficultyLabel: {
    fontSize: 12,
    color: '#666',
  },
  difficultyInput: {
    width: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sheetMusicOptions: {
    marginTop: 12,
  },
  selectedImageContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
    fontStyle: 'italic',
  },
}); 