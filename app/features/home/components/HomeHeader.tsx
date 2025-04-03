import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../../../theme/index';
import { RippleButton } from '../../../../components/AnimatedComponents';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../../../store/auth';

export const HomeHeader: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  
  const navigateToProfile = () => {
    router.push('/profile');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) {
      return 'おはようございます';
    } else if (hours < 18) {
      return 'こんにちは';
    } else {
      return 'こんばんは';
    }
  };

  // ユーザー名を取得（ない場合はデフォルト値）
  const getUserName = () => {
    if (user && user.displayName) {
      return user.displayName;
    }
    return '名称未設定';
  };

  const renderBackground = () => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={90}
          tint={theme.colors.background === '#FFFFFF' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFillObject}
        >
          <LinearGradient
            colors={[
              theme.colors.background === '#FFFFFF' 
                ? 'rgba(240, 245, 255, 0.8)' 
                : 'rgba(20, 30, 40, 0.8)', 
              theme.colors.background === '#FFFFFF' 
                ? 'rgba(255, 255, 255, 0.95)' 
                : 'rgba(30, 40, 50, 0.95)'
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </BlurView>
      );
    }
    
    return (
      <LinearGradient
        colors={[
          theme.colors.background === '#FFFFFF' 
            ? 'rgba(240, 245, 255, 0.9)' 
            : 'rgba(20, 30, 40, 0.9)', 
          theme.colors.background === '#FFFFFF' 
            ? 'rgba(255, 255, 255, 0.98)' 
            : 'rgba(30, 40, 50, 0.98)'
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    );
  };

  return (
    <View style={styles.headerContainer}>
      {renderBackground()}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.greeting, { 
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamily.medium,
          }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.userName, { 
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.bold,
          }]}>
            {getUserName()}<Text style={styles.honorific}>さん</Text>
          </Text>
        </View>
        
        <View style={styles.headerIcons}>
          <RippleButton 
            style={{
              ...styles.iconButton, 
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.borderLight,
              ...theme.elevation.medium,
            }} 
            onPress={navigateToProfile}
            rippleColor={theme.colors.ripple}
          >
            <Ionicons name="person" size={22} color={theme.colors.primary} />
          </RippleButton>
          
          <RippleButton 
            style={{
              ...styles.iconButton, 
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.borderLight,
              ...theme.elevation.medium,
            }} 
            onPress={navigateToSettings}
            rippleColor={theme.colors.ripple}
          >
            <MaterialIcons name="settings" size={22} color={theme.colors.primary} />
          </RippleButton>
        </View>
      </View>
      <View style={styles.headerBottomDecoration} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  honorific: {
    fontSize: 20,
    fontWeight: '500',
    opacity: 0.8,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
    borderWidth: 0.5,
  },
  headerBottomDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(120, 140, 255, 0.2)',
  },
});

export default HomeHeader;
