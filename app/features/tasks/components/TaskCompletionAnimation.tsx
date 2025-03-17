import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface TaskCompletionAnimationProps {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
  category?: string;
  completionCount: number;
  streakCount: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TaskCompletionAnimation: React.FC<TaskCompletionAnimationProps> = ({
  visible,
  onClose,
  taskTitle,
  category,
  completionCount,
  streakCount
}) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [visible]);

  // カテゴリに基づいて色を決定
  const getCategoryColor = () => {
    if (!category) return '#4CAF50'; // デフォルト色
    
    switch (category.toLowerCase()) {
      case 'ロングトーン':
        return '#3F51B5'; // 青
      case '音階':
        return '#FF9800'; // オレンジ
      case '曲練習':
        return '#E91E63'; // ピンク
      case 'アンサンブル':
        return '#9C27B0'; // 紫
      case 'リズム':
        return '#FFC107'; // 黄色
      default:
        return '#4CAF50'; // デフォルト緑
    }
  };

  const buttonColor = getCategoryColor();

  // 達成メッセージを取得
  const getAchievementMessage = () => {
    if (streakCount >= 7) {
      return '素晴らしい連続達成！';
    } else if (completionCount >= 10) {
      return '継続は力なり！';
    } else if (completionCount >= 5) {
      return '着実に進歩しています！';
    } else if (streakCount >= 3) {
      return '連続達成中！';
    } else if (completionCount >= 1) {
      return 'よく頑張りました！';
    }
    return 'タスク完了！';
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={styles.container}>
          <View style={[styles.card, { borderColor: buttonColor }]}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
            
            <View style={styles.confettiContainer}>
              <LottieView
                ref={lottieRef}
                source={require('../../../assets/animations/confetti.json')}
                style={styles.confetti}
                loop={false}
                autoPlay
              />
            </View>
            
            <View style={styles.contentContainer}>
              <Text style={styles.completedText}>完了！</Text>
              <Text style={styles.taskTitle} numberOfLines={2}>{taskTitle}</Text>
              <Text style={[styles.achievementMessage, { color: buttonColor }]}>
                {getAchievementMessage()}
              </Text>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{completionCount}</Text>
                  <Text style={styles.statLabel}>完了回数</Text>
                </View>
                
                <View style={[styles.divider, { backgroundColor: buttonColor }]} />
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{streakCount}</Text>
                  <Text style={styles.statLabel}>連続日数</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.closeButtonBottom, { backgroundColor: buttonColor }]}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 340,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    width: 300,
    height: 300,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  completedText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  achievementMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#4CAF50',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#4CAF50',
    marginHorizontal: 10,
  },
  closeButtonBottom: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TaskCompletionAnimation; 