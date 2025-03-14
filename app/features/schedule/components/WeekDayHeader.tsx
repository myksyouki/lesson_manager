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
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5F6368',
    width: 36,
    textAlign: 'center',
  },
  sundayText: {
    color: '#EA4335',
  },
  saturdayText: {
    color: '#4285F4',
  },
});

export default WeekDayHeader;
