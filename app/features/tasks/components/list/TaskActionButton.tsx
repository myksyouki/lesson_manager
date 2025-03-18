import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface TaskActionButtonProps {
  onAddTask?: () => void;
}

const TaskActionButton: React.FC<TaskActionButtonProps> = ({ onAddTask }) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // 定義済みのカテゴリリスト
  const categories = [
    { id: 'longTone', name: 'ロングトーン', icon: 'music-note' as const, color: '#8E24AA' },
    { id: 'scale', name: 'スケール', icon: 'piano' as const, color: '#D81B60' },
    { id: 'technique', name: 'テクニック', icon: 'build' as const, color: '#F57C00' },
    { id: 'piece', name: '曲練習', icon: 'library-music' as const, color: '#43A047' },
    { id: 'rhythm', name: 'リズム', icon: 'timer' as const, color: '#1E88E5' },
    { id: 'expression', name: '表現', icon: 'brush' as const, color: '#00ACC1' },
    { id: 'pedal', name: 'ペダル', icon: 'settings' as const, color: '#7CB342' },
    { id: 'tone', name: '音色', icon: 'graphic-eq' as const, color: '#5E35B1' },
    { id: 'dynamics', name: '強弱', icon: 'trending-up' as const, color: '#039BE5' },
  ];
  
  // カテゴリを選択してタスク作成画面に遷移
  const handleCategorySelect = (category: string) => {
    setModalVisible(false);
    
    try {
      router.push({
        pathname: '/task-form' as any,
        params: { category, mode: 'practiceMenu' }
      });
    } catch (error) {
      console.error('ナビゲーションエラー:', error);
      // フォールバック: 単純なパスのみを使用
      router.push({
        pathname: '/task-form' as any,
        params: { mode: 'practiceMenu' }
      });
    }
    
    if (onAddTask) {
      onAddTask();
    }
  };
  
  // カスタムタスクを作成
  const handleCustomTask = () => {
    setModalVisible(false);
    
    try {
      router.push({
        pathname: '/task-form' as any,
        params: { mode: 'practiceMenu' }
      });
    } catch (error) {
      console.error('ナビゲーションエラー:', error);
    }
    
    if (onAddTask) {
      onAddTask();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>練習メニューを作成</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#5F6368" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categoryList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => handleCategorySelect(category.name)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <MaterialIcons name={category.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#9AA0A6" />
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={handleCustomTask}
              >
                <View style={[styles.categoryIcon, { backgroundColor: '#9E9E9E' }]}>
                  <MaterialIcons name="add" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.categoryName}>オリジナル練習メニュー</Text>
                <MaterialIcons name="chevron-right" size={24} color="#9AA0A6" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  closeButton: {
    padding: 4,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default TaskActionButton;
