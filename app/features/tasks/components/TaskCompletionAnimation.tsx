import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TaskCompletionAnimationProps {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
  category?: string;
  completionCount: number;
  streakCount: number;
  themeColor?: string;
}

const { width, height } = Dimensions.get('window');

const TaskCompletionAnimation: React.FC<TaskCompletionAnimationProps> = ({
  visible,
  onClose,
  taskTitle,
  category,
  completionCount,
  streakCount,
  themeColor = '#4285F4',
}) => {
  useEffect(() => {
    if (visible) {
      // 5秒後に自動的に閉じる
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={[styles.content, { backgroundColor: `rgba(${hexToRgb(themeColor)}, 0.95)` }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.animationContainer}>
            <LottieView
              source={require('../../../../assets/animations/confetti.json')}
              autoPlay
              loop={false}
              style={styles.animation}
            />
          </View>
          
          <Text style={styles.congratsText}>おめでとう！</Text>
          <Text style={styles.taskTitle}>{taskTitle}</Text>
          {category && <Text style={styles.category}>{category}</Text>}
          
          <Text style={styles.completedText}>タスクを完了しました</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completionCount}</Text>
              <Text style={styles.statLabel}>完了回数</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streakCount}</Text>
              <Text style={styles.statLabel}>連続達成</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={[styles.buttonText, { color: themeColor }]}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// HEXをRGBに変換するヘルパー関数
const hexToRgb = (hex: string): string => {
  // #を削除
  const cleanHex = hex.replace('#', '');
  
  // RGB値を計算
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // RGB文字列を返す（0,0,0形式）
  return `${r}, ${g}, ${b}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  animationContainer: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  congratsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  completedText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  buttonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TaskCompletionAnimation; 