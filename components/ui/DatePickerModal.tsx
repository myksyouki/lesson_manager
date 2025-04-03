import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../theme/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const DAY_SIZE = Math.floor((CALENDAR_WIDTH - 12) / 7);

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface DatePickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  initialDate?: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isVisible,
  onClose,
  onSelectDate,
  initialDate = new Date(),
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const days = [];
    
    // 前月の日を追加
    const firstDayOfWeek = firstDayOfMonth.getDay();
    if (firstDayOfWeek > 0) {
      const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
      const prevMonthDays = prevMonthLastDay.getDate();
      
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthDays - i);
        days.push({ date: day, isCurrentMonth: false });
      }
    }
    
    // 現在の月の日を追加
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const day = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      days.push({ date: day, isCurrentMonth: true });
    }
    
    // 翌月の日を追加（6週間分になるように）
    const totalDaysNeeded = 42; // 6週間
    const remainingDays = totalDaysNeeded - days.length;
    
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    return days;
  };

  const isSelectedDate = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const renderDays = () => {
    const days = generateCalendarDays();
    return days.map((day, index) => {
      const isSelected = isSelectedDate(day.date);
      const today = isToday(day.date);
      
      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.dayButton,
            { width: DAY_SIZE, height: DAY_SIZE },
            !day.isCurrentMonth && styles.otherMonthDay,
            isSelected && styles.selectedDay,
            today && !isSelected && styles.todayButton
          ]}
          onPress={() => {
            setSelectedDate(day.date);
          }}
        >
          <Text
            style={[
              styles.dayText,
              !day.isCurrentMonth && styles.otherMonthDayText,
              isSelected && styles.selectedDayText,
              today && !isSelected && styles.todayText,
              day.date.getDay() === 0 && styles.sundayText,
              day.date.getDay() === 6 && styles.saturdayText
            ]}
          >
            {day.date.getDate()}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.calendarModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>日付を選択</Text>
            <TouchableOpacity onPress={() => {
              console.log('DatePickerModal: 日付選択完了 -', selectedDate);
              onSelectDate(selectedDate);
              onClose();
            }}>
              <Text style={styles.modalDoneText}>完了</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity 
              onPress={() => changeMonth(-1)} 
              style={styles.monthButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-left" size={32} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {currentMonth.getFullYear()}年{MONTHS[currentMonth.getMonth()]}
            </Text>
            <TouchableOpacity 
              onPress={() => changeMonth(1)} 
              style={styles.monthButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="chevron-right" size={32} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDayHeader}>
            {DAYS.map((day, index) => (
              <Text 
                key={index} 
                style={[
                  styles.weekDayText, 
                  { width: DAY_SIZE },
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {renderDays()}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              }}
            >
              <Text style={styles.todayButtonText}>今日</Text>
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
  calendarModal: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  monthButton: {
    padding: 5,
  },
  weekDayHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sundayText: {
    color: Colors.error,
  },
  saturdayText: {
    color: Colors.primary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
  },
  dayText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  otherMonthDay: {
    opacity: 0.5,
  },
  otherMonthDayText: {
    color: Colors.textLight,
  },
  selectedDay: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  selectedDayText: {
    color: Colors.white,
    fontWeight: '600',
  },
  todayButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  todayButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    padding: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  }
});

export default DatePickerModal; 