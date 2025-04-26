import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface SheetMusicViewerProps {
  url: string | null;
}

// デバッグ用にダミーの楽譜画像URL
const DUMMY_SHEET_MUSIC_URL = 'https://firebasestorage.googleapis.com/v0/b/lesson-manager-99ab9.firebasestorage.app/o/sheetMusic%2Fmenu_A_major_174495878763_512-media&token=a501a800-0ab0-4ec5-8db4-e6cd6052938b';

// 直接アクセス可能な公開URLのテスト
const PUBLIC_TEST_URL = 'https://i.ibb.co/SQyNtdj/sheet-music-sample.jpg';

/**
 * FirebaseのURL形式をチェックし、必要に応じて修正する
 */
const cleanFirebaseUrl = (url: string) => {
  console.log('URLクリーニング前:', url);
  
  try {
    // token前の&が%26になっていることがあるので修正
    if (url.includes('%26token=')) {
      url = url.replace('%26token=', '&token=');
    }
    
    // URL内に%2Fが含まれている場合、デコードする
    if (url.includes('%2F')) {
      // URLエンコーディングを部分的にデコード
      url = url.replace(/%2F/g, '/');
    }
    
    console.log('URLクリーニング後:', url);
    return url;
  } catch (e) {
    console.error('URL整形エラー:', e);
    return url;
  }
};

const SheetMusicViewer = ({ url }: SheetMusicViewerProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDummy, setUseDummy] = useState(false);
  const [usePublicTest, setUsePublicTest] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(url);
  
  // URLの状態を更新
  React.useEffect(() => {
    if (url && url !== currentUrl) {
      setCurrentUrl(url);
      setLoading(true);
      setError(null);
    }
  }, [url]);

  // URLが無い場合はデバッグオプションを表示
  if (!currentUrl && !useDummy && !usePublicTest) {
    console.log('楽譜URLがないため、表示しません');
    return (
      <View style={styles.container}>
        <Text style={styles.title}>楽譜</Text>
        <Text style={styles.noDataText}>楽譜データが読み込めません</Text>
        <View style={styles.debugButtonsContainer}>
          <TouchableOpacity 
            style={styles.dummyButton}
            onPress={() => {
              setUseDummy(true);
              setUsePublicTest(false);
              setLoading(true);
              setError(null);
            }}
          >
            <Text style={styles.dummyButtonText}>Firebase URL をテスト</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dummyButton, {backgroundColor: '#E8F5E9'}]}
            onPress={() => {
              setUsePublicTest(true);
              setUseDummy(false);
              setLoading(true);
              setError(null);
            }}
          >
            <Text style={[styles.dummyButtonText, {color: '#2E7D32'}]}>公開URLをテスト</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // 表示するURLを決定
  let displayUrl = currentUrl;
  if (useDummy) {
    displayUrl = DUMMY_SHEET_MUSIC_URL;
  } else if (usePublicTest) {
    displayUrl = PUBLIC_TEST_URL;
  }
  
  // URLがあれば必要に応じてクリーニング
  if (displayUrl) {
    displayUrl = cleanFirebaseUrl(displayUrl);
  }
  
  console.log('表示する楽譜URL:', displayUrl);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        楽譜 
        {useDummy ? '(Firebase URL テスト)' : ''}
        {usePublicTest ? '(公開URL テスト)' : ''}
      </Text>
      
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
        style={styles.imageContainer}
      >
        <Image 
          source={{ uri: displayUrl || '' }} 
          style={styles.image}
          resizeMode="contain"
          onLoad={() => {
            console.log('楽譜画像が読み込まれました');
            setLoading(false);
            setError(null);
          }}
          onError={(error) => {
            console.error('楽譜画像読み込みエラー:', error.nativeEvent.error);
            setLoading(false);
            setError(error.nativeEvent.error);
          }}
        />
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>楽譜を読み込み中...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={36} color="#E53935" />
            <Text style={styles.errorText}>画像の読み込みに失敗しました</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <View style={styles.debugButtonsContainer}>
              <TouchableOpacity 
                style={[styles.resetButton, {backgroundColor: '#E8F5E9'}]}
                onPress={() => {
                  setUsePublicTest(true);
                  setUseDummy(false);
                  setLoading(true);
                  setError(null);
                }}
              >
                <Text style={[styles.resetButtonText, {color: '#2E7D32'}]}>公開URLに切替</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.imageOverlay}>
          <MaterialIcons name="zoom-in" size={24} color="#FFFFFF" />
          <Text style={styles.imageOverlayText}>タップして拡大</Text>
        </View>
      </TouchableOpacity>

      {(useDummy || usePublicTest) && (
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => {
            setUseDummy(false);
            setUsePublicTest(false);
            setCurrentUrl(url);
            setLoading(true);
          }}
        >
          <Text style={styles.resetButtonText}>テストモードを解除</Text>
        </TouchableOpacity>
      )}
      
      {/* 楽譜モーダル */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar hidden />
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            maximumZoomScale={5.0}
            minimumZoomScale={1.0}
            bouncesZoom
          >
            <Image
              source={{ uri: displayUrl || '' }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 10,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.7)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4285F4',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
  },
  debugButtonsContainer: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 10,
    color: '#E53935',
    fontSize: 16,
    textAlign: 'center',
  },
  errorDetail: {
    marginTop: 5,
    color: '#E53935',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: '#FFFFFF',
    marginLeft: 5,
    fontSize: 14,
  },
  dummyButton: {
    backgroundColor: '#E1F5FE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    marginHorizontal: 5,
  },
  dummyButtonText: {
    color: '#0288D1',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});

export default SheetMusicViewer; 