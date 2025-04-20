import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TaskProgressBar from './TaskProgressBar';
import Svg, { Circle } from 'react-native-svg';

interface CategorySummary {
  name: string;
  completedCount: number;
  totalCount: number;
  icon: JSX.Element;
  color: string;
}

interface TaskCategorySummaryMiniProps {
  categories: CategorySummary[];
  totalCompleted: number;
  totalTasks: number;
  onViewAllPress?: () => void;
}

// テーマカラー定義
const TASK_THEME_COLOR = '#4CAF50';
const TASK_THEME_LIGHT = '#E8F5E9';

const TaskCategorySummaryMini: React.FC<TaskCategorySummaryMiniProps> = ({
  categories,
  totalCompleted,
  totalTasks,
  onViewAllPress,
}) => {
  // 全体の進捗率を計算
  const totalProgress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;
  const progressPercentage = Math.round(totalProgress);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="assignment" size={20} color={TASK_THEME_COLOR} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>練習進捗状況</Text>
        </View>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>詳細</Text>
            <MaterialIcons name="chevron-right" size={16} color={TASK_THEME_COLOR} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.overallContainer}>
        <View style={styles.progressCircleContainer}>
          <Svg height={70} width={70}>
            <Circle
              stroke={TASK_THEME_LIGHT}
              fill="none"
              cx={35}
              cy={35}
              r={radius}
              strokeWidth={6}
            />
            {progressPercentage > 0 && (
              <Circle
                stroke={TASK_THEME_COLOR}
                fill="none"
                cx={35}
                cy={35}
                r={radius}
                strokeWidth={6}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - totalProgress / 100)}
                strokeLinecap="round"
                rotation={-90}
                originX={35}
                originY={35}
              />
            )}
          </Svg>
          <View style={styles.progressCircleTextContainer}>
            <Text style={styles.progressCircleText}>{progressPercentage}%</Text>
          </View>
        </View>
        
        <View style={styles.progressDetailContainer}>
          <Text style={styles.overallTitle}>全体の進捗</Text>
          <View style={styles.overallProgressContainer}>
            <View
              style={[
                styles.overallProgressBar,
                { width: `${totalProgress}%` },
              ]}
            />
          </View>
          <Text style={styles.overallCount}>
            <Text style={styles.completedCount}>{totalCompleted}</Text>/{totalTasks} 完了
          </Text>
          
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, styles.statusPending]} />
              <Text style={styles.statusText}>未完了 ({totalTasks - totalCompleted})</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, styles.statusCompleted]} />
              <Text style={styles.statusText}>完了済 ({totalCompleted})</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TASK_THEME_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: TASK_THEME_COLOR,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircleContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressCircleTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TASK_THEME_COLOR,
  },
  progressDetailContainer: {
    flex: 1,
  },
  overallTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  overallTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5F6368',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: TASK_THEME_COLOR,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallProgressContainer: {
    height: 10,
    backgroundColor: TASK_THEME_LIGHT,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  overallProgressBar: {
    height: '100%',
    backgroundColor: TASK_THEME_COLOR,
    borderRadius: 5,
  },
  overallCount: {
    fontSize: 13,
    color: '#5F6368',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  completedCount: {
    color: TASK_THEME_COLOR,
    fontWeight: '700',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusPending: {
    backgroundColor: '#9E9E9E',
  },
  statusCompleted: {
    backgroundColor: TASK_THEME_COLOR,
  },
  statusText: {
    fontSize: 12,
    color: '#757575',
  },
});

export default TaskCategorySummaryMini; 