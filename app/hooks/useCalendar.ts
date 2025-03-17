import { useState } from 'react';

// 曜日と月の定数
export const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

interface UseCalendarReturn {
  selectedDate: Date;
  currentMonth: Date;
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;
  handleDateSelect: (date: Date) => void;
  changeMonth: (increment: number) => void;
  generateCalendarDays: () => CalendarDay[];
  formatDate: (date: Date) => string;
}

export const useCalendar = (
  initialDate: Date = new Date(),
  onDateChange?: (date: Date, formattedDate: string) => void
): UseCalendarReturn => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  // 月を変更する
  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  // カレンダーの日付を生成
  const generateCalendarDays = (): CalendarDay[] => {
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    
    // 前月の日付を追加
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    for (let i = 0; i < startDay; i++) {
      const day = prevMonthLastDay - startDay + i + 1;
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
      days.push({ date, isCurrentMonth: false });
    }
    
    // 当月の日付を追加
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // 翌月の日付を追加（6週間分になるように）
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  // 日付をフォーマット
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${DAYS[date.getDay()]})`;
  };

  // 日付選択ハンドラー
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const formattedDate = formatDate(date);
    
    if (onDateChange) {
      onDateChange(date, formattedDate);
    }
    
    setShowCalendar(false);
  };

  return {
    selectedDate,
    currentMonth,
    showCalendar,
    setShowCalendar,
    handleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  };
}; 