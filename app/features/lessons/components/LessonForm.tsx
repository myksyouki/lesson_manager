import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  useWindowDimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import TagManager from './TagManager';
import SummaryDisplay from './SummaryDisplay';
import Calendar from './Calendar';
import { BlurView } from 'expo-blur';

interface LessonFormData {
  id: string;
  teacher: string;
  date: string;
  piece?: string;
  pieces?: string[];
  summary: string;
  notes: string;
  tags: string[];
  isFavorite: boolean;
  status: string;
  transcription: string;
  newPiece?: string;
}

interface LessonFormProps {
  formData: LessonFormData;
  isEditing: boolean;
  onUpdateFormData: (data: Partial<LessonFormData>) => void;
  onSave: () => void;
  onToggleFavorite: () => void;
}

export const LessonForm: React.FC<LessonFormProps> = ({
  formData,
  isEditing,
  onUpdateFormData,
  onSave,
  onToggleFavorite,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const contentPadding = isTablet ? 40 : 20;
  const inputMaxWidth = isTablet ? 600 : '100%';
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

  const handleAddTag = (tag: string) => {
    onUpdateFormData({ tags: [...formData.tags, tag] });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateFormData({
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 日本語形式の日付文字列をDateオブジェクトに変換する関数
  const parseDateString = (dateString: string): Date => {
    // 'YYYY年MM月DD日' 形式を解析
    if (!dateString) return new Date();
    
    const matches = dateString.match(/(\d+)年(\d+)月(\d+)日/);
    if (matches && matches.length === 4) {
      const [_, year, month, day] = matches;
      // 月は0から始まるので1を引く
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // マッチしない場合はそのまま変換を試みる
    return new Date(dateString);
  };

  const handleDateSelect = (date: Date) => {
    onUpdateFormData({ date: formatDate(date) });
    setShowCalendar(false);
  };

  const toggleSection = (sectionName: string) => {
    if (expandedSection === sectionName) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionName);
    }
  };

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

  return (
    <>
      <ScrollView 
        style={[styles.content, { padding: contentPadding }]} 
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={[styles.formContainer, { maxWidth: inputMaxWidth, alignSelf: isTablet ? 'center' : 'stretch' }]}>
          <View style={styles.aiSummarySection}>
            <SummaryDisplay
              summary={formData.summary}
              status={formData.status}
              tags={formData.tags}
            />
          </View>

          {renderCollapsibleSection("基本情報", "basicInfo", (
            <View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Text style={styles.infoLabelText}>講師名</Text>
                </View>
                <View style={styles.infoValue}>
                  <TextInput
                    style={[styles.input, !isEditing && styles.readOnly]}
                    value={formData.teacher}
                    onChangeText={(text) => onUpdateFormData({ teacher: text })}
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
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput]}
                    onPress={() => isEditing && setShowCalendar(true)}>
                    <Text style={styles.dateText}>{formData.date}</Text>
                    {isEditing && <MaterialIcons name="calendar-today" size={20} color="#5f6368" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Text style={styles.infoLabelText}>レッスン曲</Text>
                </View>
                <View style={styles.infoValue}>
                  {formData.pieces && formData.pieces.length > 0 ? (
                    <View style={styles.piecesList}>
                      {formData.pieces.map((piece, index) => (
                        <View key={index} style={styles.pieceItem}>
                          <Text style={styles.pieceText}>{piece}</Text>
                          {isEditing && (
                            <TouchableOpacity
                              onPress={() => {
                                const newPieces = [...(formData.pieces || [])];
                                newPieces.splice(index, 1);
                                onUpdateFormData({ pieces: newPieces });
                              }}
                              style={styles.removeButton}
                            >
                              <MaterialIcons name="close" size={16} color="#FF3B30" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.input, !isEditing && styles.readOnly]}
                      value={formData.piece || ''}
                      onChangeText={(text) => onUpdateFormData({ piece: text })}
                      editable={isEditing}
                      placeholder="曲名を入力"
                    />
                  )}
                  {isEditing && (
                    <View style={styles.addPieceContainer}>
                      <TextInput
                        style={[styles.input, styles.addPieceInput]}
                        placeholder="曲名を追加"
                        onSubmitEditing={(e) => {
                          if (e.nativeEvent.text.trim()) {
                            const newPieces = [...(formData.pieces || []), e.nativeEvent.text.trim()];
                            onUpdateFormData({ pieces: newPieces });
                            onUpdateFormData({ newPiece: '' });
                          }
                        }}
                        returnKeyType="done"
                        value={formData.newPiece}
                        onChangeText={(text) => onUpdateFormData({ newPiece: text })}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}

          {renderCollapsibleSection("マイメモ", "memo", (
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                !isEditing && styles.readOnly,
                !formData.notes && styles.emptyTextArea
              ]}
              value={formData.notes}
              onChangeText={(text) => onUpdateFormData({ notes: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={isEditing}
              placeholder="メモを入力"
            />
          ))}

          {renderCollapsibleSection("タグ", "tags", (
            <TagManager
              tags={formData.tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              isEditing={isEditing}
            />
          ))}
          
          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>

      {showCalendar && (
        <Calendar
          onClose={() => setShowCalendar(false)}
          onSelectDate={handleDateSelect}
          initialDate={parseDateString(formData.date)}
          isTablet={isTablet}
          isVisible={showCalendar}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  aiSummarySection: {
    marginBottom: 16,
  },
  collapsibleSection: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  collapsibleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  collapsibleContent: {
    padding: 16,
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    marginRight: 12,
  },
  infoLabelText: {
    fontSize: 15,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  infoValue: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  memoSection: {
    marginBottom: 24,
  },
  bottomPadding: {
    height: 40,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#5F6368',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 15,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  readOnly: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  textArea: {
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
  },
  emptyTextArea: {
    height: 80,
  },
  piecesList: {
    marginTop: 4,
  },
  pieceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  pieceText: {
    flex: 1,
    fontSize: 15,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  removeButton: {
    padding: 6,
  },
  addPieceContainer: {
    marginTop: 8,
  },
  addPieceInput: {
    backgroundColor: '#F7F7F7',
  },
});

export default LessonForm;
