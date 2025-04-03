import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTaskStore } from '../../../../store/tasks';

interface MonthlyPracticeChartProps {
  themeColor?: string;
}

const MonthlyPracticeChart: React.FC<MonthlyPracticeChartProps> = ({ 
  themeColor = '#4CAF50' 
}) => {
  const { tasks } = useTaskStore();
  const [monthlyData, setMonthlyData] = useState<{labels: string[], datasets: {data: number[]}[]}>({
    labels: [],
    datasets: [{ data: [] }]
  });

  useEffect(() => {
    // 過去6ヶ月の練習日数データを生成
    const now = new Date();
    const months: string[] = [];
    const practiceData: number[] = [];
    
    // 過去6ヶ月分のデータを集計
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      
      // 月名を追加（例: 1月、2月）
      months.push(`${targetMonth + 1}月`);
      
      // その月の練習日をカウント（ユニークな日付）
      const practiceDaysInMonth = new Set<string>();
      
      tasks.forEach(task => {
        if (task.completed) {
          // 完了日を取得
          let completedDate: Date | null = null;
          
          if (task.updatedAt) {
            if (typeof task.updatedAt === 'string') {
              completedDate = new Date(task.updatedAt);
            } else if (typeof task.updatedAt === 'object' && 'seconds' in task.updatedAt) {
              completedDate = new Date(task.updatedAt.seconds * 1000);
            }
          }
          
          // その月に完了したタスクをカウント
          if (completedDate && 
              completedDate.getFullYear() === targetYear && 
              completedDate.getMonth() === targetMonth) {
            // 日付のみの文字列に変換してセットに追加（重複を排除）
            practiceDaysInMonth.add(completedDate.toISOString().split('T')[0]);
          }
        }
      });
      
      // その月の練習日数をデータに追加
      practiceData.push(practiceDaysInMonth.size);
    }
    
    setMonthlyData({
      labels: months,
      datasets: [{ data: practiceData }]
    });
  }, [tasks]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    barPercentage: 0.6,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  const screenWidth = Dimensions.get('window').width - 40;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>月別練習日数</Text>
      </View>
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartContainer}
        scrollEnabled={false}
        nestedScrollEnabled={true}
      >
        <BarChart
          data={monthlyData}
          width={Math.max(screenWidth, 300)}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(${themeColor.replace('#', '').match(/../g)?.map(hex => parseInt(hex, 16)).join(', ') || '76, 175, 80'}, ${opacity})`,
          }}
          fromZero
          showValuesOnTopOfBars
          withInnerLines={false}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix="日"
        />
      </ScrollView>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: themeColor }]}>
            {monthlyData.datasets[0].data.length > 0 
              ? monthlyData.datasets[0].data[monthlyData.datasets[0].data.length - 1] 
              : 0}
          </Text>
          <Text style={styles.statLabel}>今月の練習日数</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: themeColor }]}>
            {monthlyData.datasets[0].data.reduce((sum, current) => sum + current, 0)}
          </Text>
          <Text style={styles.statLabel}>半年間の合計</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: themeColor }]}>
            {Math.max(...monthlyData.datasets[0].data)}
          </Text>
          <Text style={styles.statLabel}>最大練習日数</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  chartContainer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
    padding: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 8,
  },
});

export default MonthlyPracticeChart; 