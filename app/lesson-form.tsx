import React, { useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import LoadingOverlay from './components/LoadingOverlay';
import FormHeader from './features/lessons/components/form/FormHeader';
import FormInputs from './features/lessons/components/form/FormInputs';
import CalendarModal from './features/lessons/components/form/CalendarModal';
import AudioUploader from './features/lessons/components/form/AudioUploader';
import { useCalendar, DAYS } from './hooks/useCalendar';
import { useFileUpload } from './hooks/useFileUpload';
import { useLessonForm } from './hooks/useLessonForm';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 600);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

export default function LessonForm() {
  // カスタムフックを使用
  const {
    formData, 
    isProcessing,
    processingStep,
    uploadProgress,
    processingStatus,
    updateFormData, 
    handleSave,
    isFormValid,
  } = useLessonForm();
  
  const {
    selectedFile, 
    selectFile,
    clearFile,
  } = useFileUpload();
  
  const {
    selectedDate,
    currentMonth,
    showCalendar,
    setShowCalendar,
    handleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  } = useCalendar(new Date(), (_, formattedDate) => {
    updateFormData({ date: formattedDate });
  });

  // 保存ハンドラー
  const onSave = useCallback(async () => {
    await handleSave(selectedFile);
  }, [handleSave, selectedFile]);

  // カレンダー表示トグル
  const toggleCalendar = useCallback(() => {
    setShowCalendar(!showCalendar);
  }, [setShowCalendar, showCalendar]);

  // 日付選択ハンドラー（コールバック最適化）
  const onDateSelect = useCallback((date: Date) => {
    handleDateSelect(date);
  }, [handleDateSelect]);

  return (
    <SafeAreaView style={styles.container}>
      <FormHeader
        onSave={onSave}
        isValid={isFormValid()}
        isProcessing={isProcessing}
      />
      
      <ScrollView style={styles.scrollView}>
        <FormInputs
          formData={formData}
          onUpdateFormData={updateFormData}
          onShowCalendar={toggleCalendar}
        />
        
        <AudioUploader
          selectedFile={selectedFile}
          onSelectFile={selectFile}
          onClearFile={clearFile}
        />
      </ScrollView>
      
      {showCalendar && (
        <CalendarModal
          onClose={toggleCalendar}
          onSelectDate={onDateSelect}
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          onChangeMonth={changeMonth}
          generateCalendarDays={generateCalendarDays}
          formatDate={formatDate}
          days={DAYS}
          daySize={DAY_SIZE}
        />
      )}
      
      {isProcessing && (
        <LoadingOverlay 
          message={processingStep}
          progress={uploadProgress}
          showProgress={processingStatus === 'uploading'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    padding: 8,
  },
});
