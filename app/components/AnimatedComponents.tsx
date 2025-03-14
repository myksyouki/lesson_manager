import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Easing,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  Platform
} from 'react-native';
import { ANIMATION } from '../theme/index';

// フェードインアニメーションコンポーネント
export const FadeIn = ({ 
  children, 
  style, 
  duration = ANIMATION.DURATION.NORMAL,
  delay = 0,
  from = 0,
  to = 1
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  duration?: number;
  delay?: number;
  from?: number;
  to?: number;
}) => {
  const opacity = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: to,
      duration,
      delay,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
};

// スライドインアニメーションコンポーネント
export const SlideIn = ({ 
  children, 
  style, 
  duration = ANIMATION.DURATION.NORMAL,
  delay = 0,
  from = { x: 100, y: 0 },
  to = { x: 0, y: 0 }
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  duration?: number;
  delay?: number;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
}) => {
  const translateX = useRef(new Animated.Value(from.x)).current;
  const translateY = useRef(new Animated.Value(from.y)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: to.x,
        duration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: to.y,
        duration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ translateX }, { translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// スケールアニメーションコンポーネント
export const Scale = ({ 
  children, 
  style, 
  duration = ANIMATION.DURATION.NORMAL,
  delay = 0,
  from = 0.9,
  to = 1
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  duration?: number;
  delay?: number;
  from?: number;
  to?: number;
}) => {
  const scale = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: to,
      duration,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
};

// アニメーション付きカード
export const AnimatedCard = ({ 
  children, 
  style, 
  onPress,
  activeScale = 0.98,
  duration = 150,
  ...props
}: TouchableOpacityProps & {
  children: React.ReactNode;
  style?: ViewStyle;
  activeScale?: number;
  duration?: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: activeScale,
      duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      {...props}
    >
      <Animated.View 
        style={[
          styles.card,
          style, 
          { transform: [{ scale }] }
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// スタガードアニメーション付きリスト
export const StaggeredList = ({ 
  children,
  containerStyle,
  staggerDelay = 50,
  initialDelay = 0,
  duration = ANIMATION.DURATION.NORMAL,
  from = { opacity: 0, translateY: 20 },
  to = { opacity: 1, translateY: 0 }
}: {
  children: React.ReactNode[];
  containerStyle?: ViewStyle;
  staggerDelay?: number;
  initialDelay?: number;
  duration?: number;
  from?: { opacity: number; translateY: number };
  to?: { opacity: number; translateY: number };
}) => {
  return (
    <View style={containerStyle}>
      {React.Children.map(children, (child, index) => {
        const delay = initialDelay + (index * staggerDelay);
        const opacityAnim = useRef(new Animated.Value(from.opacity)).current;
        const translateYAnim = useRef(new Animated.Value(from.translateY)).current;
        
        useEffect(() => {
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: to.opacity,
              duration,
              delay,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: to.translateY,
              duration,
              delay,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            })
          ]).start();
        }, []);
        
        return (
          <Animated.View
            key={index}
            style={{
              opacity: opacityAnim,
              transform: [{ translateY: translateYAnim }]
            }}
          >
            {child}
          </Animated.View>
        );
      })}
    </View>
  );
};

// アニメーション付きボタン
export const AnimatedButton = ({
  title,
  onPress,
  style,
  textStyle,
  activeScale = 0.95,
  disabled = false,
  ...props
}: TouchableOpacityProps & {
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  activeScale?: number;
  disabled?: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: activeScale,
      duration: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          styles.button,
          style,
          { transform: [{ scale }] },
          disabled && styles.buttonDisabled
        ]}
      >
        <Text style={[styles.buttonText, textStyle, disabled && styles.buttonTextDisabled]}>
          {title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ローディングインジケーター
export const AnimatedLoader = ({
  size = 40,
  color = '#4285F4',
  style
}: {
  size?: number;
  color?: string;
  style?: ViewStyle;
}) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        rotation.setValue(0);
        animate();
      });
    };

    animate();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.loaderContainer, style]}>
      <Animated.View
        style={[
          styles.loader,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      />
    </View>
  );
};

// アニメーション付きヘッダー (スクロールに応じて変化)
export const AnimatedHeader = ({
  title,
  scrollY,
  style,
  titleStyle,
  maxHeight = 150,
  minHeight = 60,
  children
}: {
  title: string;
  scrollY: Animated.Value;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  maxHeight?: number;
  minHeight?: number;
  children?: React.ReactNode;
}) => {
  const headerHeight = scrollY.interpolate({
    inputRange: [0, maxHeight - minHeight],
    outputRange: [maxHeight, minHeight],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, (maxHeight - minHeight) * 0.5, maxHeight - minHeight],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const titleScale = scrollY.interpolate({
    inputRange: [0, maxHeight - minHeight],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  const contentOpacity = scrollY.interpolate({
    inputRange: [0, (maxHeight - minHeight) * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.header, { height: headerHeight }, style]}>
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: titleOpacity,
            transform: [{ scale: titleScale }],
          },
        ]}
      >
        <Text style={[styles.headerTitle, titleStyle]}>{title}</Text>
      </Animated.View>
      <Animated.View style={[styles.headerContent, { opacity: contentOpacity }]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
};

// リップルエフェクト付きボタン (Androidスタイル)
export const RippleButton = ({
  onPress,
  style,
  children,
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  ...props
}: TouchableOpacityProps & {
  style?: ViewStyle;
  children: React.ReactNode;
  rippleColor?: string;
}) => {
  if (Platform.OS === 'android') {
    // Androidの場合はネイティブリップルを使用
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.rippleButton, style]}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // iOSの場合はカスタムリップルエフェクト
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const onPressIn = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.rippleButton, style]}
      activeOpacity={0.9}
      {...props}
    >
      <Animated.View
        style={[
          styles.ripple,
          {
            backgroundColor: rippleColor,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  button: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#9E9E9E',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4285F4',
    zIndex: 10,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContent: {
    marginBottom: 16,
  },
  rippleButton: {
    overflow: 'hidden',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
