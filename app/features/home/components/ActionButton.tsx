import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme/index';
import { AnimatedButton } from '../../../../components/AnimatedComponents';

export const ActionButton: React.FC = () => {
  const theme = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  
  // ボタンのアニメーション
  const rotateAnim = new Animated.Value(0);
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  const handleUpload = async () => {
    try {
      // ボタンプレス状態を設定
      setIsPressed(true);
      
      // 回転アニメーション
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.175, 0.885, 0.32, 1.275),
        useNativeDriver: true
      }).start();
      
      // 少し遅延を入れてから遷移
      setTimeout(() => {
        // lesson-form に直接遷移
        router.push('/lesson-form');
        
        // アニメーションをリセット
        setTimeout(() => {
          setIsPressed(false);
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
          }).start();
        }, 500);
      }, 300);
    } catch (err) {
      console.error(err);
      Alert.alert('エラー', '処理中にエラーが発生しました');
      setIsPressed(false);
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedButton
        title="レッスンを記録"
        onPress={handleUpload}
        style={{
          backgroundColor: theme.colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 28,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
        textStyle={{
          color: theme.colors.textInverse,
          fontSize: 16,
          fontWeight: '600',
          marginRight: 8
        }}
        activeScale={0.92}
      >
        <Text style={{
          color: theme.colors.textInverse,
          fontSize: 16,
          fontWeight: '600',
          marginRight: 8
        }}>
          レッスンを記録
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <MaterialIcons 
            name={isPressed ? "close" : "add"} 
            size={24} 
            color={theme.colors.textInverse} 
          />
        </Animated.View>
      </AnimatedButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 100,
  }
});

export default ActionButton;
