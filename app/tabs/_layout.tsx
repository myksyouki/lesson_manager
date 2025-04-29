import { Tabs } from 'expo-router';
import { Platform, Dimensions, useWindowDimensions, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { useSettingsStore } from '../../store/settings';
import { useTheme } from '../../theme';
import { useRef, useEffect, useCallback } from 'react';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

// LINE風のタブバーの高さ設定
const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  // X（旧Twitter）風の固定高さ（45dp）+ 下部の安全領域
  const TAB_BAR_HEIGHT = 45;
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
        toValue: focused ? 1.15 : 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.7,
        duration: 150,
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
        intensity={90}
        tint={theme === 'dark' ? 'dark' : 'light'}
        style={[
          StyleSheet.absoluteFillObject,
          {
            overflow: 'hidden',
            borderTopWidth: 0.5,
            borderTopColor: 'rgba(0,0,0,0.1)',
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
          shadowOpacity: 0.08,
          shadowRadius: 2,
          elevation: 3,
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(0,0,0,0.1)',
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
  const ICON_SIZE = 22; // X（旧Twitter）風のアイコンサイズ
  const { signOut, isDemo } = useAuthStore();
  const theme = useTheme();
  const { theme: themeName } = useSettingsStore();
  const params = useLocalSearchParams();
  
  // reloadパラメータをタブに渡す
  const reloadParam = params.reload === 'true' ? { reload: 'true' } : undefined;

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
        tabBarInactiveTintColor: '#8E8E93', // X風のグレー
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.medium,
          fontSize: 9,
          fontWeight: '500',
          marginTop: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          gap: 1,
          paddingVertical: 4,
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
          } else if (route.name === 'schedule') {
            iconName = 'calendar-today';
          } else if (route.name === 'settings') {
            iconName = 'settings';
          }
          
          // ロックアイコンを削除し、全てのタブが利用可能にする
          return <AnimatedTabBarIcon name={iconName} color={color} size={ICON_SIZE} focused={focused} />;
        },
        tabBarLabel: ({ focused, color, children }) => {
          let label = children;
          if (route.name === 'analysis') label = '分析';
          if (route.name === 'schedule') label = 'スケジュール';
          
          return (
            <View style={{ position: 'relative', alignItems: 'center' }}>
              <Animated.Text
                style={{
                  color: color,
                  fontSize: 9,
                  fontFamily: theme.typography.fontFamily.medium,
                  fontWeight: focused ? '700' : '400',
                  opacity: focused ? 1 : 0.7,
                  letterSpacing: -0.2,
                  marginTop: 1,
                }}
              >
                {label}
              </Animated.Text>
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'ホーム' }} />
      <Tabs.Screen name="lessons" options={{ title: 'レッスン' }} />
      <Tabs.Screen 
        name="task" 
        options={{ title: '練習' }} 
        initialParams={reloadParam}
      />
      <Tabs.Screen 
        name="ai-lesson" 
        options={{ title: 'AI' }} 
        initialParams={reloadParam}
      />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    padding: 10,
  },
  lockIcon: {
    position: 'absolute',
    bottom: -2,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
  },
  signOutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
