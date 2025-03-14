import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../../theme/index';
import { RippleButton } from '../../../components/AnimatedComponents';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export const HomeHeader: React.FC = () => {
  const theme = useTheme();
  
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

  const renderBackground = () => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={80}
          tint={theme.colors.background === '#FFFFFF' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    
    return (
      <LinearGradient
        colors={[theme.colors.cardGradientStart, theme.colors.cardGradientEnd]}
        style={StyleSheet.absoluteFillObject}
      />
    );
  };

  return (
    <View style={styles.headerContainer}>
      {renderBackground()}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.title, { 
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.bold,
          }]}>
            今日の課題
          </Text>
        </View>
        
        <View style={styles.headerIcons}>
          <RippleButton 
            style={{
              ...styles.iconButton, 
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.borderLight,
              ...theme.elevation.small,
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
              ...theme.elevation.small,
            }} 
            onPress={navigateToSettings}
            rippleColor={theme.colors.ripple}
          >
            <MaterialIcons name="settings" size={22} color={theme.colors.primary} />
          </RippleButton>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 0.5,
  },
});

export default HomeHeader;
