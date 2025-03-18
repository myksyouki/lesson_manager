import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

// メトロノームのテーマカラー
const METRONOME_COLOR = '#FF5722';

interface MetronomeProps {
  isVisible: boolean;
}

const Metronome: React.FC<MetronomeProps> = ({ isVisible }) => {
  // 状態の定義
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const accentSoundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // アニメーション用の値
  const pendulumRotation = useSharedValue(0);
  
  // 音声ファイルの読み込み
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // 単純なビープ音を生成
        const { sound: clickSound } = await Audio.Sound.createAsync({
          uri: 'https://freesound.org/data/previews/212/212048_3755415-lq.mp3' // クリック音のオンラインサンプル
        });
        const { sound: accentSound } = await Audio.Sound.createAsync({
          uri: 'https://freesound.org/data/previews/212/212106_3755415-lq.mp3' // アクセント音のオンラインサンプル
        });
        
        soundRef.current = clickSound;
        accentSoundRef.current = accentSound;
      } catch (error) {
        console.error('メトロノーム音の読み込みに失敗しました:', error);
      }
    };
    
    loadSounds();
    
    // クリーンアップ関数
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (accentSoundRef.current) {
        accentSoundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // メトロノームの開始/停止
  useEffect(() => {
    if (isPlaying) {
      startMetronome();
      
      // 振り子のアニメーションを開始
      pendulumRotation.value = 0;
      pendulumRotation.value = withRepeat(
        withTiming(1, {
          duration: 60000 / bpm,
          easing: Easing.linear,
        }),
        -1,
        true
      );
    } else {
      stopMetronome();
      
      // アニメーションを停止
      cancelAnimation(pendulumRotation);
    }
    
    return () => {
      stopMetronome();
    };
  }, [isPlaying, bpm, beatsPerMeasure]);
  
  // メトロノームの開始
  const startMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const interval = 60000 / bpm;
    setCurrentBeat(0);
    
    intervalRef.current = setInterval(() => {
      setCurrentBeat((prevBeat) => {
        const nextBeat = (prevBeat + 1) % beatsPerMeasure;
        
        // 音を再生（1拍目はアクセント音）
        if (nextBeat === 0) {
          accentSoundRef.current?.replayAsync();
        } else {
          soundRef.current?.replayAsync();
        }
        
        return nextBeat;
      });
    }, interval);
  };
  
  // メトロノームの停止
  const stopMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // 拍子を変更する
  const changeBeatsPerMeasure = (newValue: number) => {
    setBeatsPerMeasure(newValue);
    setCurrentBeat(0);
    
    if (isPlaying) {
      stopMetronome();
      startMetronome();
    }
  };
  
  // 振り子のアニメーションスタイル
  const pendulumStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${-30 + pendulumRotation.value * 60}deg`,
        },
      ],
    };
  });
  
  // 拍子設定ボタン
  const renderTimeSignatureButtons = () => {
    const options = [2, 3, 4, 6];
    
    return (
      <View style={styles.timeSignatureContainer}>
        <Text style={styles.label}>拍子</Text>
        <View style={styles.buttonGroup}>
          {options.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.timeSignatureButton,
                beatsPerMeasure === value && {
                  backgroundColor: METRONOME_COLOR,
                },
              ]}
              onPress={() => changeBeatsPerMeasure(value)}
            >
              <Text
                style={[
                  styles.timeSignatureText,
                  beatsPerMeasure === value && { color: '#FFFFFF' },
                ]}
              >
                {value}/4
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  // ビート表示
  const renderBeats = () => {
    const beats = Array(beatsPerMeasure).fill(0);
    
    return (
      <View style={styles.beatsContainer}>
        {beats.map((_, index) => (
          <View
            key={index}
            style={[
              styles.beatIndicator,
              {
                backgroundColor:
                  currentBeat === index
                    ? index === 0
                      ? METRONOME_COLOR
                      : '#666666'
                    : '#DDDDDD',
              },
            ]}
          />
        ))}
      </View>
    );
  };
  
  if (!isVisible) return null;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="music-note" size={24} color={METRONOME_COLOR} />
        <Text style={styles.title}>メトロノーム</Text>
      </View>
      
      <View style={styles.metronomeContainer}>
        {/* 振り子のアニメーション */}
        <View style={styles.pendulumContainer}>
          <View style={styles.pendulumBase} />
          <Animated.View style={[styles.pendulum, pendulumStyle]}>
            <View style={styles.pendulumLine} />
            <View style={styles.pendulumWeight} />
          </Animated.View>
        </View>
        
        {/* BPM表示と調整 */}
        <View style={styles.bpmContainer}>
          <Text style={styles.bpmText}>{bpm} BPM</Text>
          <Slider
            style={styles.slider}
            minimumValue={40}
            maximumValue={208}
            step={1}
            value={bpm}
            onValueChange={(value: number) => setBpm(value)}
            minimumTrackTintColor={METRONOME_COLOR}
            maximumTrackTintColor="#DDDDDD"
            thumbTintColor={METRONOME_COLOR}
          />
          <View style={styles.tempoButtonsContainer}>
            <TouchableOpacity
              style={styles.tempoButton}
              onPress={() => setBpm(Math.max(40, bpm - 1))}
            >
              <Text style={styles.tempoButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tempoButton}
              onPress={() => setBpm(Math.min(208, bpm + 1))}
            >
              <Text style={styles.tempoButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 拍子設定 */}
        {renderTimeSignatureButtons()}
        
        {/* ビート表示 */}
        {renderBeats()}
        
        {/* 再生/停止ボタン */}
        <TouchableOpacity
          style={[
            styles.playButton,
            isPlaying && { backgroundColor: '#E64A19' },
          ]}
          onPress={() => setIsPlaying(!isPlaying)}
        >
          <MaterialIcons
            name={isPlaying ? 'stop' : 'play-arrow'}
            size={32}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333333',
  },
  metronomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pendulumContainer: {
    height: 120,
    width: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  pendulumBase: {
    width: 40,
    height: 10,
    backgroundColor: '#333333',
    borderRadius: 4,
  },
  pendulum: {
    position: 'absolute',
    top: 5,
    height: 100,
    width: 5,
    alignItems: 'center',
    transformOrigin: 'top',
  },
  pendulumLine: {
    width: 2,
    height: 80,
    backgroundColor: '#555555',
  },
  pendulumWeight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: METRONOME_COLOR,
    position: 'absolute',
    bottom: 0,
  },
  bpmContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  bpmText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  tempoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 4,
  },
  tempoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempoButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
  },
  timeSignatureContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeSignatureButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    minWidth: 50,
    alignItems: 'center',
  },
  timeSignatureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
  },
  beatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    height: 20,
  },
  beatIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: METRONOME_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});

export default Metronome; 