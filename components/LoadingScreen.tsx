/**
 * アプリのローディング画面コンポーネント
 * 
 * アニメーション付きのローディング画面を表示します。
 * 音楽関連のビジュアル要素（音符、波形など）とカスタムメッセージをサポートします。
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 定数
const { width, height } = Dimensions.get('window');

const ANIMATION_CONFIG = {
  WAVE_DELAY_MS: 180,
  WAVE_DURATION_MS: 1000,
  NOTE_ANIMATION_DURATION_MS: 6000,
  SPINNER_DURATION_MS: 2000,
  COLOR_CHANGE_INTERVAL_MS: 8000,
  MESSAGE_CHANGE_INTERVAL_MS: 3000,
  NOTE_DELAY_MS: 1000,
};

// 爽やかなカラーパレット
const FRESH_COLORS = [
  ['#4ECDC4', '#51BBF3'], // ターコイズとスカイブルー
  ['#5DB8FE', '#29D0BE'], // ブルーとミントグリーン
  ['#56CCF2', '#2F80ED'], // ライトブルーとブルー
  ['#43E695', '#3BB2B8']  // ライトグリーンとターコイズ
];

// 音楽関連のメッセージ
const LOADING_MESSAGES = [
  "チューニング中..."
];

// 音符アイコン種類
const NOTE_ICONS = [
  "music-note",
  "music-note-eighth",
  "music-note-quarter",
  "music-note-half",
  "music-note-whole",
  "music-accidental-sharp",
  "music-accidental-flat"
];

// 型定義
type LoadingScreenProps = {
  customMessage?: string;
  showMusicElements?: boolean;
};

type FloatingNote = {
  position: Animated.ValueXY;
  rotation: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  icon: string;
};

/**
 * ローディング画面コンポーネント
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  customMessage,
  showMusicElements = true
}) => {
  // 状態
  const [currentColorSet, setCurrentColorSet] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  
  // アニメーション値の初期化
  const waveHeight = useMemo(() => 
    Array(5).fill(0).map(() => new Animated.Value(0)), 
  []);
  
  const floatingNotes = useMemo<FloatingNote[]>(() => 
    Array(6).fill(0).map(() => ({
      position: new Animated.ValueXY({ 
        x: Math.random() * width * 0.8, 
        y: height + Math.random() * 50 
      }),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.6),
      icon: NOTE_ICONS[Math.floor(Math.random() * NOTE_ICONS.length)]
    })), 
  []);
  
  const spinValue = useMemo(() => new Animated.Value(0), []);
  
  // カラーセット切り替えのタイマー
  useEffect(() => {
    const colorInterval = setInterval(() => {
      setCurrentColorSet((prev) => (prev + 1) % FRESH_COLORS.length);
    }, ANIMATION_CONFIG.COLOR_CHANGE_INTERVAL_MS);
    
    return () => clearInterval(colorInterval);
  }, []);
  
  // メッセージ切り替えのタイマー
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, ANIMATION_CONFIG.MESSAGE_CHANGE_INTERVAL_MS);
    
    return () => clearInterval(messageInterval);
  }, []);
  
  // 音波アニメーション
  const startWaveAnimation = useCallback(() => {
    const animations = waveHeight.map((wave, index) => {
      const delay = index * ANIMATION_CONFIG.WAVE_DELAY_MS;
      const duration = ANIMATION_CONFIG.WAVE_DURATION_MS + Math.random() * 600;
      
      return Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration: duration,
          delay: delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false
        }),
        Animated.timing(wave, {
          toValue: 0.3,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false
        })
      ]);
    });
    
    Animated.parallel(animations).start(() => {
      startWaveAnimation();
    });
  }, [waveHeight]);
  
  // 音符アニメーション
  const startNoteAnimation = useCallback((note: FloatingNote) => {
    const duration = ANIMATION_CONFIG.NOTE_ANIMATION_DURATION_MS + Math.random() * 4000;
    const targetY = -100;
    
    // フェードイン
    Animated.timing(note.opacity, {
      toValue: 0.7,
      duration: 800,
      useNativeDriver: true
    }).start();
    
    // 上昇アニメーション
    Animated.timing(note.position.y, {
      toValue: targetY,
      duration,
      easing: Easing.linear,
      useNativeDriver: true
    }).start(() => {
      // 音符が上まで到達したらリセット
      setTimeout(() => {
        note.opacity.setValue(0);
        resetNotePosition(note);
        startNoteAnimation(note);
      }, Math.random() * 1000);
    });
    
    // 回転アニメーション
    Animated.loop(
      Animated.timing(note.rotation, {
        toValue: 1,
        duration: 5000 + Math.random() * 5000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
    
    // サイズの変化アニメーション
    Animated.sequence([
      Animated.timing(note.scale, {
        toValue: 0.8 + Math.random() * 0.4,
        duration: duration / 3,
        useNativeDriver: true
      }),
      Animated.timing(note.scale, {
        toValue: 0.6 + Math.random() * 0.3,
        duration: duration / 3,
        useNativeDriver: true
      }),
      Animated.timing(note.scale, {
        toValue: 0.4 + Math.random() * 0.3,
        duration: duration / 3,
        useNativeDriver: true
      })
    ]).start();
  }, []);
  
  // 音符の位置をリセット
  const resetNotePosition = useCallback((note: FloatingNote) => {
    note.position.setValue({ 
      x: Math.random() * width * 0.8, 
      y: height + Math.random() * 50
    });
    note.opacity.setValue(0);
    note.scale.setValue(0.6);
    note.rotation.setValue(0);
  }, []);
  
  // すべての音符アニメーションを開始
  const animateFloatingNotes = useCallback(() => {
    floatingNotes.forEach((note, index) => {
      // 遅延させて開始
      setTimeout(() => {
        startNoteAnimation(note);
      }, index * ANIMATION_CONFIG.NOTE_DELAY_MS);
    });
  }, [floatingNotes, startNoteAnimation]);
  
  // スピナーアニメーション
  const startSpinnerAnimation = useCallback(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: ANIMATION_CONFIG.SPINNER_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  }, [spinValue]);
  
  // マウント時にすべてのアニメーションを開始
  useEffect(() => {
    if (showMusicElements) {
      startWaveAnimation();
      animateFloatingNotes();
    }
    startSpinnerAnimation();
    
    // アンマウント時のクリーンアップ
    return () => {
      spinValue.stopAnimation();
      if (showMusicElements) {
        waveHeight.forEach(value => value.stopAnimation());
        floatingNotes.forEach(note => {
          note.position.stopAnimation();
          note.rotation.stopAnimation();
          note.opacity.stopAnimation();
          note.scale.stopAnimation();
        });
      }
    };
  }, [
    showMusicElements, 
    startWaveAnimation, 
    animateFloatingNotes, 
    startSpinnerAnimation, 
    spinValue, 
    waveHeight, 
    floatingNotes
  ]);

  // スピナーのローテーション変換
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.loadingContainer}>
      {showMusicElements && (
        <>
          {/* 音符アニメーション */}
          {renderFloatingNotes(floatingNotes, FRESH_COLORS[currentColorSet])}
          
          {/* 音波アニメーション */}
          {renderWaveAnimation(waveHeight, FRESH_COLORS[currentColorSet])}
        </>
      )}
      
      {/* スピナー */}
      <Animated.View
        style={[
          styles.spinner,
          {
            borderColor: FRESH_COLORS[currentColorSet][0],
            transform: [{ rotate: spin }]
          }
        ]}
      />
      
      {/* ローディングメッセージ */}
      <Text style={styles.loadingText}>
        {customMessage || LOADING_MESSAGES[messageIndex]}
      </Text>
    </View>
  );
};

