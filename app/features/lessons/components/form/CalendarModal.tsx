import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  currentMonth: Date;
  onChangeMonth: (increment: number) => void;
  calendarDays: Array<{ date: Date; isCurrentMonth: boolean }>;
  gesture: ReturnType<typeof Gesture.Pan>;
  animatedStyle: any;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  onDateSelect,
  selectedDate,
  currentMonth,
  onChangeMonth,
  calendarDays,
  gesture,
  animatedStyle,
}) => {
  const isSelectedDate = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isTodayDate = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              onPress={() => onChangeMonth(-1)}
              style={styles.navButton}
            >
              <MaterialIcons name="chevron-left" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {currentMonth.getFullYear()}年 {MONTHS[currentMonth.getMonth()]}
            </Text>
            <TouchableOpacity 
              onPress={() => onChangeMonth(1)}
              style={styles.navButton}
            >
              <MaterialIcons name="chevron-right" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDayHeader}>
            {DAYS.map((day, index) => (
              <Text
                key={index}
                style={[
                  styles.weekDayText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.calendarGrid, animatedStyle]}>
              {calendarDays.map((item, index) => {
                const isSelected = isSelectedDate(item.date);
                const isToday = isTodayDate(item.date);
                const isSunday = item.date.getDay() === 0;
                const isSaturday = item.date.getDay() === 6;
                const isOtherMonth = !item.isCurrentMonth;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedDay,
                      isToday && !isSelected && styles.todayDay,
                      isOtherMonth && styles.otherMonthDay,
                    ]}
                    onPress={() => onDateSelect(item.date)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText,
                        isToday && !isSelected && styles.todayDayText,
                        isOtherMonth && styles.otherMonthDayText,
                        isSunday && !isSelected && styles.sundayText,
                        isSaturday && !isSelected && styles.saturdayText,
                      ]}
                    >
                      {item.date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </GestureDetector>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: CALENDAR_WIDTH + 32,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  weekDayHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekDayText: {
    width: DAY_SIZE,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
  },
  dayText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    textAlign: 'center',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: DAY_SIZE / 2,
    width: DAY_SIZE - 8,
    height: DAY_SIZE - 8,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  todayDay: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: DAY_SIZE / 2,
    width: DAY_SIZE - 8,
    height: DAY_SIZE - 8,
  },
  todayDayText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  otherMonthDay: {
    opacity: 0.5,
  },
  otherMonthDayText: {
    color: '#8E8E93',
  },
  sundayText: {
    color: '#FF3B30',
  },
  saturdayText: {
    color: '#007AFF',
  },
  buttonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default CalendarModal;
