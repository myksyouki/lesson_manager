import { Tabs } from 'expo-router';
import { Platform, Dimensions, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { useSettingsStore } from '../../store/settings';
import { useTheme } from '../../theme';
import { useRef, useEffect } from 'react';
import { BlurView } from 'expo-blur';

const useTabBarHeight = () => {
  const { height } = useWindowDimensions();
  // Increase tab bar height on mobile for better touch targets
  return Platform.OS === 'ios' ? height * 0.11 : 70;
};

// タブアイコンのアニメーション付きコンポーネント
const AnimatedTabBarIcon = ({ 
  name, 
  color, 
  size, 
  focused 
}: { 
  name: any; 
  color: string; 
  size: number; 
  focused: boolean 
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.25 : 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: focused ? -4 : 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      })
    ]).start();
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { translateY }],
        opacity,
        alignItems: 'center',
      }}
    >
      <MaterialIcons name={name} size={size} color={color} />
    </Animated.View>
  );
};

// タブバーの背景コンポーネント
const TabBarBackground = ({ 
  theme, 
  height 
}: { 
  theme: any; 
  height: number 
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint={theme === 'dark' ? 'dark' : 'light'}
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.borderLight,
          },
        ]}
      />
    );
  }
  
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 10,
          borderTopWidth: 0.5,
          borderTopColor: theme.colors.borderLight,
        },
      ]}
    />
  );
};

// タブインジケーターコンポーネント
const TabIndicator = ({ 
  focused, 
  color,
  routeName
}: { 
  focused: boolean; 
  color: string;
  routeName: string;
}) => {
  const scaleX = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(scaleX, {
      toValue: focused ? 1 : 0,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [focused]);
  
  // レッスン、AIレッスン、スケジュールタブでは表示しない
  if (!focused || routeName === 'lessons' || routeName === 'ai-lesson' || routeName === 'schedule') return null;
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: '25%',
        right: '25%',
        height: 3,
        backgroundColor: color,
        borderRadius: 3,
        transform: [{ scaleX }],
      }}
    />
  );
};

export default function TabLayout() {
  const TAB_BAR_HEIGHT = useTabBarHeight();
  const ICON_SIZE = 26;
  const { signOut } = useAuthStore();
  const theme = useTheme();
  const { theme: themeName } = useSettingsStore();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT,
          paddingBottom: Platform.OS === 'ios' ? 35 : 15,
          paddingTop: 15,
          borderTopWidth: 0,
          position: 'relative',
          shadowColor: 'transparent',
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <TabBarBackground theme={theme} height={TAB_BAR_HEIGHT} />
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.medium,
          fontSize: 11,
          fontWeight: '500',
          marginTop: 6,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          gap: 6,
          paddingVertical: 6,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          
          if (route.name === 'index') {
            iconName = 'home';
          } else if (route.name === 'lessons') {
            iconName = 'music-note';
          } else if (route.name === 'task') {
            iconName = 'checklist';
          } else if (route.name === 'ai-lesson') {
            iconName = 'smart-toy';
          } else if (route.name === 'schedule') {
            iconName = 'insights';
          } else if (route.name === 'settings') {
            iconName = 'settings';
          }
          
          return <AnimatedTabBarIcon name={iconName} color={color} size={ICON_SIZE} focused={focused} />;
        },
        tabBarLabel: ({ focused, color, children }) => {
          return (
            <View style={{ position: 'relative', alignItems: 'center' }}>
              <Animated.Text
                style={{
                  color,
                  fontSize: 11,
                  fontFamily: theme.typography.fontFamily.medium,
                  fontWeight: focused ? '600' : '400',
                  opacity: focused ? 1 : 0.8,
                  marginTop: 2,
                  letterSpacing: 0.3,
                }}
              >
                {children}
              </Animated.Text>
              <TabIndicator focused={focused} color={color} routeName={route.name} />
            </View>
          );
        },
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'レッスン',
        }}
      />
      <Tabs.Screen
        name="task"
        options={{
          title: 'Task',
        }}
      />
      <Tabs.Screen
        name="ai-lesson"
        options={{
          title: 'AIレッスン',
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '分析',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    padding: 10,
  },
});
