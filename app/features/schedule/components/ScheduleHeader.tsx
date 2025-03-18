import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// スケジュールタブのテーマカラー
const SCHEDULE_THEME_COLOR = '#2196F3';

interface ScheduleHeaderProps {
  // 将来的にフィルターなどの機能を追加する場合に備えてpropsを定義
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = () => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <MaterialCommunityIcons name="calendar-month" size={24} color={SCHEDULE_THEME_COLOR} />
        <Text style={styles.headerTitle}>スケジュール</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 8,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default ScheduleHeader; 