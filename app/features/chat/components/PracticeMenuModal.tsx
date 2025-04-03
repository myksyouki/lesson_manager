import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PracticeMenu } from '../../../../services/difyService';

interface PracticeMenuModalProps {
  visible: boolean;
  onClose: () => void;
  practiceMenus: PracticeMenu[];
  onSave: () => void;
  onEdit: () => void;
  exporting: boolean;
}

const PracticeMenuModal: React.FC<PracticeMenuModalProps> = ({
  visible,
  onClose,
  practiceMenus,
  onSave,
  onEdit,
  exporting,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>練習メニュー</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.menuContainer}>
            {practiceMenus.map((menu, index) => (
              <View key={index} style={styles.menuItem}>
                <Text style={styles.menuTitle}>{menu.title}</Text>
                
                {menu.goals.length > 0 && (
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>目標</Text>
                    {menu.goals.map((goal, i) => (
                      <Text key={i} style={styles.menuListItem}>• {goal}</Text>
                    ))}
                  </View>
                )}
                
                {menu.practiceItems.length > 0 && (
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>練習内容</Text>
                    {menu.practiceItems.map((item, i) => (
                      <Text key={i} style={styles.menuListItem}>{i + 1}. {item}</Text>
                    ))}
                  </View>
                )}
                
                {menu.notes.length > 0 && (
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>注意点</Text>
                    {menu.notes.map((note, i) => (
                      <Text key={i} style={styles.menuListItem}>• {note}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={onEdit}
              disabled={exporting}
            >
              <Text style={styles.buttonText}>編集</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={onSave}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>タスクとして保存</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 5,
  },
  menuContainer: {
    maxHeight: 400,
  },
  menuItem: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  menuSection: {
    marginBottom: 12,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  menuListItem: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});

export default PracticeMenuModal;