/**
 * 浮かぶ音符を描画
 */
const renderFloatingNotes = (notes: FloatingNote[], colorSet: string[]) => {
  return notes.map((note, index) => (
    <Animated.View
      key={`note-${index}`}
      style={[
        styles.floatingNote,
        {
          transform: [
            { translateX: note.position.x },
            { translateY: note.position.y },
            { rotate: note.rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg']
              })
            },
            { scale: note.scale }
          ],
          opacity: note.opacity
        }
      ]}
    >
      <MaterialCommunityIcons
        name={note.icon as any}
        size={28}
        color={colorSet[index % 2]}
      />
    </Animated.View>
  ));
};

/**
 * 音波アニメーションを描画
 */
const renderWaveAnimation = (waves: Animated.Value[], colorSet: string[]) => {
  return (
    <View style={styles.waveContainer}>
      {waves.map((wave, index) => (
        <Animated.View
          key={`wave-${index}`}
          style={[
            styles.wave,
            {
              height: wave.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 30]
              }),
              backgroundColor: index % 2 === 0 
                ? colorSet[0] 
                : colorSet[1],
              marginHorizontal: 6
            }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 40,
    fontSize: 18,
    color: '#4A6B8A',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    fontWeight: '500',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    height: 40,
  },
  wave: {
    width: 6,
    borderRadius: 3,
  },
  floatingNote: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  }
});

export default LoadingScreen; 