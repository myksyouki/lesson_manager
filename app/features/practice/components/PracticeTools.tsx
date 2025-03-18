import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Metronome from './Metronome';
import Tuner from './Tuner';

type ToolType = 'metronome' | 'tuner';

interface PracticeToolsProps {
  isVisible: boolean;
}

const PracticeTools: React.FC<PracticeToolsProps> = ({ isVisible }) => {
  const [activeTool, setActiveTool] = useState<ToolType>('metronome');

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTool === 'metronome' && styles.activeTab,
          ]}
          onPress={() => setActiveTool('metronome')}
        >
          <MaterialIcons
            name="timer"
            size={24}
            color={activeTool === 'metronome' ? '#FF5722' : '#666666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTool === 'metronome' && styles.activeTabText,
            ]}
          >
            メトロノーム
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTool === 'tuner' && styles.activeTab,
          ]}
          onPress={() => setActiveTool('tuner')}
        >
          <MaterialIcons
            name="graphic-eq"
            size={24}
            color={activeTool === 'tuner' ? '#4CAF50' : '#666666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTool === 'tuner' && styles.activeTabText,
            ]}
          >
            チューナー
          </Text>
        </TouchableOpacity>
      </View>

      <Metronome isVisible={activeTool === 'metronome'} />
      <Tuner isVisible={activeTool === 'tuner'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5722',
  },
  activeTabText: {
    color: '#333333',
  },
});

export default PracticeTools; 