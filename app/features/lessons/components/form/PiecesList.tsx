import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme';

interface PiecesListProps {
  pieces: string[];
  onPiecesChange: (pieces: string[]) => void;
}

export default function PiecesList({ pieces, onPiecesChange }: PiecesListProps) {
  const [newPiece, setNewPiece] = useState('');
  const theme = useTheme();

  const addPiece = () => {
    if (newPiece.trim()) {
      onPiecesChange([...pieces, newPiece.trim()]);
      setNewPiece('');
    }
  };

  const removePiece = (index: number) => {
    const newPieces = [...pieces];
    newPieces.splice(index, 1);
    onPiecesChange(newPieces);
  };

  return (
    <View>
      {/* 曲名リスト */}
      {pieces.length > 0 ? (
        <View style={styles.piecesList}>
          {pieces.map((piece, index) => (
            <View 
              key={index} 
              style={[
                styles.pieceItem,
                { borderBottomColor: theme.colors.borderLight }
              ]}
            >
              <Text style={[styles.pieceText, { color: theme.colors.text }]}>
                {piece}
              </Text>
              <TouchableOpacity
                onPress={() => removePiece(index)}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
            曲名が登録されていません
          </Text>
        </View>
      )}

      {/* 曲名追加フォーム */}
      <View style={styles.addPieceContainer}>
        <View style={[
          styles.addPieceInput,
          { borderColor: theme.colors.borderLight }
        ]}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={newPiece}
            onChangeText={setNewPiece}
            placeholder="曲名を入力"
            placeholderTextColor={theme.colors.textTertiary}
            onSubmitEditing={addPiece}
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              { opacity: newPiece.trim() ? 1 : 0.5 }
            ]}
            onPress={addPiece}
            disabled={!newPiece.trim()}
          >
            <MaterialIcons 
              name="add" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  piecesList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    marginBottom: 8,
  },
  pieceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  pieceText: {
    fontSize: 16,
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  addPieceContainer: {
    marginTop: 8,
  },
  addPieceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  addButton: {
    padding: 8,
  },
}); 