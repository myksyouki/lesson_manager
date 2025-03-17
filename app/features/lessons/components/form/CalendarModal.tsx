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

// マテリアルデザインの色を定義
const colors = {
  primary: '#4285F4',
  primaryLight: '#8AB4F8',
  secondary: '#34A853',
  error: '#EA4335',
  warning: '#FBBC05',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  textPrimary: '#202124',
  textSecondary: '#5F6368',
  textTertiary: '#9AA0A6',
  divider: '#DADCE0',
  sunday: '#EA4335', // 日曜日の色（赤）
  saturday: '#4285F4', // 土曜日の色（青）
};

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

const CalendarModal: React.FC<CalendarModalProps> = ({
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

  // 週ごとに日付を分割する
  const weeks = React.useMemo(() => {
    const result = [];
    for (let i = 0; i < Math.ceil(calendarDays.length / 7); i++) {
      result.push(calendarDays.slice(i * 7, (i + 1) * 7));
    }
    return result;
  }, [calendarDays]);

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
              <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {currentMonth.getFullYear()}年 {MONTHS[currentMonth.getMonth()]}
            </Text>
            <TouchableOpacity 
              onPress={() => onChangeMonth(1)}
              style={styles.navButton}
            >
              <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
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
              {weeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.weekRow}>
                  {week.map((day, dayIndex) => {
                    const isSelected = isSelectedDate(day.date);
                    const isToday = isTodayDate(day.date);
                    const dayOfWeek = day.date.getDay();
                    
                    return (
                      <View key={`day-${weekIndex}-${dayIndex}`} style={styles.dayCell}>
                        <TouchableOpacity
                          style={[
                            styles.dayCellButton,
                            !day.isCurrentMonth && styles.otherMonthDay,
                          ]}
                          onPress={() => onDateSelect(day.date)}
                          disabled={!day.isCurrentMonth}
                        >
                          <View style={[
                            styles.dayCellContent,
                            isToday && styles.todayDay,
                            isSelected && styles.selectedDay,
                          ]}>
                            <Text style={[
                              styles.dayText,
                              dayOfWeek === 0 && styles.sundayText,
                              dayOfWeek === 6 && styles.saturdayText,
                              isToday && styles.todayDayText,
                              isSelected && styles.selectedDayText,
                              !day.isCurrentMonth && styles.otherMonthDayText,
                            ]}>
                              {day.date.getDate()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </Animated.View>
          </GestureDetector>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.okButton}
              onPress={() => {
                onDateSelect(selectedDate);
                onClose();
              }}
            >
              <Text style={styles.okButtonText}>OK</Text>
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
    width: CALENDAR_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 6,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  calendarGrid: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
    height: 45,
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  dayCellContent: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  dayText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: colors.textTertiary,
  },
  todayDay: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  todayDayText: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  sundayText: {
    color: colors.sunday,
  },
  saturdayText: {
    color: colors.saturday,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  okButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  okButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default CalendarModal;
