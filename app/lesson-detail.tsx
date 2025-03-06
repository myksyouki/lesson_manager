import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useLessonStore } from './store/lessons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function LessonDetail() {
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const contentPadding = isTablet ? 40 : 20;
  const inputMaxWidth = isTablet ? 600 : '100%';
  const calendarWidth = Math.min(windowWidth - 40, 600);
  const daySize = Math.floor(calendarWidth / 7);

  const params = useLocalSearchParams();
  const { updateLesson, lessons, toggleFavorite } = useLessonStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newTag, setNewTag] = useState('');
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  
  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Transcription state
  const [showTranscription, setShowTranscription] = useState(false);

  // Find the current lesson
  const currentLesson = lessons.find(lesson => lesson.id === params.id);

  const [formData, setFormData] = useState({
    id: params.id as string,
    teacher: currentLesson?.teacher || '',
    date: currentLesson?.date || '',
    piece: currentLesson?.piece || '',
    summary: currentLesson?.summary || '',
    notes: currentLesson?.notes || '',
    tags: currentLesson?.tags || [],
    audioUrl: currentLesson?.audio_url || null,
    transcription: currentLesson?.transcription || '',
    isFavorite: currentLesson?.isFavorite || false,
  });

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Define changeMonth function before using it in the gesture handler
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

  const handleSave = () => {
    updateLesson({
      id: formData.id,
      teacher: formData.teacher,
      date: formData.date,
      piece: formData.piece,
      summary: formData.summary,
      notes: formData.notes,
      tags: formData.tags,
      user_id: 'dummy-user-id', // This would be the actual user ID in production
      isFavorite: formData.isFavorite,
    });
    setIsEditing(false);
    router.back();
  };

  const handleTagPress = (tag: string) => {
    if (!isEditing) return;
    
    const newTags = formData.tags.includes(tag)
      ? formData.tags.filter((t) => t !== tag)
      : [...formData.tags, tag];
    setFormData({ ...formData, tags: newTags });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleToggleFavorite = () => {
    toggleFavorite(formData.id);
    setFormData({ ...formData, isFavorite: !formData.isFavorite });
  };

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

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setFormData({ ...formData, date: formatDate(date) });
    setShowCalendar(false);
  };
  
  const handlePlayAudio = async () => {
    if (!formData.audioUrl) return;
    
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        setIsLoadingAudio(true);
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: formData.audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        
        setSound(newSound);
        setIsPlaying(true);
        setIsLoadingAudio(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoadingAudio(false);
    }
  };
  
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setPlaybackDuration(status.durationMillis || 0);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };
  
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const seekAudio = async (position) => {
    if (sound) {
      await sound.setPositionAsync(position);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>レッスン詳細</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleToggleFavorite}
            >
              <MaterialIcons 
                name={formData.isFavorite ? "favorite" : "favorite-border"} 
                size={26} 
                color={formData.isFavorite ? "#FF3B30" : "#007AFF"} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>{isEditing ? '保存' : '編集'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={[styles.content, { padding: contentPadding }]} 
          contentContainerStyle={{ alignItems: isTablet ? 'center' : 'stretch' }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <View style={[styles.formContainer, { maxWidth: inputMaxWidth }]}>
            <View style={styles.section}>
              <Text style={styles.label}>講師名</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.readOnly]}
                value={formData.teacher}
                onChangeText={(text) => setFormData({ ...formData, teacher: text })}
                editable={isEditing}
                placeholder="講師名を入力"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>レッスン日</Text>
              <TouchableOpacity
                style={[styles.input, styles.dateInput]}
                onPress={() => isEditing && setShowCalendar(true)}>
                <Text style={styles.dateText}>{formData.date}</Text>
                {isEditing && <MaterialIcons name="calendar-today" size={22} color="#5f6368" />}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>レッスン曲</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.readOnly]}
                value={formData.piece}
                onChangeText={(text) => setFormData({ ...formData, piece: text })}
                editable={isEditing}
                placeholder="曲名を入力"
              />
            </View>
            
            {formData.audioUrl && (
              <View style={styles.section}>
                <Text style={styles.label}>レッスン録音</Text>
                <View style={styles.audioPlayerContainer}>
                  {isLoadingAudio ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <TouchableOpacity 
                      style={styles.playButton}
                      onPress={handlePlayAudio}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={24} 
                        color="white" 
                      />
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.audioProgressContainer}>
                    <View style={styles.audioTimeContainer}>
                      <Text style={styles.audioTimeText}>
                        {formatTime(playbackPosition)}
                      </Text>
                      <Text style={styles.audioTimeText}>
                        {formatTime(playbackDuration)}
                      </Text>
                    </View>
                    
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${playbackDuration > 0 
                              ? (playbackPosition / playbackDuration) * 100 
                              : 0}%` 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
                
                {formData.transcription && (
                  <TouchableOpacity 
                    style={styles.transcriptionButton}
                    onPress={() => setShowTranscription(!showTranscription)}
                  >
                    <Text style={styles.transcriptionButtonText}>
                      {showTranscription ? '文字起こしを隠す' : '文字起こしを表示'}
                    </Text>
                    <MaterialIcons 
                      name={showTranscription ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                      size={24} 
                      color="#007AFF" 
                    />
                  </TouchableOpacity>
                )}
                
                {showTranscription && formData.transcription && (
                  <View style={styles.transcriptionContainer}>
                    <Text style={styles.transcriptionText}>
                      {formData.transcription}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>タグ</Text>
              {isEditing && (
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={styles.tagInput}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="新しいタグを入力"
                    onSubmitEditing={handleAddTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity 
                    style={[styles.addTagButton, !newTag.trim() && styles.addTagButtonDisabled]} 
                    onPress={handleAddTag}
                    disabled={!newTag.trim()}
                  >
                    <Text style={styles.addTagButtonText}>追加</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.tagContainer}>
                {formData.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, styles.tagSelected]}>
                    <Text style={styles.tagTextSelected}>{tag}</Text>
                    {isEditing && (
                      <TouchableOpacity
                        style={styles.removeTagButton}
                        onPress={() => handleRemoveTag(tag)}
                      >
                        <MaterialIcons name="close" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>AIサマリー</Text>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{formData.summary}</Text>
              </View>
            </View>

            <View style={[styles.section, styles.memoSection]}>
              <Text style={styles.label}>マイメモ</Text>
              <TextInput
                style={[styles.input, styles.textArea, !isEditing && styles.readOnly]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={isEditing}
                placeholder="メモを入力"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
            </View>
          </View>
        </ScrollView>

        <Modal visible={showCalendar} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={[styles.calendarModal, isTablet && styles.tabletModal]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Text style={styles.modalCloseText}>キャンセル</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>日付を選択</Text>
                <TouchableOpacity onPress={() => handleDateSelect(selectedDate)}>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 10, // Increased padding for better touch target
  },
  title: {
    fontSize: 22, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 10,
    marginRight: 5,
  },
  editButton: {
    padding: 10, // Increased padding for better touch target
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 18, // Larger font size
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  section: {
    marginBottom: 24,
  },
  memoSection: {
    marginBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  label: {
    fontSize: 17, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 14, // Increased border radius
    padding: 16,
    fontSize: 17, // Larger font size
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 17, // Larger font size
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  readOnly: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 140, // Increased height
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14, // Increased border radius
    padding: 14, // Increased padding
    fontSize: 17, // Larger font size
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  addTagButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14, // Increased border radius
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addTagButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  addTagButtonText: {
    color: 'white',
    fontSize: 16, // Larger font size
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 18, // Increased border radius
    paddingVertical: 10, // Increased padding
    paddingHorizontal: 14, // Increased padding
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagSelected: {
    backgroundColor: '#1a73e8',
  },
  tagText: {
    fontSize: 16, // Larger font size
    color: '#5f6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagTextSelected: {
    color: 'white',
    marginRight: 4,
    fontSize: 16, // Larger font size
  },
  removeTagButton: {
    marginLeft: 4,
    padding: 4, // Added padding for better touch target
  },
  summaryBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14, // Increased border radius
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryText: {
    fontSize: 17, // Larger font size
    color: '#1C1C1E',
    lineHeight: 26, // Increased line height
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24, // Increased border radius
    borderTopRightRadius: 24, // Increased border radius
    padding: 20,
    width: '100%',
  },
  tabletModal: {
    maxWidth: 600,
    alignSelf: 'center',
    margin: 40,
    borderRadius: 24, // Increased border radius
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseText: {
    color: '#007AFF',
    fontSize: 18, // Larger font size
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalDoneText: {
    color: '#007AFF',
    fontSize: 18, // Larger font size
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalTitle: {
    fontSize: 20, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  monthButton: {
    width: 44, // Increased size
    height: 44, // Increased size
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22, // Make it circular
  },
  monthText: {
    fontSize: 22, // Larger font size
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  calendar: {
    marginBottom: 20,
  },
  weekDayHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    textAlign: 'center',
    fontSize: 16, // Larger font size
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
    fontSize: 18, // Larger font size
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: '#8E8E93',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: 22, // Increased border radius
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 12,
  },
  audioProgressContainer: {
    flex: 1,
    marginLeft: 12,
  },
  audioTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  audioTimeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  transcriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 10,
  },
  transcriptionButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  transcriptionContainer: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 12,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  playButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});