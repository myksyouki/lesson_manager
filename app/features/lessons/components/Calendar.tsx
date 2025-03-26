import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface CalendarProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  initialDate?: Date;
  isTablet: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({
  isVisible,
  onClose,
  onSelectDate,
  initialDate = new Date(),
  isTablet,
}) => {
  const safeInitialDate = () => {
    if (!initialDate || isNaN(initialDate.getTime())) {
      console.log('Invalid initialDate provided to Calendar, using current date instead');
      return new Date();
    }
    return initialDate;
  };
  
  const [selectedDate, setSelectedDate] = useState<Date>(safeInitialDate());
  const [currentMonth, setCurrentMonth] = useState<Date>(safeInitialDate());
  
  const calendarWidth = Math.min(isTablet ? 600 : 350, 600);
  const daySize = Math.floor(calendarWidth / 7);
  
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
    })
    .onEnd((event) => {
      const threshold = calendarWidth / 3;
      if (Math.abs(event.velocityX) > 500 || Math.abs(event.translationX) > threshold) {
        if (event.velocityX > 0 || event.translationX > threshold) {
          translateX.value = withTiming(calendarWidth, {}, () => {
            runOnJS(changeMonth)(-1);
            translateX.value = 0;
          });
        } else {
          translateX.value = withTiming(-calendarWidth, {}, () => {
            runOnJS(changeMonth)(1);
            translateX.value = 0;
          });
        }
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      const prevMonthLastDay = new Date(year, month, 0);
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay.getDate() - i),
        isCurrentMonth: false,
      });
    }
    days.reverse();

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onSelectDate(date);
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={[styles.calendarModal, isTablet && styles.tabletModal]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>日付を選択</Text>
            <TouchableOpacity onPress={() => onSelectDate(selectedDate)}>
              <Text style={styles.modalDoneText}>完了</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity 
              onPress={() => changeMonth(-1)} 
              style={styles.monthButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-left" size={32} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {currentMonth.getFullYear()}年{MONTHS[currentMonth.getMonth()]}
            </Text>
            <TouchableOpacity 
              onPress={() => changeMonth(1)} 
              style={styles.monthButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-right" size={32} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.calendar, animatedStyle]}>
              <View style={styles.weekDayHeader}>
                {DAYS.map((day, index) => (
                  <Text
                    key={day}
                    style={[
                      styles.weekDayText,
                      { width: daySize },
                      index === 0 && styles.sundayText,
                      index === 6 && styles.saturdayText,
                    ]}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {generateCalendarDays().map((item, index) => {
                  const isSelected =
                    selectedDate &&
                    item.date.getDate() === selectedDate.getDate() &&
                    item.date.getMonth() === selectedDate.getMonth() &&
                    item.date.getFullYear() === selectedDate.getFullYear();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        { width: daySize, height: daySize },
                        !item.isCurrentMonth && styles.otherMonthDay,
                        isSelected && styles.selectedDay,
                      ]}
                      onPress={() => handleDateSelect(item.date)}>
                      <Text
                        style={[
                          styles.dayText,
                          !item.isCurrentMonth && styles.otherMonthDayText,
                          isSelected && styles.selectedDayText,
                        ]}>
                        {item.date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarModal: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabletModal: {
    maxWidth: 600,
    width: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  monthButton: {
    padding: 5,
  },
  calendar: {
    width: '100%',
  },
  weekDayHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  sundayText: {
    color: '#FF3B30',
  },
  saturdayText: {
    color: '#007AFF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  otherMonthDay: {
    opacity: 0.5,
  },
  otherMonthDayText: {
    color: '#8E8E93',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: 50,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default Calendar;
