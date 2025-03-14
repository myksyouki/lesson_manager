import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface CalendarHeaderProps {
  currentMonth: Date;
  onMonthChange: (increment: number) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  onMonthChange,
}) => {
  return (
    <View style={styles.monthHeader}>
      <TouchableOpacity
        onPress={() => onMonthChange(-1)}
        style={styles.monthButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialIcons name="chevron-left" size={32} color="#1a73e8" />
      </TouchableOpacity>
      <Text style={styles.monthText}>
        {currentMonth.getFullYear()}年{MONTHS[currentMonth.getMonth()]}
      </Text>
      <TouchableOpacity
        onPress={() => onMonthChange(1)}
        style={styles.monthButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialIcons name="chevron-right" size={32} color="#1a73e8" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  monthButton: {
    padding: 6,
    borderRadius: 20,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
  },
});

export default CalendarHeader;
