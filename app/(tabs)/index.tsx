import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { processAudioFile } from '../services/audioProcessing';
import { useLessonStore } from '../store/lessons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.9; // Increased card width for better readability

const mockChallenges = [
  {
    id: 1,
    title: 'リズムの改善',
    description: 'バッハのト長調メヌエットで一定のテンポを維持する',
    date: '2024年2月15日',
  },
  {
    id: 2,
    title: '左手のテクニック',
    description: 'ショパンのノクターンで指の独立性を高める',
    date: '2024年2月14日',
  },
  {
    id: 3,
    title: '表現力',
    description: 'モーツァルトのソナタでより豊かな強弱をつける',
    date: '2024年2月13日',
  },
];

export default function HomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  const { getFavorites } = useLessonStore();
  const favoriteLesson = getFavorites();

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
    })
    .onEnd((event) => {
      const threshold = CARD_WIDTH / 4;
      if (Math.abs(event.translationX) > threshold) {
        if (event.translationX > 0 && currentIndex > 0) {
          translateX.value = withSpring(CARD_WIDTH, {}, () => {
            runOnJS(setCurrentIndex)(currentIndex - 1);
          });
        } else if (event.translationX < 0 && currentIndex < mockChallenges.length - 1) {
          translateX.value = withSpring(-CARD_WIDTH, {}, () => {
            runOnJS(setCurrentIndex)(currentIndex + 1);
          });
        }
      }
      translateX.value = withSpring(0);
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleUpload = async () => {
    try {
      // 基本のレッスンデータを作成
      const lessonData = {
        teacherName: '',
        date: new Date().toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).replace(/\s/g, ''),
        piece: '',
        notes: '',
        tags: [],
      };
      
      // lesson-form に直接遷移
      router.push('/lesson-form');

    } catch (err) {
      console.error(err);
      Alert.alert('エラー', '処理中にエラーが発生しました');
    }
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>最近の課題</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={navigateToSettings}>
            <MaterialIcons name="settings" size={28} color="#1a73e8" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.cardContainer}>
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.card, rStyle]}>
                <Text style={styles.cardTitle}>{mockChallenges[currentIndex].title}</Text>
                <Text style={styles.cardDescription}>
                  {mockChallenges[currentIndex].description}
                </Text>
                <Text style={styles.cardDate}>{mockChallenges[currentIndex].date}</Text>
              </Animated.View>
            </GestureDetector>

            <View style={styles.pagination}>
              {mockChallenges.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    currentIndex === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUpload}>
          <Ionicons name="add-circle-outline" size={26} color="white" />
          <Text style={styles.uploadButtonText}>
            新しいレッスンを追加
          </Text>
        </TouchableOpacity>
      </View>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 30, // Larger title for better readability
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  settingsButton: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  card: {
    width: CARD_WIDTH,
    padding: 24, // Increased padding
    backgroundColor: 'white',
    borderRadius: 18, // Increased border radius
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardTitle: {
    fontSize: 24, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  cardDescription: {
    fontSize: 18, // Larger font size
    color: '#636366',
    lineHeight: 26, // Increased line height
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  cardDate: {
    fontSize: 16, // Larger font size
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  pagination: {
    flexDirection: 'row',
    marginTop: 24,
  },
  paginationDot: {
    width: 10, // Larger dots
    height: 10, // Larger dots
    borderRadius: 5,
    backgroundColor: '#D1D1D6',
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: '#007AFF',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    padding: 18, // Increased padding for better touch target
    borderRadius: 16, // Increased border radius
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30, // Moved button lower on the screen
    left: 0,
    right: 0,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18, // Larger font size
    fontWeight: '600',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
