import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  currentMonth: Date;
  onChangeMonth: (increment: number) => void;
  generateCalendarDays: () => Array<{ date: Date; isCurrentMonth: boolean }>;
  formatDate: (date: Date) => string;
  days: string[];
  daySize: number;
}

const CalendarModal: React.FC<CalendarModalProps> = ({
  onClose,
  onSelectDate,
  selectedDate,
  currentMonth,
  onChangeMonth,
  generateCalendarDays,
  formatDate,
  days,
  daySize,
}) => {
  // 選択された日付かどうかを判定
  const isSelectedDate = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  // 今日の日付かどうかを判定
  const isTodayDate = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // カレンダーの日付を生成
  const calendarDays = generateCalendarDays();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>日付を選択</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.currentDateContainer}>
            <Text style={styles.currentDate}>
              {formatDate(selectedDate)}
            </Text>
          </View>
          
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => onChangeMonth(-1)}
            >
              <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
            </TouchableOpacity>
            
            <Text style={styles.monthTitle}>
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Text>
            
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => onChangeMonth(1)}
            >
              <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekdayHeader}>
            {days.map((day, index) => (
              <Text
                key={index}
                style={[
                  styles.weekdayText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>
          
          <View style={styles.calendarGrid}>
            {calendarDays.map((item, index) => {
              const isSelected = isSelectedDate(item.date);
              const isToday = isTodayDate(item.date);
              const dayOfWeek = item.date.getDay();
              const isSunday = dayOfWeek === 0;
              const isSaturday = dayOfWeek === 6;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    { width: daySize, height: daySize },
                    isSelected && styles.selectedDay,
                  ]}
                  onPress={() => onSelectDate(item.date)}
                >
                  <View
                    style={[
                      styles.dayContent,
                      isToday && styles.todayCircle,
                      isSelected && styles.selectedCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !item.isCurrentMonth && styles.otherMonthText,
                        isSunday && styles.sundayText,
                        isSaturday && styles.saturdayText,
                        isSelected && styles.selectedDayText,
                        isToday && !isSelected && styles.todayText,
                      ]}
                    >
                      {item.date.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => {
                const today = new Date();
                onSelectDate(today);
                // 現在の月が表示されていない場合は、今月に移動
                if (today.getMonth() !== currentMonth.getMonth() ||
                    today.getFullYear() !== currentMonth.getFullYear()) {
                  // 今月を設定する処理
                  const newMonth = new Date(today);
                  // 日付は1日に設定して月全体を表示
                  newMonth.setDate(1);
                  // currentMonthを更新する関数を呼び出す
                  // この関数はpropsで渡す必要がある
                }
              }}
            >
              <Text style={styles.todayButtonText}>今日</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                onSelectDate(selectedDate);
                onClose();
              }}
            >
              <Text style={styles.selectButtonText}>選択</Text>
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
  modalContent: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  placeholder: {
    width: 24,
    height: 24,
  },
  currentDateContainer: {
    marginBottom: 12,
  },
  currentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 6,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sundayText: {
    color: colors.sunday,
  },
  saturdayText: {
    color: colors.saturday,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCell: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayContent: {
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
  otherMonthText: {
    opacity: 0.3,
  },
  todayCircle: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedCircle: {
    backgroundColor: colors.primary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  todayText: {
    color: colors.primary,
    fontWeight: '600',
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  todayButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  selectButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});

export default CalendarModal;
