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

const TaskCategorySummaryMini: React.FC<TaskCategorySummaryMiniProps> = ({
  categories,
  totalCompleted,
  totalTasks,
  onViewAllPress,
}) => {
  // 全体の進捗率を計算
  const totalProgress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>練習進捗状況</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>詳細</Text>
            <MaterialIcons name="chevron-right" size={16} color="#4285F4" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.overallContainer}>
        <View style={styles.overallTextContainer}>
          <Text style={styles.overallTitle}>全体の進捗</Text>
          <Text style={styles.overallPercentage}>{Math.round(totalProgress)}%</Text>
        </View>
        
        <View style={styles.overallProgressContainer}>
          <View
            style={[
              styles.overallProgressBar,
              { width: `${totalProgress}%` },
            ]}
          />
        </View>
        
        <Text style={styles.overallCount}>
          {totalCompleted}/{totalTasks} 完了
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallContainer: {
    marginBottom: 8,
  },
  overallTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  overallTitle: {
    fontSize: 14,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallProgressContainer: {
    height: 6,
    backgroundColor: '#E8EAED',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  overallProgressBar: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 3,
  },
  overallCount: {
    fontSize: 12,
    color: '#5F6368',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default TaskCategorySummaryMini; 