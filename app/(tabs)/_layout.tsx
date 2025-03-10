import { Tabs } from 'expo-router';
import { Platform, Dimensions, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth';

const useTabBarHeight = () => {
  const { height } = useWindowDimensions();
  // Increase tab bar height on mobile for better touch targets
  return Platform.OS === 'ios' ? height * 0.11 : 65;
};

export default function TabLayout() {
  const TAB_BAR_HEIGHT = useTabBarHeight();
  const ICON_SIZE = 30; // Increased icon size for better visibility
  const { signOut } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: Platform.OS === 'ios' ? 0.2 : 0,
          elevation: 0,
          height: TAB_BAR_HEIGHT,
          paddingBottom: Platform.OS === 'ios' ? 35 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#5f6368',
        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
          fontSize: 13, // Slightly larger font size
          fontWeight: '500',
          marginTop: 5,
        },
        tabBarIconStyle: {
          marginBottom: -5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="home" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'レッスン',
          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="music-note" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="task"
        options={{
          title: 'Task',
          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="checklist" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-lesson"
        options={{
          title: 'AIレッスン',
          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="smart-toy" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'スケジュール',
          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="calendar-today" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="settings" size={ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    padding: 10, // Increased padding for better touch target
  },
});
