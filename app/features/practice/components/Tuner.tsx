import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import * as Pitchy from 'pitchy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// チューナーのテーマカラー
const TUNER_COLOR = '#4CAF50';

// 音名と周波数のマッピング (A4 = 440Hz)
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// 音名を取得する関数
const getNote = (frequency: number): { note: string; octave: number; cents: number } => {
  // A4 = 440Hz、12音階で1オクターブ
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  
  if (frequency < 27.5) {
    return { note: '?', octave: 0, cents: 0 };
  }
  
  // C0からの半音数
  const halfSteps = Math.round(12 * Math.log2(frequency / C0));
  const octave = Math.floor(halfSteps / 12);
  const noteIndex = halfSteps % 12;
  
  // セント値の計算（チューニングのずれ）
  const exactHalfSteps = 12 * Math.log2(frequency / C0);
  const cents = Math.round((exactHalfSteps - halfSteps) * 100);
  
  return {
    note: NOTES[noteIndex],
    octave,
    cents,
  };
};

interface TunerProps {
  isVisible: boolean;
}

const Tuner: React.FC<TunerProps> = ({ isVisible }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentFrequency, setCurrentFrequency] = useState<number | null>(null);
  const [currentNote, setCurrentNote] = useState({ note: '?', octave: 0, cents: 0 });
  const [permission, setPermission] = useState(false);
  
  const recording = useRef<Audio.Recording | null>(null);
  const processorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // インジケーターの位置アニメーション
  const indicatorPosition = useSharedValue(0);
  
  // マイク使用許可を求める
  useEffect(() => {
    const getPermission = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setPermission(status === 'granted');
    };
    
    getPermission();
    
    return () => {
      stopListening();
    };
  }, []);
  
  // 音程検出を開始
  const startListening = async () => {
    if (!permission) {
      console.error('マイクの使用許可がありません');
      return;
    }
    
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // 録音を開始
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recording.current = newRecording;
      
      // 音程解析の間隔を設定
      processorIntervalRef.current = setInterval(async () => {
        if (recording.current) {
          const status = await recording.current.getStatusAsync();
          if (status.isRecording) {
            try {
              // メータリングを使用して現在の音量を取得
              const { metering } = status;
              
              // 音量が小さすぎる場合はスキップ (無音判定)
              if (metering && metering < -50) {
                setCurrentFrequency(null);
                setCurrentNote({ note: '?', octave: 0, cents: 0 });
                return;
              }
              
              // 録音データからピッチを検出する処理をシミュレート
              // 実際のアプリでは、WebAudioAPIなどを使用してリアルタイム解析が必要
              // ここではデモとして周波数をランダムに生成
              const demoFreq = Math.random() * 300 + 200; // 200-500Hzの範囲でランダム
              setCurrentFrequency(demoFreq);
              
              // 音名を取得
              const noteInfo = getNote(demoFreq);
              setCurrentNote(noteInfo);
              
              // インジケーターのアニメーション
              indicatorPosition.value = withTiming(noteInfo.cents / 50, {
                duration: 150,
                easing: Easing.elastic(1),
              });
            } catch (error) {
              console.error('ピッチ検出エラー:', error);
            }
          }
        }
      }, 100); // 100ms間隔で更新
      
      setIsListening(true);
    } catch (error) {
      console.error('録音開始エラー:', error);
    }
  };
  
  // 音程検出を停止
  const stopListening = async () => {
    try {
      if (processorIntervalRef.current) {
        clearInterval(processorIntervalRef.current);
        processorIntervalRef.current = null;
      }
      
      if (recording.current) {
        await recording.current.stopAndUnloadAsync();
        recording.current = null;
      }
      
      setIsListening(false);
      setCurrentFrequency(null);
      setCurrentNote({ note: '?', octave: 0, cents: 0 });
    } catch (error) {
      console.error('録音停止エラー:', error);
    }
  };
  
  // チューナーの開始/停止を切り替え
  const toggleTuner = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  // インジケーターのアニメーションスタイル
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: indicatorPosition.value * 3, // センスの値に基づいて移動
        },
      ],
    };
  });
  
  // チューニングのステータス
  const getTuningStatus = (cents: number) => {
    if (cents === 0) return '完璧';
    if (Math.abs(cents) <= 5) return '良好';
    if (Math.abs(cents) <= 15) return 'ほぼ良好';
    if (cents > 0) return '高すぎます';
    return '低すぎます';
  };
  
  if (!isVisible) return null;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="music-note" size={24} color={TUNER_COLOR} />
        <Text style={styles.title}>チューナー</Text>
      </View>
      
      <View style={styles.tunerContainer}>
        {/* 音名表示 */}
        <View style={styles.noteDisplay}>
          <Text style={styles.noteText}>
            {currentNote.note}
            <Text style={styles.octaveText}>{currentNote.octave}</Text>
          </Text>
        </View>
        
        {/* 周波数表示 */}
        <Text style={styles.frequencyText}>
          {currentFrequency ? `${currentFrequency.toFixed(1)} Hz` : '-- Hz'}
        </Text>
        
        {/* チューニングメーター */}
        <View style={styles.meterContainer}>
          <View style={styles.meterScale}>
            <View style={[styles.meterTick, styles.meterCenter]} />
            {[-30, -20, -10, 10, 20, 30].map((pos) => (
              <View
                key={pos}
                style={[
                  styles.meterTick,
                  { left: `${50 + pos}%` },
                  pos === 0 && styles.meterCenter,
                ]}
              />
            ))}
          </View>
          
          <Animated.View style={[styles.meterIndicator, indicatorStyle]} />
        </View>
        
        {/* チューニングステータス */}
        <Text style={[
          styles.tuningStatus,
          Math.abs(currentNote.cents) <= 5 && styles.tuningGood,
          Math.abs(currentNote.cents) > 15 && styles.tuningBad,
        ]}>
          {currentNote.note !== '?' ? getTuningStatus(currentNote.cents) : '演奏してください'}
        </Text>
        
        {/* チューニングアドバイス */}
        {currentNote.note !== '?' && Math.abs(currentNote.cents) > 5 && (
          <Text style={styles.tuningAdvice}>
            {currentNote.cents > 0 ? '緩めてください' : '張ってください'} ({Math.abs(currentNote.cents)}セント)
          </Text>
        )}
        
        {/* 開始/停止ボタン */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isListening && { backgroundColor: '#E53935' },
          ]}
          onPress={toggleTuner}
        >
          <MaterialIcons
            name={isListening ? 'stop' : 'mic'}
            size={32}
            color="#FFFFFF"
          />
          <Text style={styles.buttonText}>
            {isListening ? '停止' : '開始'}
          </Text>
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
  tunerContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noteDisplay: {
    marginVertical: 12,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 72,
    fontWeight: '700',
    color: TUNER_COLOR,
  },
  octaveText: {
    fontSize: 36,
    fontWeight: '500',
    color: '#666666',
  },
  frequencyText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 20,
  },
  meterContainer: {
    width: '100%',
    height: 60,
    position: 'relative',
    marginBottom: 20,
  },
  meterScale: {
    width: '100%',
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    flexDirection: 'row',
    position: 'relative',
  },
  meterTick: {
    width: 2,
    height: 20,
    backgroundColor: '#BBBBBB',
    position: 'absolute',
    top: 10,
  },
  meterCenter: {
    backgroundColor: TUNER_COLOR,
    width: 3,
    height: 30,
    left: '50%',
    marginLeft: -1.5,
    top: 5,
  },
  meterIndicator: {
    width: 12,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#333333',
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -6,
  },
  tuningStatus: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  tuningGood: {
    color: TUNER_COLOR,
  },
  tuningBad: {
    color: '#E53935',
  },
  tuningAdvice: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TUNER_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Tuner; 