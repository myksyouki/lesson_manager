import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useTaskStore } from '../../../../store/tasks';
import { useLessonStore } from '../../../../store/lessons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../../../theme';

export const DetailedReport = () => {
  const { tasks, taskCompletionHistory } = useTaskStore();
  const { lessons } = useLessonStore();
  const theme = useTheme();

  // タグごとの練習時間の集計
  const tagPracticeData = React.useMemo(() => {
    const tagStats = lessons.reduce((acc, lesson) => {
      lesson.tags?.forEach(tag => {
        if (!acc[tag]) {
          acc[tag] = 0;
        }
        acc[tag]++;
      });
      return acc;
    }, {} as Record<string, number>);

    // 上位5つのタグを抽出
    return Object.entries(tagStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        count,
        color: theme.chartColors[index % theme.chartColors.length],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }));
  }, [lessons, theme]);

  // 週間の練習達成率の計算
  const weeklyProgress = React.useMemo(() => {
    const now = new Date();
    const lastWeek = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyCompletions = taskCompletionHistory.reduce((acc, history) => {
      const date = new Date(history.completedAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: lastWeek.map(date => new Date(date).toLocaleDateString('ja-JP', { weekday: 'short' })),
      datasets: [{
        data: lastWeek.map(date => dailyCompletions[date] || 0),
      }],
    };
  }, [taskCompletionHistory]);

  // 練習の詳細統計
  const practiceStats = React.useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const totalLessons = lessons.length;
    const averageTasksPerLesson = totalLessons > 0 ? totalTasks / totalLessons : 0;

    return {
      totalTasks,
      completedTasks,
      completionRate: completionRate.toFixed(1),
      totalLessons,
      averageTasksPerLesson: averageTasksPerLesson.toFixed(1),
    };
  }, [tasks, lessons]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(81, 91, 212, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>練習の概要</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{practiceStats.totalTasks}</Text>
            <Text style={styles.statLabel}>総タスク数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{practiceStats.completedTasks}</Text>
            <Text style={styles.statLabel}>完了タスク</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{practiceStats.completionRate}%</Text>
            <Text style={styles.statLabel}>達成率</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{practiceStats.averageTasksPerLesson}</Text>
            <Text style={styles.statLabel}>レッスン毎の平均タスク</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>練習項目の分布</Text>
        <View style={styles.chartContainer}>
          <PieChart
            data={tagPracticeData}
            width={Dimensions.get('window').width - 32}
            height={220}
            chartConfig={chartConfig}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>週間練習達成推移</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={weeklyProgress}
            width={Dimensions.get('window').width - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  statItem: {
    width: '45%',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#515BD4',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default DetailedReport; 