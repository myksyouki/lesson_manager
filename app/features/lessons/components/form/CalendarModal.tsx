import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DAYS, useCalendar } from '../../../../../hooks/useCalendar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const DAY_SIZE = Math.floor((CALENDAR_WIDTH - 24) / 7); // マージンを考慮して調整

// マテリアルデザインの色を定義
const colors = {
  primary: '#4285F4',
  primaryLight: '#D2E3FC',
  secondary: '#34A853',
  error: '#EA4335',
  warning: '#FBBC05',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  textPrimary: '#202124',
  textSecondary: '#5F6368',
  textTertiary: '#9AA0A6',
  divider: '#DADCE0',
  sunday: '#D32F2F', // 日曜日の色（赤）
  saturday: '#1976D2', // 土曜日の色（青）
};

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

interface CalendarModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date, formattedDate: string) => void;
  practiceDate?: Date; // 練習予定日（オプション）
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isVisible,
  onClose,
  selectedDate,
  onDateSelect,
  practiceDate,
}) => {
  // 初期日付が無効な場合は現在の日付を使用
  const validInitialDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
    ? selectedDate 
    : new Date();

  const {
    currentMonth,
    changeMonth,
    generateCalendarDays,
    handleDateSelect,
    formatDate
  } = useCalendar(validInitialDate, (date: Date, formattedDateISO: string) => {
    try {
      // ここでformatDate関数を使って表示用の日付文字列を生成
      const formattedDisplayDate = formatDate(date);
      
      // 親コンポーネントに通知
      onDateSelect(date, formattedDisplayDate);
      onClose();
    } catch (error) {
      console.error('CalendarModal - 日付選択エラー:', error);
    }
  });

  const calendarDays = generateCalendarDays();
  
  // 6週間分（42日）の日付を7日ごとに分ける（6行7列の配列に変換）
  const weeks = [];
  for (let i = 0; i < 6; i++) {
    weeks.push(calendarDays.slice(i * 7, (i + 1) * 7));
  }

  // 現在の日付を取得（今日の日付をハイライトするため）
  const today = new Date();
  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // 練習予定日かどうかをチェックする関数
  const isPracticeDate = (date: Date) => {
    if (!practiceDate) return false;
    
    return date.getDate() === practiceDate.getDate() &&
           date.getMonth() === practiceDate.getMonth() &&
           date.getFullYear() === practiceDate.getFullYear();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* ヘッダー部分 */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>日付を選択</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 月選択部分 */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.monthChangeButton} 
              onPress={() => changeMonth(-1)}
            >
              <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Text>
            <TouchableOpacity 
              style={styles.monthChangeButton} 
              onPress={() => changeMonth(1)}
            >
              <MaterialIcons name="chevron-right" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* 曜日ヘッダー */}
          <View style={styles.daysHeader}>
            {DAYS.map((day: string, index: number) => (
              <Text 
                key={index} 
                style={[
                  styles.dayHeaderText,
                  index === 0 && styles.sundayHeaderText,
                  index === 6 && styles.saturdayHeaderText,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* カレンダーグリッド */}
          <View style={styles.calendarGrid}>
            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekRow}>
                {week.map((dayItem: CalendarDay, dayIndex: number) => {
                  const isSelected = 
                    selectedDate && 
                    dayItem.date.getDate() === selectedDate.getDate() &&
                    dayItem.date.getMonth() === selectedDate.getMonth() &&
                    dayItem.date.getFullYear() === selectedDate.getFullYear();
                    
                  const dayOfWeek = dayItem.date.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isTodayDate = isToday(dayItem.date);
                  const isPractice = isPracticeDate(dayItem.date);

                  return (
                    <TouchableOpacity
                      key={`day-${dayIndex}`}
                      style={[
                        styles.dayItem,
                        !dayItem.isCurrentMonth && styles.outsideMonth,
                        isTodayDate && styles.todayItem,
                        isSelected && styles.selectedDay,
                      ]}
                      onPress={() => handleDateSelect(dayItem.date)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !dayItem.isCurrentMonth && styles.outsideMonthText,
                          isSunday && styles.sundayText,
                          isSaturday && styles.saturdayText,
                          isTodayDate && styles.todayText,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {dayItem.date.getDate()}
                      </Text>
                      {isPractice && <View style={styles.practiceDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    textAlign: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthChangeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dayHeaderText: {
    width: DAY_SIZE,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sundayHeaderText: {
    color: colors.sunday,
  },
  saturdayHeaderText: {
    color: colors.saturday,
  },
  calendarGrid: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 46,
    width: '100%',
    marginBottom: 4,
  },
  dayItem: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: DAY_SIZE / 2,
    position: 'relative',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  outsideMonth: {
    opacity: 0.4,
  },
  outsideMonthText: {
    color: colors.textTertiary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sundayText: {
    color: colors.sunday,
  },
  saturdayText: {
    color: colors.saturday,
  },
  todayItem: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  todayText: {
    fontWeight: '700',
    color: colors.primary,
  },
  practiceDot: {
    position: 'absolute',
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
});

// 既存の名前付きエクスポートはそのままに、デフォルトエクスポートも追加
export default CalendarModal;
