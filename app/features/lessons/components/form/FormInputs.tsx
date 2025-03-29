import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LessonFormData } from '../../../../services/lessonService';
import { TextField } from '../../../../components/ui/TextField';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody } from '../../../../components/ui/Card';
import { useTheme } from '../../../../theme';
import { formatDate } from '@app/_ignore/utils/_dateUtils';
import PiecesList from './PiecesList';
import TagSelector from './TagSelector';

interface FormInputsProps {
  formData: LessonFormData;
  onUpdateFormData: (data: Partial<LessonFormData>) => void;
  onShowCalendar: () => void;
  isEditMode?: boolean;
  openDatePicker: () => void;
}

// 優先度のラジオボタンコンポーネント
const PriorityRadioButton = ({ value, label, color, currentValue, onSelect }: { 
  value: 'high' | 'medium', 
  label: string, 
  color: string,
  currentValue: string,
  onSelect: (value: 'high' | 'medium') => void
}) => (
  <TouchableOpacity 
    style={[styles.priorityButton, currentValue === value && styles.priorityButtonSelected]} 
    onPress={() => onSelect(value)}
  >
    <View style={[styles.priorityRadio, { borderColor: color }, currentValue === value && { backgroundColor: color }]} />
    <Text style={styles.priorityLabel}>{label}</Text>
  </TouchableOpacity>
);

