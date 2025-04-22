import { Tabs } from 'expo-router';
import { Platform, Dimensions, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { useSettingsStore } from '../../store/settings';
import { useTheme } from '../../theme';
import { useRef, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// LINE風のタブバーの高さ設定
const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  // LINE風の固定高さ（48-50dp）+ 下部の安全領域
  const TAB_BAR_HEIGHT = 50;
  const BOTTOM_INSET = Platform.OS === 'ios' ? insets.bottom : 0;
  
  return { tabHeight: TAB_BAR_HEIGHT, bottomInset: BOTTOM_INSET };
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

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.1 : 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
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
  theme
}: { 
  theme: any;
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint={theme === 'dark' ? 'dark' : 'light'}
        style={[
          StyleSheet.absoluteFillObject,
          {
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
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 4,
          borderTopWidth: 0.5,
          borderTopColor: theme.colors.borderLight,
        },
      ]}
    />
  );
};

// タブインジケーターコンポーネント（LINE風には通常ないので簡素化）
const TabIndicator = ({ 
  focused, 
  color,
  routeName
}: { 
  focused: boolean; 
  color: string;
  routeName: string;
}) => {
  if (!focused) return null;
  
  return null; // LINE風には下部インジケーターが基本的にないので非表示
};

export default function TabLayout() {
  const { tabHeight, bottomInset } = useTabBarHeight();
  const ICON_SIZE = 24; // LINE風のアイコンサイズ
  const { signOut } = useAuthStore();
  const theme = useTheme();
  const { theme: themeName } = useSettingsStore();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: tabHeight + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 0,
          borderTopWidth: 0,
          position: 'relative',
          shadowColor: 'transparent',
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <TabBarBackground theme={theme} />
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#8E8E93', // LINE風のグレー
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.medium,
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          gap: 2,
          paddingVertical: 6,
          height: tabHeight,
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
          } else if (route.name === 'analysis') {
            iconName = 'analytics';
          } else if (route.name === 'settings') {
            iconName = 'settings';
          }
          
          return <AnimatedTabBarIcon name={iconName} color={color} size={ICON_SIZE} focused={focused} />;
        },
        tabBarLabel: ({ focused, color, children }) => {
          let label = children;
          if (route.name === 'analysis') label = '分析';
          return (
            <View style={{ position: 'relative', alignItems: 'center' }}>
              <Animated.Text
                style={{
                  color,
                  fontSize: 10,
                  fontFamily: theme.typography.fontFamily.medium,
                  fontWeight: focused ? '600' : '400',
                  opacity: focused ? 1 : 0.7,
                  letterSpacing: 0,
                }}
              >
                {label}
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
          title: '練習',
        }}
      />
      <Tabs.Screen
        name="ai-lesson"
        options={{
          title: 'AIレッスン',
        }}
      />
      <Tabs.Screen
        name="analysis"
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
