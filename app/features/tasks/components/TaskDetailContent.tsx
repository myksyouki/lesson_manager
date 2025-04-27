import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Dimensions, Image, Modal, StatusBar, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Task } from '../../../../types/_task';
import { useTaskStore } from '../../../../store/tasks';
import { CalendarModal } from '../../../features/lessons/components/form/CalendarModal';
import { useCalendar, DAYS } from '../../../../hooks/useCalendar';
import { useTheme } from '../../../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 600);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

interface TaskDetailContentProps {
  task: Task;
  loading: boolean;
  chatRoomTitle: string | null;
  onOpenChatRoom: () => void;
  sheetMusicUrl?: string | null;
}

const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  loading,
  chatRoomTitle,
  onOpenChatRoom,
  sheetMusicUrl: externalSheetMusicUrl,
}) => {
  const { updateTask } = useTaskStore();
  const theme = useTheme();
  const [sheetMusicModalVisible, setSheetMusicModalVisible] = useState(false);
  
  // 初期日付の設定
  const initialDate = task.practiceDate 
    ? typeof task.practiceDate === 'string' 
      ? new Date(task.practiceDate) 
      : 'seconds' in (task.practiceDate as any) 
        ? new Date((task.practiceDate as any).seconds * 1000) 
        : task.practiceDate as Date
    : new Date();

  const {
    selectedDate,
    currentMonth,
    showCalendar,
    setShowCalendar,
    handleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  } = useCalendar(initialDate, (date) => {
    // タスクを更新
    updateTask(task.id, {
      practiceDate: date.toISOString()
    });
  });

  // 楽譜URLの取得（外部から提供されたURLを優先）
  const sheetMusicUrl = externalSheetMusicUrl || task.attachments?.find(
    attachment => attachment.type === 'image' && attachment.format === 'image/jpeg'
  )?.url || null;
  
  // 練習情報があるか確認
  const hasPracticeInfo = !!task.practiceInfo;
  const keyInfo = task.practiceInfo?.key || task.practiceInfo?.keyJp;

  // 練習ステップを解析
  const practiceSteps = task.steps || [];

  return (
    <>
      <View style={styles.screenBackground}>
        {/* 練習内容・目標セクション */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="flag" size={20} color="#4285F4" style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitleText}>練習内容・目標</Text>
          </View>
          <Text style={styles.description}>{task.description || '詳細はありません'}</Text>
        </View>
        
        {/* 練習情報セクション */}
        {hasPracticeInfo && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="info" size={20} color="#4285F4" style={styles.sectionTitleIcon} />
              <Text style={styles.sectionTitleText}>練習情報</Text>
            </View>
            <View style={styles.practiceInfoContainer}>
              {keyInfo && (
                <View style={styles.practiceInfoItem}>
                  <MaterialIcons name="music-note" size={16} color={theme.colors.primary} />
                  <Text style={styles.practiceInfoText}>
                    キー: {task.practiceInfo?.keyJp || task.practiceInfo?.key}
                  </Text>
                </View>
              )}
              {task.practiceInfo?.scaleType && (
                <View style={styles.practiceInfoItem}>
                  <MaterialIcons name="piano" size={16} color={theme.colors.primary} />
                  <Text style={styles.practiceInfoText}>
                    スケール: {task.practiceInfo.scaleType === 'major' ? 'メジャー' : 'マイナー'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* 練習ステップセクション */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="list" size={20} color="#4285F4" style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitleText}>練習ステップ</Text>
          </View>
          <View style={styles.stepsContainer}>
            {practiceSteps.length === 0 ? (
              <Text style={styles.noStepText}>ステップが登録されていません</Text>
            ) : (
              practiceSteps.map((step: any, index: number) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumberContainer}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                    {step.duration && (
                      <View style={styles.stepDuration}>
                        <MaterialIcons name="timer" size={14} color="#4285F4" />
                        <Text style={styles.stepDurationText}>{step.duration}分</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
        
        {/* 楽譜画像の表示 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="music-note" size={20} color="#4285F4" style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitleText}>楽譜</Text>
          </View>
          {sheetMusicUrl ? (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => setSheetMusicModalVisible(true)}
              style={styles.sheetMusicContainer}
            >
              <Image
                source={{ uri: sheetMusicUrl }}
                style={styles.sheetMusicImage}
                resizeMode="contain"
              />
              <View style={styles.imageOverlay}>
                <MaterialIcons name="zoom-in" size={24} color="#FFFFFF" />
                <Text style={styles.imageOverlayText}>タップして拡大</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noSheetMusicContainer}>
              <MaterialIcons name="music-off" size={40} color="#B0B0B0" />
              <Text style={styles.noSheetMusicText}>楽譜が登録されていません</Text>
            </View>
          )}
        </View>
        
        {/* 練習予定日セクション */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionHeader, {marginBottom: 0}]}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="event" size={20} color="#4285F4" style={styles.sectionTitleIcon} />
              <Text style={styles.sectionTitleText}>練習予定日</Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setShowCalendar(true)}
            >
              <MaterialIcons name="edit" size={18} color="#4285F4" />
              <Text style={styles.editButtonText}>変更</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>
            {task.practiceDate ? formatDate(
              typeof task.practiceDate === 'string'
                ? new Date(task.practiceDate)
                : 'seconds' in (task.practiceDate as any)
                  ? new Date((task.practiceDate as any).seconds * 1000)
                  : task.practiceDate as Date
            ) : '設定なし'}
          </Text>
        </View>
        
        {/* カテゴリセクション */}
        {task.tags && task.tags.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="category" size={20} color="#4285F4" style={styles.sectionTitleIcon} />
              <Text style={styles.sectionTitleText}>カテゴリ</Text>
            </View>
            <View style={styles.tagsContainer}>
              {task.tags.map((tag, index) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* AIレッスンセクション */}
        {chatRoomTitle && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="chat" size={20} color="#4285F4" style={styles.sectionTitleIcon} />
              <Text style={styles.sectionTitleText}>AIレッスン</Text>
            </View>
            <TouchableOpacity style={styles.chatRoomButton} onPress={onOpenChatRoom}>
              <Text style={styles.chatRoomTitle}>{chatRoomTitle}</Text>
              <Ionicons name="chevron-forward" size={20} color="#4285F4" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* 楽譜モーダル */}
      <Modal
        visible={sheetMusicModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSheetMusicModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar hidden />
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSheetMusicModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            maximumZoomScale={5.0}
            minimumZoomScale={1.0}
            bouncesZoom
          >
            <Image
              source={{ uri: sheetMusicUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      </Modal>
      
      {/* カレンダーモーダル */}
      <CalendarModal
        isVisible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onDateSelect={(date, formattedDate) => handleDateSelect(date)}
        practiceDate={initialDate}
      />
    </>
  );
};

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    paddingVertical: 8,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginVertical: 10,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    lineHeight: 22,
  },
  description: {
    fontSize: 16,
    color: '#5F6368',
    lineHeight: 24,
  },
  infoText: {
    fontSize: 16,
    color: '#5F6368',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4285F4',
    fontSize: 15,
    fontWeight: '600',
  },
  chatRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F3F4',
    padding: 12,
    borderRadius: 8,
  },
  chatRoomTitle: {
    fontSize: 16,
    color: '#202124',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#5F6368',
    fontSize: 14,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  // 練習ステップ関連スタイル
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  stepNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#5F6368',
    lineHeight: 20,
    marginBottom: 8,
  },
  stepDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDurationText: {
    fontSize: 14,
    color: '#4285F4',
    marginLeft: 4,
  },
  // 楽譜関連スタイル
  sheetMusicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  sheetMusicImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 6,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.3,
  },
  // 練習情報のスタイル
  practiceInfoContainer: {
    marginTop: 8,
  },
  practiceInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  practiceInfoText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  noSheetMusicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noSheetMusicText: {
    color: '#B0B0B0',
    fontSize: 16,
    marginTop: 8,
  },
  noStepText: {
    color: '#B0B0B0',
    fontSize: 15,
    marginVertical: 8,
  },
});

export default TaskDetailContent;
