import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { useTaskStore } from '../../../../store/tasks';
import { useLessonStore } from '../../../../store/lessons';
import { useTheme } from '../../../../theme';

// 月を取得するユーティリティ関数
const getMonthLabels = (count = 6) => {
  const months = [];
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const month = new Date(now);
    month.setMonth(now.getMonth() - i);
    months.push(month.getMonth() + 1 + '月');
  }
  
  return months;
};

// 日付からその月のデータを取得する関数
const getMonthFromDate = (dateString: string) => {
  if (!dateString) return null;
  
  // 日本の日付形式 (YYYY年MM月DD日) からMonthを抽出
  const matches = dateString.match(/(\d+)年(\d+)月/);
  if (matches && matches.length >= 3) {
    return parseInt(matches[2], 10);
  }
  
  // 標準的な日付形式 (YYYY-MM-DD) からもMonthを抽出試行
  const dateObj = new Date(dateString);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.getMonth() + 1;
  }
  
  return null;
};

export default function ChartSection() {
  const [selectedChart, setSelectedChart] = useState<'practice' | 'lessons'>('practice');
  const { tasks, taskCompletionHistory } = useTaskStore();
  const { lessons } = useLessonStore();
  const theme = useTheme();
  
  // 月ごとのデータを集計
  const getMonthlyData = () => {
    const months = getMonthLabels();
    const currentMonth = new Date().getMonth() + 1;
    
    // 月ごとのデータを初期化
    const monthlyData = {
      practice: Array(months.length).fill(0),
      lessons: Array(months.length).fill(0)
    };
    
    // ユニークな練習日を月ごとに集計
    const practiceDays = new Set<string>();
    taskCompletionHistory.forEach(history => {
      if (!history.completedAt) return;
      
      const date = new Date(history.completedAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      
      practiceDays.add(dateKey);
    });
    
    // 練習日を月ごとに集計
    Array.from(practiceDays).forEach(dateKey => {
      const [year, month] = dateKey.split('-').map(Number);
      const monthIndex = months.findIndex(m => parseInt(m) === month);
      
      if (monthIndex !== -1) {
        monthlyData.practice[monthIndex]++;
      }
    });
    
    // レッスンを月ごとに集計
    lessons.forEach(lesson => {
      const month = getMonthFromDate(lesson.date);
      if (!month) return;
      
      const monthIndex = months.findIndex(m => parseInt(m) === month);
      if (monthIndex !== -1) {
        monthlyData.lessons[monthIndex]++;
      }
    });
    
    return {
      months,
      data: monthlyData
    };
  };
  
  const { months, data } = getMonthlyData();
  
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(81, 91, 212, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false
  };
  
  // 現在選択されているチャートデータ
  const chartData = {
    labels: months,
    datasets: [
      {
        data: selectedChart === 'practice' ? data.practice : data.lessons,
        color: (opacity = 1) => selectedChart === 'practice' 
          ? `rgba(76, 175, 80, ${opacity})` 
          : `rgba(255, 152, 0, ${opacity})`,
      }
    ]
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>月間統計</Text>
      
      <View style={styles.tabContainer}>        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            selectedChart === 'practice' && styles.selectedTab
          ]}
          onPress={() => setSelectedChart('practice')}
        >
          <MaterialIcons 
            name="music-note" 
            size={16} 
            color={selectedChart === 'practice' ? theme.colors.primary : '#757575'} 
          />
          <Text style={[
            styles.tabText, 
            selectedChart === 'practice' && styles.selectedTabText
          ]}>
            練習日数
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            selectedChart === 'lessons' && styles.selectedTab
          ]}
          onPress={() => setSelectedChart('lessons')}
        >
          <MaterialIcons 
            name="person" 
            size={16} 
            color={selectedChart === 'lessons' ? theme.colors.primary : '#757575'} 
          />
          <Text style={[
            styles.tabText, 
            selectedChart === 'lessons' && styles.selectedTabText
          ]}>
            レッスン
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
          showValuesOnTopOfBars
          withHorizontalLabels
          yAxisLabel=""
          yAxisSuffix=""
        />
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {selectedChart === 'practice'
                ? data.practice.reduce((sum, val) => sum + val, 0)
                : data.lessons.reduce((sum, val) => sum + val, 0)}
          </Text>
          <Text style={styles.statLabel}>
            {selectedChart === 'practice'
                ? '半年間の練習日数'
                : '半年間のレッスン数'}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {selectedChart === 'practice'
                ? Math.max(...data.practice)
                : Math.max(...data.lessons)}
          </Text>
          <Text style={styles.statLabel}>最も多い月の回数</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '50%', // 2つのタブなので50%
  },
  selectedTab: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#757575',
  },
  selectedTabText: {
    fontWeight: '600',
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#515BD4',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
}); 