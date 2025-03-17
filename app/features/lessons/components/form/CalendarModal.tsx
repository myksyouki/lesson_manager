import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const DAY_SIZE = Math.floor((CALENDAR_WIDTH - 12) / 7); // マージンを考慮して調整

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

  // 一時的な選択状態を管理
  const [tempSelectedDate, setTempSelectedDate] = React.useState<Date>(selectedDate);

  // カレンダーの日付を生成
  const calendarDays = generateCalendarDays();

  // 日付選択時の処理
  const handleDateSelect = (date: Date) => {
    // 既に一時選択されている日付をもう一度タップした場合は確定
    if (date.getDate() === tempSelectedDate.getDate() &&
        date.getMonth() === tempSelectedDate.getMonth() &&
        date.getFullYear() === tempSelectedDate.getFullYear()) {
      onSelectDate(date);
      onClose();
    } else {
      // 一時選択状態に設定
      setTempSelectedDate(date);
    }
  };

  // 一時選択されている日付かどうかを判定
  const isTempSelectedDate = (date: Date) => {
    return date.getDate() === tempSelectedDate.getDate() &&
      date.getMonth() === tempSelectedDate.getMonth() &&
      date.getFullYear() === tempSelectedDate.getFullYear();
  };

  // 週ごとの行をレンダリング
  const renderWeekRow = (weekIndex: number) => (
    <View key={weekIndex} style={styles.weekRow}>
      {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((item, dayIndex) => {
        const isSelected = isSelectedDate(item.date);
        const isTempSelected = isTempSelectedDate(item.date);
        const isToday = isTodayDate(item.date);
        const dayOfWeek = item.date.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        
        return (
          <View key={dayIndex} style={styles.dayCell}>
            <TouchableOpacity
              style={[
                styles.dayButton,
                isTempSelected && styles.tempSelectedDay,
                isSelected && styles.selectedDay,
                isToday && !isSelected && !isTempSelected && styles.todayDay,
              ]}
              onPress={() => handleDateSelect(item.date)}
            >
              <View style={styles.dayCellContent}>
                <Text
                  style={[
                    styles.dayText,
                    !item.isCurrentMonth && styles.otherMonthDayText,
                    isSunday && styles.sundayText,
                    isSaturday && styles.saturdayText,
                    (isSelected || isTempSelected) && styles.selectedDayText,
                    isToday && !isSelected && !isTempSelected && styles.todayDayText,
                  ]}
                >
                  {item.date.getDate()}
                </Text>
                <View style={styles.indicatorContainer} />
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  return (
    <Modal
      transparent={true}
      visible={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>日付を選択</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => onChangeMonth(-1)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-left" size={32} color={colors.primary} />
            </TouchableOpacity>
            
            <Text style={styles.monthTitle}>
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Text>
            
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => onChangeMonth(1)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-right" size={32} color={colors.primary} />
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
            {Array.from({ length: 6 }).map((_, weekIndex) => renderWeekRow(weekIndex))}
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => {
                const today = new Date();
                setTempSelectedDate(today);
              }}
            >
              <Text style={styles.footerButtonText}>今日</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.footerButton, styles.selectButton]}
              onPress={() => {
                onSelectDate(tempSelectedDate);
                onClose();
              }}
            >
              <Text style={styles.footerButtonText}>選択</Text>
            </TouchableOpacity>
          </View>
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
  modalContent: {
    width: CALENDAR_WIDTH,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  closeButton: {
    padding: 4,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  monthSelector: {
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
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  weekdayText: {
    width: DAY_SIZE,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
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
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
    height: 45,
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    padding: 1,
    height: 45,
  },
  dayButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 43,
  },
  dayCellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    height: 20,
    lineHeight: 20,
  },
  otherMonthDayText: {
    color: colors.textTertiary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderRadius: 22, // 丸いハイライト
    borderWidth: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  tempSelectedDay: {
    backgroundColor: colors.primaryLight,
    borderRadius: 22, // 丸いハイライト
    borderWidth: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedDayText: {
    color: colors.background,
    fontWeight: '700',
  },
  todayDay: {
    backgroundColor: 'transparent',
    borderRadius: 22, // 丸いハイライト
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  todayDayText: {
    color: colors.background,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  footerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 0,
    marginTop: 0,
    minHeight: 0,
    opacity: 0,
  },
  selectButton: {
    backgroundColor: colors.primary + '20', // 薄い背景色
    borderRadius: 4,
  },
});

export default CalendarModal;
