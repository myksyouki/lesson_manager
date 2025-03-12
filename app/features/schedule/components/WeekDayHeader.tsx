import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];

export const WeekDayHeader: React.FC = () => {
  return (
    <View style={styles.weekDayHeader}>
      {DAYS.map((day, index) => (
        <Text
          key={day}
          style={[
            styles.weekDayText,
            index === 0 && styles.sundayText,
            index === 6 && styles.saturdayText,
          ]}>
          {day}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    width: 36,
    textAlign: 'center',
  },
  sundayText: {
    color: '#FF3B30',
  },
  saturdayText: {
    color: '#007AFF',
  },
});

export default WeekDayHeader;
