import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Image, ScrollView, StatusBar, Animated, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Metronome from './Metronome';
import Tuner from './Tuner';
import { Audio } from 'expo-av';

// 条件付きインポートとエラーハンドリングのためのダミーモジュール
let ScreenOrientation: any = null;
// 画面回転用の定数
const OrientationLock = {
  PORTRAIT_UP: 1,
  LANDSCAPE_RIGHT: 3
};

try {
  // 動的インポート
  if (Platform.OS !== 'web') {
    // @ts-ignore
    const ExpoScreenOrientation = require('expo-screen-orientation');
    ScreenOrientation = ExpoScreenOrientation;
  } else {
    // Webの場合、ダミー実装を提供
    ScreenOrientation = {
      lockAsync: async () => Promise.resolve(),
      unlockAsync: async () => Promise.resolve(),
      OrientationLock: OrientationLock
    };
  }
} catch (error) {
  console.warn('expo-screen-orientation モジュールを読み込めませんでした', error);
  // ダミーの実装を提供
  ScreenOrientation = {
    lockAsync: async () => Promise.resolve(),
    unlockAsync: async () => Promise.resolve(),
    OrientationLock: OrientationLock
  };
}

interface PracticeToolsProps {
  isVisible: boolean;
  sheetMusicUrl?: string;
  isPracticeMode?: boolean;
  onClose?: () => void;
}

