import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface FormInputsProps {
  formData: {
    teacherName: string;
    date: string;
    pieces: string[];
    notes: string;
    tags: string[];
  };
  onUpdateFormData: (data: Partial<{
    teacherName: string;
    date: string;
    pieces: string[];
    notes: string;
    tags: string[];
  }>) => void;
  onShowCalendar: () => void;
}

export const FormInputs: React.FC<FormInputsProps> = ({
  formData,
  onUpdateFormData,
  onShowCalendar,
}) => {
  const [newPiece, setNewPiece] = useState('');

  const addPiece = () => {
    if (newPiece.trim() === '') return;
    
    const updatedPieces = [...(formData.pieces || []), newPiece.trim()];
    onUpdateFormData({ pieces: updatedPieces });
    setNewPiece('');
  };

  const removePiece = (index: number) => {
    const updatedPieces = [...(formData.pieces || [])];
    updatedPieces.splice(index, 1);
    onUpdateFormData({ pieces: updatedPieces });
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>講師名<Text style={styles.requiredMark}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={formData.teacherName}
          onChangeText={(text) => onUpdateFormData({ teacherName: text })}
          placeholder="講師名を入力"
          placeholderTextColor="#8E8E93"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>日付</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={onShowCalendar}
        >
          <Text style={styles.dateText}>{formData.date}</Text>
          <MaterialIcons name="calendar-today" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>レッスン曲</Text>
        <View style={styles.pieceInputContainer}>
          <TextInput
            style={styles.pieceInput}
            value={newPiece}
            onChangeText={setNewPiece}
            placeholder="レッスン曲を入力"
            placeholderTextColor="#8E8E93"
            returnKeyType="done"
            onSubmitEditing={addPiece}
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={addPiece}
            disabled={newPiece.trim() === ''}
          >
            <Ionicons 
              name="add-circle" 
              size={24} 
              color={newPiece.trim() === '' ? "#C7C7CC" : "#007AFF"} 
            />
          </TouchableOpacity>
        </View>
        
        {formData.pieces && formData.pieces.length > 0 ? (
          <View style={styles.piecesList}>
            {formData.pieces.map((piece, index) => (
              <View key={index} style={styles.pieceItem}>
                <Text style={styles.pieceText}>{piece}</Text>
                <TouchableOpacity 
                  onPress={() => removePiece(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>メモ</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => onUpdateFormData({ notes: text })}
          placeholder="レッスン内容のメモを入力"
          placeholderTextColor="#8E8E93"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  requiredMark: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    minHeight: 100,
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  pieceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieceInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  addButton: {
    marginLeft: 8,
    padding: 4,
  },
  piecesList: {
    marginTop: 12,
  },
  pieceItem: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  pieceText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  removeButton: {
    padding: 4,
  },
});

export default FormInputs;
