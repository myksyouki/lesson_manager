import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface SheetMusicViewerProps {
  url: string | null;
}

// デバッグ用にダミーの楽譜画像URL
const DUMMY_SHEET_MUSIC_URL = 'https://firebasestorage.googleapis.com/v0/b/lesson-manager-99ab9.firebasestorage.app/o/sheetMusic%2Fmenu_A_major_174495878763_512-media%26token%3Da501a800-0ab0-4ec5-8db4-e6cd6052938b';

const SheetMusicViewer = ({ url }: SheetMusicViewerProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDummy, setUseDummy] = useState(false);

  // URLが無い場合はnullを返す（描画しない）
  if (!url && !useDummy) {
    console.log('楽譜URLがないため、表示しません');
    return (
      <View style={styles.container}>
        <Text style={styles.title}>楽譜</Text>
        <TouchableOpacity 
          style={styles.dummyButton}
          onPress={() => setUseDummy(true)}
        >
          <Text style={styles.dummyButtonText}>デバッグ用: ダミー楽譜を表示</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // 実際のURLまたはダミーURLを使用
  const displayUrl = url || DUMMY_SHEET_MUSIC_URL;
  console.log('表示する楽譜URL:', displayUrl);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>楽譜 {useDummy ? '(デバッグ表示)' : ''}</Text>
      
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
        style={styles.imageContainer}
      >
        <Image 
          source={{ uri: displayUrl }} 
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
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={36} color="#E53935" />
            <Text style={styles.errorText}>画像の読み込みに失敗しました</Text>
            <Text style={styles.errorDetail}>{error}</Text>
          </View>
        )}
        
        <View style={styles.imageOverlay}>
          <MaterialIcons name="zoom-in" size={24} color="#FFFFFF" />
          <Text style={styles.imageOverlayText}>タップして拡大</Text>
        </View>
      </TouchableOpacity>

      {useDummy && (
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => setUseDummy(false)}
        >
          <Text style={styles.resetButtonText}>ダミー表示を解除</Text>
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
              source={{ uri: displayUrl }}
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