const PracticeTools: React.FC<PracticeToolsProps> = ({ 
  isVisible, 
  sheetMusicUrl,
  isPracticeMode: externalPracticeMode,
  onClose
}) => {
  const [isPracticeMode, setIsPracticeMode] = useState(externalPracticeMode || false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  
  // 画面向きの状態
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // メトロノームの状態
  const [metronomeIsPlaying, setMetronomeIsPlaying] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(100);
  
  // 光るエフェクト用のAnimated値
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // 画面の向きを設定する関数
  const configureScreenOrientation = async (isLandscape: boolean) => {
    try {
      // ScreenOrientationが存在するが不完全な場合のチェック
      const isValidModule = ScreenOrientation && 
                            typeof ScreenOrientation.lockAsync === 'function' && 
                            typeof ScreenOrientation.unlockAsync === 'function' &&
                            ScreenOrientation.OrientationLock;
                            
      if (!isValidModule) {
        console.log('画面回転機能は利用できません');
        return Promise.resolve();
      }
      
      if (isLandscape) {
        // 横向き優先に設定
        await ScreenOrientation.unlockAsync();
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
        );
      } else {
        // 縦向きに設定
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      }
      return Promise.resolve();
    } catch (error) {
      console.error('画面回転設定エラー:', error);
      return Promise.resolve(); // エラーが発生しても成功したとみなす
    }
  };
  
  // 画面サイズの変化を監視
  useEffect(() => {
    // 初期向きを設定
    updateOrientation();
    
    // 画面回転の検出
    const subscription = Dimensions.addEventListener('change', updateOrientation);
    
    // 練習モードの場合は自動回転を有効にする
    if (isPracticeMode) {
      configureScreenOrientation(true).catch(error => {
        console.error('画面回転設定エラー:', error);
      });
    }
    
    return () => {
      subscription.remove();
      // コンポーネントのアンマウント時に自動回転を元に戻す
      if (isPracticeMode) {
        configureScreenOrientation(false).catch(error => {
          console.error('画面回転リセットエラー:', error);
        });
      }
    };
  }, [isPracticeMode]);
  
  // 画面向きを更新する関数
  const updateOrientation = () => {
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    setOrientation(isLandscape ? 'landscape' : 'portrait');
    console.log('画面向き変更:', isLandscape ? 'landscape' : 'portrait');
  };
  
  // 全画面モード時にステータスバーを非表示にする
  useEffect(() => {
    try {
      if (isPracticeMode) {
        StatusBar.setHidden(true);
      } else {
        StatusBar.setHidden(false);
      }
      
      return () => {
        try {
          StatusBar.setHidden(false);
        } catch (error) {
          console.error('StatusBar操作エラー:', error);
        }
      };
    } catch (error) {
      console.error('StatusBar操作エラー:', error);
    }
  }, [isPracticeMode]);

  // 練習モードを終了する関数
  const exitPracticeMode = () => {
    console.log('練習モード終了中...');
    
    // 状態を先に更新して UI 反応性を改善
    setIsPracticeMode(false);
    
    // 画面向きを縦向きに戻す処理
    configureScreenOrientation(false)
      .then(() => {
        console.log('画面向きをリセットしました');
        if (onClose) {
          console.log('onClose関数を呼び出します');
          onClose();
        }
      })
      .catch(error => {
        console.error('画面回転リセットエラー:', error);
        // エラーがあってもコールバックを呼び出す
        if (onClose) {
          console.log('エラー後にonClose関数を呼び出します');
          onClose();
        }
      });
  };

  // メトロノームの表示/非表示を切り替える
  const toggleMetronome = () => {
    if (showTuner) setShowTuner(false);
    setShowMetronome(!showMetronome);
  };

  // チューナーの表示/非表示を切り替える
  const toggleTuner = () => {
    if (showMetronome) setShowMetronome(false);
    setShowTuner(!showTuner);
  };

  // メトロノームの再生状態が変更されたときのハンドラ
  const handleMetronomePlayingChange = (isPlaying: boolean) => {
    setMetronomeIsPlaying(isPlaying);
  };

  // メトロノームのBPMが変更されたときのハンドラ
  const handleMetronomeBpmChange = (bpm: number) => {
    setMetronomeBpm(bpm);
  };

  if (!isVisible) return null;

  console.log('PracticeTools再レンダリング - 練習モード状態:', isPracticeMode);
  
  // 光るエフェクトのスタイル
  const borderStyle = {
    borderWidth: 2,
    borderColor: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,87,34,0)', 'rgba(255,87,34,0.8)']
    })
  };
  
  // 全画面表示モードで表示する
  if (sheetMusicUrl) {
    console.log('練習モードレイアウトをレンダリングします');
    return (
      <Animated.View style={[styles.practiceModeFull, metronomeIsPlaying && borderStyle]}>
        <ImprovedSheetMusicViewer 
          url={sheetMusicUrl} 
          onClose={exitPracticeMode}
          orientation={orientation}
        />

        {/* 練習ツールボタン - 向きに応じて位置を調整 */}
        <View style={[
          styles.toolButtonsContainerBottom, 
          orientation === 'landscape' && styles.toolButtonsContainerLandscape
        ]}>
          <TouchableOpacity 
            style={[styles.toolButton, showMetronome && styles.toolButtonActive]} 
            onPress={toggleMetronome}
          >
            <MaterialIcons name="timer" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolButton, showTuner && styles.toolButtonActive, { marginLeft: 12 }]} 
            onPress={toggleTuner}
          >
            <MaterialIcons name="music-note" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* メトロノームを表示/非表示に関わらず常にアイコンの隣に表示 */}
          <View style={styles.metronomeContainer}>
            <SimpleMetronome 
              isPlaying={metronomeIsPlaying}
              onPlayingChange={handleMetronomePlayingChange}
              onBpmChange={handleMetronomeBpmChange}
            />
          </View>
        </View>

        {/* チューナーを表示 - 向きに応じて位置を調整 */}
        {showTuner && (
          <View style={[
            styles.tunerContainer,
            orientation === 'landscape' && styles.tunerContainerLandscape
          ]}>
            <VerticalBarTuner />
          </View>
        )}
      </Animated.View>
    );
  }

  // 楽譜URLがない場合
  return (
    <View style={styles.container}>
      <Text style={styles.noDataText}>楽譜データがありません</Text>
    </View>
  );
};

// 改良版楽譜ビューアーコンポーネント
interface ImprovedSheetMusicViewerProps {
  url: string;
  onClose?: () => void;
  orientation: 'portrait' | 'landscape';
}

