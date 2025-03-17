import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

interface TaskAchievementBadgeProps {
  type: 'streak' | 'completion' | 'level' | 'category';
  count: number;
  label: string;
  color?: string;
}

const TaskAchievementBadge: React.FC<TaskAchievementBadgeProps> = ({
  type,
  count,
  label,
  color
}) => {
  // バッジタイプに基づいてアイコンと色を決定
  const getBadgeIcon = () => {
    switch (type) {
      case 'streak':
        return <Ionicons name="flame" size={24} color="#FF9800" />;
      case 'completion':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'level':
        return <MaterialCommunityIcons name="trophy" size={24} color="#FFC107" />;
      case 'category':
        return <FontAwesome5 name="award" size={24} color={color || '#3F51B5'} />;
      default:
        return <Ionicons name="star" size={24} color="#3F51B5" />;
    }
  };

  // バッジタイプに基づいて背景色を決定
  const getBadgeColor = () => {
    switch (type) {
      case 'streak':
        return '#FFF3E0';
      case 'completion':
        return '#E8F5E9';
      case 'level':
        return '#FFFDE7';
      case 'category':
        return color ? `${color}15` : '#E8EAF6';
      default:
        return '#E8EAF6';
    }
  };

  // バッジタイプに基づいてテキスト色を決定
  const getTextColor = () => {
    switch (type) {
      case 'streak':
        return '#FF9800';
      case 'completion':
        return '#4CAF50';
      case 'level':
        return '#FFC107';
      case 'category':
        return color || '#3F51B5';
      default:
        return '#3F51B5';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBadgeColor() }]}>
      <View style={styles.iconContainer}>
        {getBadgeIcon()}
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.count, { color: getTextColor() }]}>
          {count}
        </Text>
        <Text style={[styles.label, { color: getTextColor() }]}>
          {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 150,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  count: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default TaskAchievementBadge; 