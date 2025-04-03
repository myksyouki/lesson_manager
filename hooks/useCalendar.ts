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
  formatDate: (date: Date | null | undefined) => string;
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
    const totalDaysNeeded = 42; // 6週間は7日 × 6 = 42日
    const remainingDays = totalDaysNeeded - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // ちょうど42日になっているか確認
    if (days.length !== 42) {
      console.error(`カレンダーの日数が不正です: ${days.length}日 (期待値: 42日)`);
    }
    
    return days;
  };

  // 日付をフォーマット
  const formatDate = (date: Date | null | undefined): string => {
    try {
      // dateがnull、undefined、または日付でない場合のチェック
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.error('formatDate: 無効な日付が渡されました', date);
        return '日付なし';
      }
      
      // フォーマット処理をログ出力（デバッグ用）
      const formattedData = {
        "元の値": date,
        "変換後": date,
        "年": date.getFullYear(),
        "月": `${date.getMonth() + 1}月`,
        "日": date.getDate(),
        "曜日": DAYS[date.getDay()]
      };
      console.log('formatDate - 処理中の日付:', formattedData);
      
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${DAYS[date.getDay()]})`;
    } catch (error) {
      console.error('formatDate - 例外発生:', error, date);
      return '日付エラー';
    }
  };

  // 日付を選択
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    
    try {
      // 表示用の日付文字列
      const displayFormattedDate = formatDate(date);
      
      console.log('日付選択:', { 
        date, 
        displayFormatted: displayFormattedDate 
      });
      
      if (onDateChange) {
        // コールバックには日付オブジェクトと表示用の文字列を渡す
        onDateChange(date, displayFormattedDate);
      }
    } catch (error) {
      console.error('日付選択エラー:', error);
    }
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