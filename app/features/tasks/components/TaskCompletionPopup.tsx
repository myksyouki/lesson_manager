import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface TaskCompletionPopupProps {
  visible: boolean;
  taskTitle: string;
  category: string;
  completionCount: number;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TaskCompletionPopup: React.FC<TaskCompletionPopupProps> = ({
  visible,
  taskTitle,
  category,
  completionCount,
  onClose,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(50);
  
  // カテゴリに応じた色を返す関数
  const getCategoryColor = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'ロングトーン':
        return '#8E24AA'; // パープル
      case 'スケール':
        return '#D81B60'; // ピンク
      case 'テクニック':
        return '#F57C00'; // オレンジ
      case '曲練習':
        return '#43A047'; // グリーン
      case 'リズム':
        return '#1E88E5'; // ブルー
      case '表現':
        return '#00ACC1'; // シアン
      case 'ペダル':
        return '#7CB342'; // ライトグリーン
      case '音色':
        return '#5E35B1'; // ディープパープル
      case '強弱':
        return '#039BE5'; // ライトブルー
      default:
        return '#4285F4'; // デフォルト
    }
  };
  
  // 達成レベルを返す関数
  const getAchievementLevel = (count: number) => {
    if (count >= 20) return 'マスター';
    if (count >= 15) return 'エキスパート';
    if (count >= 10) return '上級';
    if (count >= 5) return '中級';
    return '初級';
  };
  
  // 表示・非表示のアニメーション
  useEffect(() => {
    if (visible) {
      // 表示アニメーション
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 150 })
      );
      translateY.value = withTiming(0, { duration: 300 });
      
      // 5秒後に自動で閉じる
      const timeoutId = setTimeout(() => {
        hidePopup();
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    } else {
      hidePopup();
    }
  }, [visible]);
  
  // ポップアップを非表示にする関数
  const hidePopup = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
    scale.value = withTiming(0.8, { duration: 200 });
    translateY.value = withTiming(50, { duration: 200 });
  };
  
  // アニメーションスタイル
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
    };
  });
  
  // カテゴリの色
  const categoryColor = getCategoryColor(category);
  
  // 達成レベル
  const achievementLevel = getAchievementLevel(completionCount);
  
  if (!visible) return null;
  
  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={[styles.header, { backgroundColor: categoryColor }]}>
          <MaterialIcons name={"emoji-events" as const} size={24} color="#FFFFFF" />
          <Text style={styles.headerText}>達成！</Text>
          <TouchableOpacity style={styles.closeButton} onPress={hidePopup}>
            <MaterialIcons name={"close" as const} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {taskTitle}
          </Text>
          
          <View style={styles.achievementRow}>
            <View style={styles.achievementItem}>
              <Text style={styles.achievementLabel}>カテゴリ</Text>
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {category}
                </Text>
              </View>
            </View>
            
            <View style={styles.achievementItem}>
              <Text style={styles.achievementLabel}>累積達成</Text>
              <Text style={[styles.achievementValue, { color: categoryColor }]}>
                {completionCount}回目
              </Text>
            </View>
          </View>
          
          {completionCount >= 5 && (
            <View style={[styles.levelBadge, { backgroundColor: categoryColor }]}>
              <MaterialIcons name={"star" as const} size={16} color="#FFFFFF" />
              <Text style={styles.levelText}>
                {achievementLevel}レベル達成！
              </Text>
            </View>
          )}
          
          <Text style={styles.message}>
            継続は力なり！次の目標に向けて頑張りましょう！
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: categoryColor }]}
          onPress={hidePopup}
        >
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  achievementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  achievementItem: {
    flex: 1,
    alignItems: 'center',
  },
  achievementLabel: {
    fontSize: 12,
    color: '#5F6368',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  achievementValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  message: {
    fontSize: 14,
    color: '#5F6368',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  button: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default TaskCompletionPopup; 