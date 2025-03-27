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

const { width, height } = Dimensions.get('window');

// 爽やかなカラーパレット
const freshColors = [
  ['#4ECDC4', '#51BBF3'], // ターコイズとスカイブルー
  ['#5DB8FE', '#29D0BE'], // ブルーとミントグリーン
  ['#56CCF2', '#2F80ED'], // ライトブルーとブルー
  ['#43E695', '#3BB2B8']  // ライトグリーンとターコイズ
];

// 音楽関連のメッセージ
const loadingMessages = [
  "音符を調律中...",
  "メロディーを準備中...",
  "リズムを整えています...",
  "ハーモニーを調整中...",
  "音楽の世界へ移動中..."
];

// 音符アイコン種類
const noteIcons = [
  "music-note",
  "music-note-eighth",
  "music-note-quarter",
  "music-note-half",
  "music-note-whole",
  "music-accidental-sharp",
  "music-accidental-flat"
];

type LoadingScreenProps = {
  customMessage?: string;
  showMusicElements?: boolean;
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  customMessage,
  showMusicElements = true
}) => {
  const [currentColorSet, setCurrentColorSet] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  
  // 音波アニメーションのための値
  const waveHeight = useMemo(() => Array(5).fill(0).map(() => new Animated.Value(0)), []);
  
  // 浮かぶ音符のアニメーション値
  const floatingNotes = useMemo(() => 
    Array(6).fill(0).map(() => ({
      position: new Animated.ValueXY({ 
        x: Math.random() * width * 0.8, 
        y: height + Math.random() * 50 
      }),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.6),
      icon: noteIcons[Math.floor(Math.random() * noteIcons.length)]
    })), 
  []);
  
  // スピナーアニメーション
  const spinValue = useMemo(() => new Animated.Value(0), []);
  
  // 10秒ごとに色を変える
  useEffect(() => {
    const colorInterval = setInterval(() => {
      setCurrentColorSet((prev) => (prev + 1) % freshColors.length);
    }, 8000);
    
    return () => clearInterval(colorInterval);
  }, []);
  
  // 音波アニメーション
  const startWaveAnimation = useCallback(() => {
    const animations = waveHeight.map((wave, index) => {
      // それぞれの波で少しずつタイミングをずらす
      const delay = index * 180;
      const duration = 1000 + Math.random() * 600;
      
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
  
  // 音符の浮上アニメーション
  const animateFloatingNotes = useCallback(() => {
    floatingNotes.forEach((note, index) => {
      const resetNote = () => {
        // 音符を画面下に戻す
        note.position.setValue({ 
          x: Math.random() * width * 0.8, 
          y: height + Math.random() * 50
        });
        note.opacity.setValue(0);
        note.scale.setValue(0.6);
        note.rotation.setValue(0);
        
        // 新しくアニメーションを開始
        startNoteAnimation(note, index);
      };
      
      // 遅延させて開始
      setTimeout(() => {
        startNoteAnimation(note, index);
      }, index * 1000); // 音符ごとに表示タイミングをずらす
    });
  }, [floatingNotes]);
  
  // 個別の音符アニメーション
  const startNoteAnimation = (note: any, index: number) => {
    const duration = 6000 + Math.random() * 4000;
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
        startNoteAnimation(note, index);
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
  };

  // スピナーアニメーション
  const startSpinnerAnimation = useCallback(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  }, [spinValue]);
  
  // メッセージを数秒ごとに切り替える
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 3000);
    
    return () => clearInterval(messageInterval);
  }, []);
  
  // コンポーネントがマウントされたらアニメーション開始
  useEffect(() => {
    startWaveAnimation();
    animateFloatingNotes();
    startSpinnerAnimation();
    
    return () => {
      // アンマウント時にアニメーションをクリーンアップ
      spinValue.stopAnimation();
      waveHeight.forEach(value => {
        value.stopAnimation();
      });
      floatingNotes.forEach(note => {
        note.position.stopAnimation();
        note.rotation.stopAnimation();
        note.opacity.stopAnimation();
        note.scale.stopAnimation();
      });
    };
  }, [startWaveAnimation, animateFloatingNotes, startSpinnerAnimation]);

  // スピナーのローテーション変換
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={[styles.loadingContainer, { backgroundColor: '#FFFFFF' }]}>
      {showMusicElements && (
        <>
          {/* 音符アニメーション */}
          {floatingNotes.map((note, index) => (
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
                color={freshColors[currentColorSet][index % 2]}
              />
            </Animated.View>
          ))}
          
          {/* 音波アニメーション */}
          <View style={styles.waveContainer}>
            {waveHeight.map((wave, index) => (
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
                      ? freshColors[currentColorSet][0] 
                      : freshColors[currentColorSet][1],
                    marginHorizontal: 6
                  }
                ]}
              />
            ))}
          </View>
        </>
      )}
      
      {/* スピナー */}
      <Animated.View
        style={[
          styles.spinner,
          {
            borderColor: freshColors[currentColorSet][0],
            transform: [{ rotate: spin }]
          }
        ]}
      />
      
      {/* ローディングメッセージ */}
      <Text style={styles.loadingText}>
        {customMessage || loadingMessages[messageIndex]}
      </Text>
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