import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, RefreshControl, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import SummaryDisplay from '../SummaryDisplay';
import TagSelector from '../form/TagSelector';
import { useTheme } from '../../../../../theme';
import PiecesList from '../form/PiecesList';
import { CalendarModal } from '../form/CalendarModal';
import { useCalendar } from '../../../../../hooks/useCalendar';

interface LessonFormData {
  id: string;
  teacherName: string;
  date: string;
  pieces: string[];
  notes: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  summary?: string;
  status?: string;
  isFavorite?: boolean;
  transcription?: string;
  isArchived?: boolean;
  archivedDate?: string;
  aiInstructions?: string;
  _parsedDate?: Date;
}

interface LessonDetailContentProps {
  formData: LessonFormData;
  isEditing: boolean;
  onUpdateFormData: (data: Partial<LessonFormData>) => void;
  onSave?: () => void;
  onToggleFavorite?: () => void;
  afterSummary?: React.ReactNode;
}

export const LessonDetailContent: React.FC<LessonDetailContentProps> = ({
  formData,
  isEditing,
  onUpdateFormData,
  onSave = () => {},
  onToggleFavorite = () => {},
  afterSummary
}) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  
  // カレンダーの状態管理にuseCalendarフックを使用
  const {
    selectedDate,
    currentMonth,
    showCalendar: useCalendarShowCalendar,
    setShowCalendar: useCalendarSetShowCalendar,
    handleDateSelect: calendarHandleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  } = useCalendar(
    new Date(), // 単純に現在の日付を初期値として使用
    () => {} // 空のコールバック関数（handleDateSelectで処理するため）
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // データを再読み込みする処理
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // セクションの展開/折りたたみを切り替える関数
  const toggleSection = (sectionName: string) => {
    if (expandedSection === sectionName) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionName);
    }
  };

  // 折りたたみ可能なセクションをレンダリングする関数
  const renderCollapsibleSection = (title: string, sectionName: string, content: React.ReactNode) => {
    const isExpanded = expandedSection === sectionName;
    
    return (
      <View style={styles.collapsibleSection}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => toggleSection(sectionName)}
          activeOpacity={0.7}
        >
          <Text style={styles.collapsibleLabel}>{title}</Text>
          <MaterialIcons 
            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#5F6368" 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.collapsibleContent}>
            {content}
          </View>
        )}
      </View>
    );
  };

  // カレンダーを初期化
  useEffect(() => {
    console.log('LessonDetailContent - レッスンデータをフォームに設定:', formData);
    
    // レッスンデータをフォームに設定（IDが変更された場合のみ実行）
    if (formData && !formData._parsedDate) {
      console.log('LessonDetailContent - 日付解析処理を実行:', formData.date, typeof formData.date);
      let initialDate;
      
      try {
        // 日付文字列がある場合はパースを試みる
        if (formData.date && typeof formData.date === 'string' && formData.date.trim() !== '') {
          // 日本語形式か、ISO形式かをチェック
          if (formData.date.includes('年')) {
            // 日本語形式 (YYYY年MM月DD日)
            initialDate = parseJapaneseDate(formData.date);
            console.log('日本語形式から解析:', initialDate);
          } else {
            // ISO形式 (YYYY-MM-DD)
            initialDate = new Date(formData.date);
            console.log('ISO形式から解析:', initialDate);
          }
        }
        
        // 日付が無効な場合は現在日時を使用
        if (!initialDate || isNaN(initialDate.getTime())) {
          initialDate = new Date();
          console.log('無効な日付のため現在日時に設定:', initialDate);
        }
        
        // 必要な場合のみ更新を行う
        onUpdateFormData({
          _parsedDate: initialDate // 内部管理用に解析済みDate型を保持
        });
      } catch (error) {
        console.error('日付解析エラー:', error);
        initialDate = new Date();
        setDateError('日付形式に問題があります');
        onUpdateFormData({
          _parsedDate: initialDate
        });
      }
    }
  }, [formData.id]); // formData全体ではなくidだけを依存配列に追加

  // 日付選択処理
  const handleDateSelect = (date: Date, formattedDate: string) => {
    console.log('LessonDetailContent - 日付選択:', {
      date: date.toString(),
      formattedDate
    });
    
    onUpdateFormData({
      date: formattedDate,
      _parsedDate: date
    });
    
    setDateError(null);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
    >
      {/* カレンダーモーダル */}
      <CalendarModal
        isVisible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={formData._parsedDate || new Date()}
        onDateSelect={handleDateSelect}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 } // SafeAreaのbottomインセットを考慮
        ]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1C1C1E"
            colors={['#1C1C1E']}
          />
        }
      >
        {/* AIサマリーを最上部に表示 */}
        <View style={styles.summaryContainer}>
          <SummaryDisplay 
            summary={formData.summary || null}
            status={formData.status || null}
            tags={formData.tags || []}
            isEditing={isEditing}
            onUpdateSummary={(summary) => onUpdateFormData({ summary })}
          />
        </View>

        {/* AIサマリーの後に表示する任意のコンポーネント */}
        {afterSummary}

        {/* 基本情報セクション */}
        {renderCollapsibleSection("基本情報", "basicInfo", (
          <View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Text style={styles.infoLabelText}>講師名</Text>
              </View>
              <View style={styles.infoValue}>
                <TextInput
                  style={[styles.input, !isEditing && styles.readOnly]}
                  value={formData.teacherName || ''}
                  onChangeText={(text) => onUpdateFormData({ teacherName: text })}
                  editable={isEditing}
                  placeholder="講師名を入力"
                />
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Text style={styles.infoLabelText}>レッスン日</Text>
              </View>
              <View style={styles.infoValue}>
                {isEditing ? (
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput]}
                    onPress={() => setShowCalendar(true)}
                  >
                    <Text style={[styles.dateText, dateError && styles.errorText]}>
                      {formData.date || "日付を選択"}
                      {dateError && <Text style={styles.errorIndicator}> (!)</Text>}
                    </Text>
                    <MaterialIcons name="calendar-today" size={20} color="#5f6368" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.dateText}>{formData.date || "日付なし"}</Text>
                )}
                {dateError && <Text style={styles.errorMessage}>{dateError}</Text>}
              </View>
            </View>
          </View>
        ))}

        {/* 曲目セクション */}
        {renderCollapsibleSection("レッスン曲", "pieces", (
          <PiecesList
            pieces={formData.pieces}
            onPiecesChange={(pieces) => onUpdateFormData({ pieces })}
          />
        ))}

        {/* メモセクション */}
        {renderCollapsibleSection("マイメモ", "memo", (
          <TextInput
            style={[styles.textArea, !isEditing && styles.readOnly]}
            value={formData.notes}
            onChangeText={(text) => onUpdateFormData({ notes: text })}
            multiline={true}
            numberOfLines={4}
            editable={isEditing}
            placeholder="レッスンに関するメモを入力"
          />
        ))}

        {/* タグセクション */}
        {renderCollapsibleSection("タグ", "tags", (
          <TagSelector
            selectedTags={formData.tags}
            onTagsChange={(tags) => onUpdateFormData({ tags })}
          />
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// 日本語の日付文字列をDateオブジェクトに変換する関数
const parseJapaneseDate = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') {
    console.log('日付なし、または文字列以外のデータが渡されました:', dateString);
    return null;
  }
  
  try {
    // YYYY年MM月DD日の形式を解析
    const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JavaScriptの月は0-11
      const day = parseInt(match[3], 10);
      
      const parsedDate = new Date(year, month, day);
      // 日付が有効かチェック
      if (isNaN(parsedDate.getTime())) {
        console.log('無効な日付が作成されました:', { year, month, day });
        return null;
      }
      return parsedDate;
    }
    
    // ISO形式の日付文字列（YYYY-MM-DD）を解析
    if (dateString.includes('-')) {
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    
    console.log('サポートされていない日付形式です:', dateString);
    return null;
  } catch (error) {
    console.error('日付解析エラー:', error, dateString);
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  summaryContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  collapsibleSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  collapsibleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  collapsibleContent: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    width: 100,
  },
  infoLabelText: {
    fontSize: 14,
    color: '#5F6368',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
  },
  input: {
    height: 40,
    paddingHorizontal: 12,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  readOnly: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e0e0e0',
    color: '#5F6368',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 100,
    padding: 12,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
  },
  errorIndicator: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  errorMessage: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
});

export default LessonDetailContent;