const ImprovedSheetMusicViewer: React.FC<ImprovedSheetMusicViewerProps> = ({ 
  url, 
  onClose,
  orientation
}) => {
  const { width, height } = Dimensions.get('window');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  
  // URLが変更された時に状態をリセット
  useEffect(() => {
    setImageLoading(true);
    setImageError(null);
    setLoadAttempt(0);
    console.log('楽譜URL:', url);
  }, [url]);

  // 読み込みの再試行
  useEffect(() => {
    if (imageError && loadAttempt < 3) {
      const retryTimer = setTimeout(() => {
        console.log(`楽譜読み込み再試行 (${loadAttempt + 1}/3)`);
        setImageLoading(true);
        setImageError(null);
        setLoadAttempt(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [imageError, loadAttempt]);

  // 画像ソースを設定
  const getImageSource = () => {
    if (!url) {
      return { uri: '' };
    }
    
    if (url.startsWith('data:')) {
      return { uri: url };
    }
    
    // Firebaseの画像URLの場合はキャッシュ設定とヘッダーを追加
    return { 
      uri: url, 
      cache: 'reload' as const, // キャッシュを強制的に再読み込み
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    };
  };
  
  // スクロールビューの表示スタイル（横向き対応）
  const getScrollViewStyle = () => {
    return orientation === 'landscape' 
      ? { width: '100%', height: '100%' } as const
      : { width: '100%', height: '100%' } as const;
  };

  // 画像のサイズを計算（横向き対応）
  const getImageSize = () => {
    if (orientation === 'landscape') {
      // 横向きの場合は高さを優先
      return {
        width: height * 0.85,
        height: width * 0.85,
      };
    }
    
    // 縦向きの場合は幅を優先
    return {
      width: width * 0.95,
      height: height * 0.95,
    };
  };
  
  return (
    <View style={[
      styles.fullScreenContainer,
      orientation === 'landscape' && styles.fullScreenContainerLandscape
    ]}>
      {imageLoading && (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>楽譜を読み込み中...</Text>
          {loadAttempt > 0 && (
            <Text style={styles.retryText}>再試行中 ({loadAttempt}/3)</Text>
          )}
        </View>
      )}
      
      {imageError && (
        <View style={styles.container}>
          <Text style={styles.errorText}>画像の読み込みに失敗しました</Text>
          <Text style={styles.errorDetail}>{imageError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setImageLoading(true);
              setImageError(null);
              setLoadAttempt(prev => prev + 1);
            }}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
          <Text style={styles.urlDisplay}>URL: {url && url.substring(0, 30)}...</Text>
        </View>
      )}
      
      <ScrollView
        style={[styles.fullscreenScroll, getScrollViewStyle()]}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={3.0}
        minimumZoomScale={1.0}
        bouncesZoom
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image 
          source={getImageSource()}
          style={[
            styles.fullscreenImage,
            getImageSize(),
            orientation === 'landscape' && { transform: [{ rotate: '0deg' }] }
          ]}
          resizeMode="contain"
          onLoadStart={() => {
            console.log('楽譜読み込み開始');
            setImageLoading(true);
          }}
          onError={(error) => {
            console.log('楽譜読み込みエラー:', error.nativeEvent.error);
            setImageLoading(false);
            setImageError(error.nativeEvent.error || '不明なエラー');
          }}
          onLoad={() => {
            console.log('楽譜読み込み完了');
            setImageLoading(false);
          }}
        />
      </ScrollView>
      
      <TouchableOpacity 
        style={[
          styles.closeButton,
          orientation === 'landscape' && styles.closeButtonLandscape
        ]}
        onPress={onClose}
      >
        <MaterialIcons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

// 縦型バーチューナーコンポーネント
const VerticalBarTuner: React.FC = () => {
  const [note, setNote] = useState('A');
  const [octave, setOctave] = useState(4);
  const [cents, setCents] = useState(0);
  const animation = useRef(new Animated.Value(0)).current;
  
  // デモ用にランダムな値を生成
  useEffect(() => {
    const interval = setInterval(() => {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      const randomOctave = Math.floor(Math.random() * 2) + 4;
      const randomCents = Math.floor(Math.random() * 60) - 30;
      
      setNote(randomNote);
      setOctave(randomOctave);
      setCents(randomCents);
      
      // アニメーション
      Animated.timing(animation, {
        toValue: randomCents / 30, // -1.0 to 1.0
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);

  // バーの数と間隔を定義
  const bars = 9; // バーの総数
  const barHeight = 10; // 各バーの高さ
  const barGap = 8; // バー間の間隔
  const middleIndex = Math.floor(bars / 2); // 中央のバーのインデックス
  
  // セント値からアクティブなバーのインデックスを計算
  const getActiveBarIndex = () => {
    // セント値を -4 ～ +4 の範囲に変換 (9バーの場合、-30セント～+30セントを9段階に分ける)
    const normalizedCents = Math.round(cents / 7.5);
    // 中央からのオフセットを計算
    return middleIndex - normalizedCents;
  };
  
  // アクティブなバーのインデックス
  const activeBarIndex = getActiveBarIndex();
  
  return (
    <View style={styles.verticalTunerContainer}>
      <Text style={styles.tunerTitle}>チューナー</Text>
      
      {/* 音名表示 */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          {note.replace('#', '♯')}<Text style={styles.octaveText}>{octave}</Text>
        </Text>
      </View>
      
      {/* 縦型バー */}
      <View style={styles.barsContainer}>
        {Array.from({ length: bars }).map((_, index) => {
          const isMiddle = index === middleIndex;
          const isActive = index === activeBarIndex;
          const isInTune = isActive && isMiddle;
          
          return (
            <View 
              key={`bar-${index}`} 
              style={[
                styles.tunerBar,
                isMiddle && styles.middleBar,
                isActive && (isMiddle ? styles.inTuneBar : (index < middleIndex ? styles.sharpBar : styles.flatBar))
              ]}
            />
          );
        })}
        
        {/* 目盛り線 */}
        <View style={styles.centerLine} />
      </View>

      {/* セント値 */}
      <Text style={[
        styles.centsText,
        Math.abs(cents) <= 5 ? styles.inTuneText : 
        cents < 0 ? styles.flatTextStyle : styles.sharpTextStyle
      ]}>
        {cents > 0 ? '+' : ''}{cents}¢
      </Text>
    </View>
  );
};

// シンプルなメトロノームコンポーネント
interface SimpleMetronomeProps {
  defaultBpm?: number;
  isPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onBpmChange?: (bpm: number) => void;
}

const SimpleMetronome: React.FC<SimpleMetronomeProps> = ({
  defaultBpm = 100,
  isPlaying: externalIsPlaying,
  onPlayingChange,
  onBpmChange
}) => {
  // 内部状態はpropsから初期化、または外部からコントロールされる
  const [bpm, setBpm] = useState(defaultBpm);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  
  // 実際に使用する再生状態を決定（外部から与えられた場合はそれを優先）
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  
  // 音声参照
  const soundRef = useRef<Audio.Sound | null>(null);
  const accentSoundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 音声ファイルの読み込み
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // クリック音とアクセント音を読み込む
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
    } else {
      stopMetronome();
    }
    
    return () => {
      stopMetronome();
    };
  }, [isPlaying, bpm]);
  
  // メトロノームの開始
  const startMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const interval = 60000 / bpm;
    let beat = 0;
    
    // 最初の音を即座に再生
    if (accentSoundRef.current) {
      accentSoundRef.current.replayAsync();
    }
    
    intervalRef.current = setInterval(() => {
      beat = (beat + 1) % 4; // 4拍子を想定
      
      // 音を再生（1拍目はアクセント音）
      if (beat === 0) {
        accentSoundRef.current?.replayAsync();
      } else {
        soundRef.current?.replayAsync();
      }
    }, interval);
  };
  
  // メトロノームの停止
  const stopMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // BPM値の変更
  const handleBpmChange = (increment: number) => {
    const newBpm = Math.min(Math.max(40, bpm + increment), 208);
    setBpm(newBpm);
    if (onBpmChange) {
      onBpmChange(newBpm);
    }
  };
  
  // メトロノームの開始/停止
  const toggleMetronome = () => {
    const newPlayingState = !isPlaying;
    setInternalIsPlaying(newPlayingState);
    if (onPlayingChange) {
      onPlayingChange(newPlayingState);
    }
  };
  
  return (
    <View style={styles.simpleMetronomeContainer}>
      <View style={styles.metronomeHeader}>
        <MaterialIcons name="timer" size={18} color="#FF5722" />
        <Text style={styles.metronomeTitle}>メトロノーム</Text>
      </View>
      
      <View style={styles.bpmInputContainer}>
        <TouchableOpacity 
          style={styles.bpmButton} 
          onPress={() => handleBpmChange(-1)}
          onLongPress={() => handleBpmChange(-10)}
        >
          <Text style={styles.bpmButtonText}>-</Text>
        </TouchableOpacity>
        
        <View style={styles.bpmDisplay}>
          <Text style={styles.bpmText}>{bpm}</Text>
          <Text style={styles.bpmLabel}>BPM</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.bpmButton} 
          onPress={() => handleBpmChange(1)}
          onLongPress={() => handleBpmChange(10)}
        >
          <Text style={styles.bpmButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.playButton, isPlaying && styles.stopButton]} 
        onPress={toggleMetronome}
      >
        <MaterialIcons 
          name={isPlaying ? "stop" : "play-arrow"} 
          size={22} 
          color="#FFFFFF" 
        />
        <Text style={styles.playButtonText}>
          {isPlaying ? "停止" : "開始"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // 基本レイアウト
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  
  // 練習モードのスタイル
  practiceModeFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  
  // 楽譜ビューアーのスタイル
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  fullScreenContainerLandscape: {
    transform: [{ rotate: '0deg' }],
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  retryText: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorDetail: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  urlDisplay: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 10,
    maxWidth: '80%',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenScroll: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  fullscreenImage: {
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  closeButtonLandscape: {
    top: 10,
    right: 10,
  },
  
  // ツールボタンのスタイル
  toolButtonsContainerBottom: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    zIndex: 10000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 24,
  },
  toolButtonsContainerLandscape: {
    right: 20,
    bottom: '50%',
    flexDirection: 'column',
    alignSelf: 'flex-end',
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: {
    backgroundColor: '#2196F3',
  },
  toolButtonSpaced: {
    marginLeft: 12,
  },
  
  // チューナーのスタイル
  tunerContainer: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 8,
    zIndex: 9999,
    width: '80%',
    maxWidth: 350,
  },
  tunerContainerLandscape: {
    top: 'auto',
    bottom: 16,
    right: 16,
    width: '30%',
  },
  verticalTunerContainer: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    width: '100%',
  },
  tunerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  noteContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  octaveText: {
    fontSize: 18,
    fontWeight: '500',
  },
  barsContainer: {
    height: 130,
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  tunerBar: {
    width: '60%',
    height: 4,
    backgroundColor: '#555',
    marginVertical: 4,
    borderRadius: 2,
  },
  middleBar: {
    backgroundColor: '#777',
    height: 6,
  },
  inTuneBar: {
    backgroundColor: '#4CAF50', // 緑色
    height: 8,
  },
  sharpBar: {
    backgroundColor: '#FF9800', // オレンジ色
    height: 8,
  },
  flatBar: {
    backgroundColor: '#2196F3', // 青色
    height: 8,
  },
  centerLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    top: '50%',
  },
  centsText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#FFFFFF', // 基本色を追加
  },
  inTuneText: {
    color: '#4CAF50', // 緑色
  },
  flatTextStyle: {
    color: '#2196F3', // 青色
  },
  sharpTextStyle: {
    color: '#FF9800', // オレンジ色
  },
  
  // メトロノームのスタイル
  metronomeContainer: {
    marginLeft: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 8,
    width: 160,
  },
  simpleMetronomeContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  metronomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metronomeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  bpmInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  bpmButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,87,34,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bpmButtonText: {
    color: '#FF5722',
    fontSize: 22,
    fontWeight: 'bold',
  },
  bpmDisplay: {
    alignItems: 'center',
  },
  bpmText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  bpmLabel: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 4,
    paddingVertical: 6,
    marginTop: 5,
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default PracticeTools; 