import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme/index';
//import { getPersonalizedHomeContent } from '../../../../services/cloudFunctions';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

// 練習アドバイスの型定義
interface PracticeAdvice {
  focusAreas: string[];
  recommendedTime: number;
  difficulty: string;
}

// コンポーネントのプロップス型定義
interface AIPracticeCoachProps {
  dynamicStyles: any;
  userId: string;
}

const AIPracticeCoach: React.FC<AIPracticeCoachProps> = ({ dynamicStyles, userId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [practiceAdvice, setPracticeAdvice] = useState<PracticeAdvice>({
    focusAreas: [],
    recommendedTime: 30,
    difficulty: '中級'
  });
  const [nextLesson, setNextLesson] = useState<any>(null);

  useEffect(() => {
    loadPersonalizedContent();
  }, [userId]);

  const loadPersonalizedContent = async () => {
    setLoading(true);
    try {
      console.log('パーソナライズドコンテンツの取得を開始');
      
      // ダミーデータを使用
      const result = {
        success: true,
        greeting: 'こんにちは、今日も練習しましょう',
        practiceAdvice: {
          focusAreas: ['基本練習', 'スケール', '曲の復習'],
          recommendedTime: 30,
          difficulty: '中級'
        },
        nextLesson: null
      };
      
      console.log('取得結果:', result);
      
      if (result && result.success) {
        setGreeting(result.greeting || 'こんにちは、今日も練習しましょう');
        setPracticeAdvice({
          focusAreas: result.practiceAdvice?.focusAreas || ['基本練習', 'スケール', '曲の復習'],
          recommendedTime: result.practiceAdvice?.recommendedTime || 30,
          difficulty: result.practiceAdvice?.difficulty || '中級'
        });
        setNextLesson(result.nextLesson);
      } else {
        console.warn('AIコーチデータの取得に失敗しました - デフォルト値を使用します');
      }
    } catch (error) {
      console.error('AIコーチデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToAILesson = () => {
    router.push('/tabs/ai-lesson');
  };

  const getFormattedDate = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    return `${month}月${day}日`;
  };

  // 難易度に応じた色を返す
  const getDifficultyColor = () => {
    switch (practiceAdvice.difficulty) {
      case '初級': return '#4CAF50';
      case '中級': return '#FF9800';
      case '上級': return '#F44336';
      default: return '#4CAF50';
    }
  };

  return (
    <View style={[styles.container, { borderRadius: 16 }]}>
      <LinearGradient
        colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.background, { borderRadius: 16 }]}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>AI練習コーチを準備中...</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
              <Text style={[styles.date, { 
                fontSize: dynamicStyles.subtitleFontSize - 1,
                color: theme.colors.textSecondary 
              }]}>
                {getFormattedDate()} | AI練習コーチ
              </Text>
              <Text style={[styles.greeting, { 
                fontSize: dynamicStyles.titleFontSize,
                color: theme.colors.text 
              }]}>
                {greeting || 'レッスンの準備をしましょう'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.colors.primary + '20' }]}
              onPress={navigateToAILesson}
            >
              <MaterialIcons name="auto-awesome" size={dynamicStyles.iconSize} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.adviceContainer}>
            <Text style={[styles.sectionTitle, { 
              fontSize: dynamicStyles.subtitleFontSize,
              color: theme.colors.textSecondary 
            }]}>
              今日のおすすめ練習
            </Text>
            
            <View style={styles.difficultyContainer}>
              <Text style={[styles.difficultyLabel, { fontSize: dynamicStyles.subtitleFontSize - 2 }]}>
                難易度:
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() + '30' }]}>
                <Text style={[styles.difficultyText, { 
                  color: getDifficultyColor(),
                  fontSize: dynamicStyles.subtitleFontSize - 2 
                }]}>
                  {practiceAdvice.difficulty}
                </Text>
              </View>
              <Text style={[styles.timeRecommendation, { 
                fontSize: dynamicStyles.subtitleFontSize - 2,
                color: theme.colors.textSecondary
              }]}>
                目標時間: {practiceAdvice.recommendedTime}分
              </Text>
            </View>

            <View style={styles.focusAreasContainer}>
              {practiceAdvice.focusAreas.map((area, index) => (
                <View key={index} style={[styles.focusAreaItem, { backgroundColor: theme.colors.glass }]}>
                  <MaterialIcons 
                    name="music-note" 
                    size={dynamicStyles.iconSize - 4} 
                    color={theme.colors.primary} 
                  />
                  <Text style={[styles.focusAreaText, { 
                    fontSize: dynamicStyles.subtitleFontSize,
                    color: theme.colors.text
                  }]}>
                    {area}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.askButton, { backgroundColor: theme.colors.primary }]}
              onPress={navigateToAILesson}
            >
              <Text style={[styles.askButtonText, { fontSize: dynamicStyles.subtitleFontSize }]}>
                AIに質問する
              </Text>
              <MaterialIcons name="arrow-forward" size={dynamicStyles.iconSize - 4} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  date: {
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  greeting: {
    fontWeight: '700',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adviceContainer: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  difficultyLabel: {
    opacity: 0.7,
    marginRight: 6,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  difficultyText: {
    fontWeight: '600',
  },
  timeRecommendation: {
    marginLeft: 12,
    opacity: 0.7,
  },
  focusAreasContainer: {
    marginBottom: 16,
  },
  focusAreaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  focusAreaText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  askButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 8,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.7,
  }
});

export default AIPracticeCoach; 