const FormInputs: React.FC<FormInputsProps> = ({
  formData,
  onUpdateFormData,
  onShowCalendar,
  isEditMode = false,
  openDatePicker,
}) => {
  const [newPiece, setNewPiece] = useState('');
  const [newTag, setNewTag] = useState('');
  const theme = useTheme();

  // formDataのデバッグログ
  React.useEffect(() => {
    console.log('FormInputs formData:', formData);
    console.log('FormInputs date:', formData.date);
    // 日付が存在する場合は変換してみる
    if (formData.date) {
      try {
        // 日本語形式の日付（YYYY年MM月DD日）をパースする処理を追加
        let dateObj;
        if (formData.date.includes('年') && formData.date.includes('月') && formData.date.includes('日')) {
          // 日本語形式の日付をパース
          const matches = formData.date.match(/(\d+)年(\d+)月(\d+)日/);
          if (matches && matches.length === 4) {
            const [_, year, month, day] = matches;
            // JavaScriptのDateは月が0-11なので、1を引く
            dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            dateObj = new Date(); // パースできない場合は今日の日付
          }
        } else {
          // 通常のDate変換を試みる
          dateObj = new Date(formData.date);
        }
        
        console.log('FormInputs 変換後の日付オブジェクト:', dateObj);
        console.log('FormInputs 表示用フォーマット:', formatDate(dateObj));
      } catch (err) {
        console.error('日付変換エラー:', err);
      }
    }
  }, [formData]);

  // 定義済みのタグリスト
  const predefinedTags = useMemo(() => 
    [],
    []
  );

  // 曲目を追加する関数
  const addPiece = useCallback(() => {
    if (newPiece.trim()) {
      onUpdateFormData({
        pieces: [...formData.pieces, newPiece.trim()],
      });
      setNewPiece('');
    }
  }, [newPiece, formData.pieces, onUpdateFormData]);

  // 曲目を削除する関数
  const removePiece = useCallback((index: number) => {
    const updatedPieces = [...formData.pieces];
    updatedPieces.splice(index, 1);
    onUpdateFormData({
      pieces: updatedPieces,
    });
  }, [formData.pieces, onUpdateFormData]);

  // タグを追加する関数
  const addTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      onUpdateFormData({
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  }, [newTag, formData.tags, onUpdateFormData]);

  // タグを削除する関数
  const removeTag = useCallback((index: number) => {
    const updatedTags = [...formData.tags];
    updatedTags.splice(index, 1);
    onUpdateFormData({
      tags: updatedTags,
    });
  }, [formData.tags, onUpdateFormData]);

  // 定義済みタグを選択する関数
  const togglePredefinedTag = useCallback((tag: string) => {
    if (formData.tags.includes(tag)) {
      onUpdateFormData({
        tags: formData.tags.filter(t => t !== tag),
      });
    } else {
      onUpdateFormData({
        tags: [...formData.tags, tag],
      });
    }
  }, [formData.tags, onUpdateFormData]);

  // 優先度を選択する関数
  const handlePriorityChange = useCallback((priority: 'high' | 'medium') => {
    onUpdateFormData({ priority });
  }, [onUpdateFormData]);

  // テキスト変更ハンドラー
  const handleTeacherNameChange = useCallback((text: string) => {
    onUpdateFormData({ teacherName: text });
  }, [onUpdateFormData]);

  const handleNotesChange = useCallback((text: string) => {
    onUpdateFormData({ notes: text });
  }, [onUpdateFormData]);

  // 追加ボタンを無効にするかどうかの計算
  const isAddTagDisabled = useMemo(() => 
    !newTag.trim() || formData.tags.includes(newTag.trim()),
    [newTag, formData.tags]
  );

  return (
    <View style={styles.container}>
      <Card style={styles.formCard}>
        <CardBody>
          <Text style={styles.sectionTitle}>基本情報</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>講師名</Text>
            <TextField
              value={formData.teacherName || ''}
              onChangeText={(text) => onUpdateFormData({ teacherName: text })}
              placeholder="講師名を入力"
              style={styles.textField}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>レッスン日</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={openDatePicker}
            >
              <Text style={formData.date ? styles.datePickerText : styles.datePickerPlaceholder}>
                {formData.date ? (
                  // 日本語形式の日付はそのまま表示し、それ以外はformatDateで変換
                  formData.date.includes('年') && formData.date.includes('月') && formData.date.includes('日') ? 
                    formData.date : 
                    formatDate(formData.date)
                ) : 'レッスン日を選択'}
              </Text>
              <MaterialIcons name="calendar-today" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>曲目</Text>
            <PiecesList
              pieces={formData.pieces}
              onPiecesChange={(pieces) => onUpdateFormData({ pieces })}
            />
          </View>

          {/* AI指示入力フィールド */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>カスタム指示（100文字まで）</Text>
            <Text style={styles.labelDescription}>
              要約の生成方法についてAIに指示できます
            </Text>
            <TextField
              value={formData.userPrompt || ''}
              onChangeText={(text) => onUpdateFormData({ userPrompt: text })}
              placeholder="例: 〇〇について解説しながら要約してください"
              multiline={true}
              numberOfLines={3}
              maxLength={100}
              style={styles.textArea}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>マーカー</Text>
            <View style={styles.priorityButtonsContainer}>
              <PriorityRadioButton 
                value="high" 
                label="重要" 
                color="#EA4335" 
                currentValue={formData.priority || 'medium'}
                onSelect={handlePriorityChange}
              />
              <PriorityRadioButton 
                value="medium" 
                label="基本" 
                color="#4285F4" 
                currentValue={formData.priority || 'medium'}
                onSelect={handlePriorityChange}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>タグ</Text>
            <TagSelector
              selectedTags={formData.tags}
              onTagsChange={(tags) => onUpdateFormData({ tags })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>メモ</Text>
            <TextField
              value={formData.notes}
              onChangeText={(text) => onUpdateFormData({ notes: text })}
              placeholder="レッスンに関するメモを入力"
              multiline={true}
              numberOfLines={4}
              style={styles.textArea}
            />
          </View>
        </CardBody>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  formGroup: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#202124',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#5F6368',
  },
  labelDescription: {
    fontSize: 12,
    marginBottom: 8,
    color: '#9AA0A6',
  },
  textField: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    padding: 12,
    borderRadius: 8,
    minHeight: 120,
    backgroundColor: '#FFFFFF',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DADCE0',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  datePickerText: {
    fontSize: 16,
    color: '#202124',
  },
  datePickerPlaceholder: {
    fontSize: 16,
    color: '#9AA0A6',
  },
  priorityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DADCE0',
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginHorizontal: 4,
  },
  priorityButtonSelected: {
    backgroundColor: '#F8F9FA',
  },
  priorityRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginRight: 8,
  },
  priorityLabel: {
    fontSize: 14,
    color: '#202124',
  },
});

export default FormInputs;
