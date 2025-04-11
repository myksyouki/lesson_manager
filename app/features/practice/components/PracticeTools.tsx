import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Image, ScrollView, StatusBar, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Metronome from './Metronome';
import Tuner from './Tuner';

interface PracticeToolsProps {
  isVisible: boolean;
  sheetMusicUrl?: string;
  isPracticeMode?: boolean;
  onEnterPracticeMode?: () => void;
  onExitPracticeMode?: () => void;
}

const PracticeTools: React.FC<PracticeToolsProps> = ({ 
  isVisible, 
  sheetMusicUrl,
  isPracticeMode: externalPracticeMode,
  onEnterPracticeMode,
  onExitPracticeMode: externalExitPracticeMode
}) => {
  const [isPracticeMode, setIsPracticeMode] = useState(externalPracticeMode || false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  
  // 画面サイズと向きを検出
  const { width, height } = Dimensions.get('window');
  // 注意: 練習モードでは常に横向き表示として扱う
  const effectiveLandscape = isPracticeMode || (width > height);
  
  // 全画面モード時にステータスバーを非表示にする
  useEffect(() => {
    if (isPracticeMode) {
      StatusBar.setHidden(true);
      console.log('練習モードが有効になりました:', isPracticeMode);
    } else {
      StatusBar.setHidden(false);
      console.log('練習モードが無効になりました:', isPracticeMode);
    }
    
    return () => {
      StatusBar.setHidden(false);
    };
  }, [isPracticeMode]);

  // 練習モードを終了する関数
  const exitPracticeMode = () => {
    console.log('練習モード終了関数が呼ばれました');
    setIsPracticeMode(false);
    if (externalExitPracticeMode) {
      externalExitPracticeMode();
    }
  };

  // 練習モードを開始する関数
  const enterPracticeMode = () => {
    console.log('練習モード開始関数が呼ばれました');
    setIsPracticeMode(true);
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

  if (!isVisible) return null;

  console.log('PracticeTools再レンダリング - 練習モード状態:', isPracticeMode);
  
  // 必ず全画面表示（横向き）モードで表示する
  if (sheetMusicUrl) {
    console.log('練習モードレイアウトをレンダリングします');
    return (
      <View style={styles.practiceModeFull}>
        <SheetMusicViewer 
          url={sheetMusicUrl} 
          isPracticeMode={true}
          onExitPracticeMode={exitPracticeMode}
        />

        {/* 練習ツールボタン - 練習モードに合わせて配置 */}
        <View style={[
          styles.toolButtonsContainer,
          {
            // 練習モードでは常に横向き表示に合わせた位置調整
            transform: [{ rotate: '90deg' }],
            left: 0,  // 画面端に完全に寄せる
            top: height / 2,  // 垂直方向は中央に配置
          }
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
        </View>

        {/* メトロノームをツールボタンの左側（上側）に表示 */}
        {showMetronome && (
          <View style={[
            styles.inlineToolContainer,
            {
              position: 'absolute',
              transform: [{ rotate: '90deg' }],
              top: height / 2 - 60, // 上方向に少し調整
              left: 48, // 正の値に変更して画面内に表示
              zIndex: 15000,
            }
          ]}>
            <SimpleMetronome />
          </View>
        )}

        {/* チューナーをツールボタンの左側（上側）に表示 */}
        {showTuner && (
          <View style={[
            styles.inlineToolContainer,
            {
              position: 'absolute',
              transform: [{ rotate: '90deg' }],
              top: height / 2 - 60, // 上方向に少し調整
              left: 108, // 正の値に変更して画面内に表示
              zIndex: 15000,
            }
          ]}>
            <VerticalBarTuner />
          </View>
        )}
      </View>
    );
  }

  // 楽譜URLがない場合
  return (
    <View style={styles.container}>
      <Text style={styles.noDataText}>楽譜データがありません</Text>
    </View>
  );
};

interface SheetMusicViewerProps {
  url: string;
  isPracticeMode: boolean;
  onExitPracticeMode?: () => void;
  onEnterPracticeMode?: () => void;
}

const SheetMusicViewer: React.FC<SheetMusicViewerProps> = ({ 
  url, 
  isPracticeMode, 
  onExitPracticeMode,
  onEnterPracticeMode
}) => {
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height; // デバイスが物理的に横向きかどうか
  const isMobile = width < 768;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  
  // マウント時にデバッグログを出力
  useEffect(() => {
    console.log('SheetMusicViewer マウント - URL:', url);
    console.log('画面サイズ:', { width, height, isMobile, isLandscape });
    console.log('練習モード状態:', isPracticeMode);
    
    // コンポーネントのアンマウント時に実行
    return () => {
      console.log('SheetMusicViewer アンマウント - URL:', url);
    };
  }, [url, width, height, isMobile, isPracticeMode]);

  // 練習モードボタンが押された時の処理
  const handleEnterPracticeMode = () => {
    console.log('練習モードボタンがクリックされました');
    if (onEnterPracticeMode) {
      console.log('onEnterPracticeMode関数を呼び出します');
      onEnterPracticeMode();
    } else {
      console.error('onEnterPracticeMode関数が定義されていません');
    }
  };

  // 練習モード終了ボタンが押された時の処理
  const handleExitPracticeMode = () => {
    console.log('練習モード終了ボタンがクリックされました');
    if (onExitPracticeMode) {
      console.log('onExitPracticeMode関数を呼び出します');
      onExitPracticeMode();
    } else {
      console.error('onExitPracticeMode関数が定義されていません');
    }
  };

  // URLが変更された時に状態をリセット
  useEffect(() => {
    console.log('URL変更:', url);
    setImageLoading(true);
    setImageError(null);
  }, [url]);

  // 画像ソースを設定
  const getImageSource = () => {
    if (url.startsWith('data:')) {
      return { uri: url };
    }
    
    // Firebaseの画像URLの場合はキャッシュ設定とヘッダーを追加
    return { 
      uri: url, 
      cache: 'force-cache' as const,
      headers: {
        'Cache-Control': 'max-age=31536000',
        'Pragma': 'no-cache'
      }
    };
  };
  
  // デバイスの向きに応じてコンテナサイズを決定
  const containerWidth = isLandscape ? width : height;
  const containerHeight = isLandscape ? height : width;
  const imageWidth = containerWidth * 1.2;
  const imageHeight = containerHeight * 1.2;
  
  return (
    <View style={styles.landscapeContainer}>
      {/* デバイスの向きに応じて表示方法を変更 */}
      <View style={[
        styles.rotationContainer,
        {
          width: width,
          height: height,
        }
      ]}>
        {/* 縦向きデバイスの場合のみ90度回転させる */}
        <View style={[
          styles.rotatedContent,
          {
            width: containerWidth,
            height: containerHeight,
            top: (height - containerHeight) / 2,
            left: (width - containerWidth) / 2,
            transform: isLandscape ? [] : [{ rotate: '90deg' }],
          }
        ]}>
          <ScrollView
            style={styles.fullscreenScroll}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={2.0}
            minimumZoomScale={1.0}
            bouncesZoom
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image 
              source={getImageSource()}
          style={[
                styles.fullscreenImage,
                {
                  width: imageWidth,
                  height: imageHeight,
                }
              ]}
              resizeMode="contain"
              onLoadStart={() => setImageLoading(true)}
              onError={(error) => {
                setImageLoading(false);
                setImageError(error.nativeEvent.error);
              }}
              onLoad={() => setImageLoading(false)}
            />
          </ScrollView>
        </View>
      </View>

      {/* 閉じるボタン */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleExitPracticeMode}
      >
        <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
      {imageLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>画像を読み込み中...</Text>
        </View>
      )}
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
    <View style={styles.verticalBarTuner}>
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
        cents < 0 ? styles.flatText : styles.sharpText
      ]}>
        {cents > 0 ? '+' : ''}{cents}¢
      </Text>
    </View>
  );
};

// シンプルなメトロノームコンポーネント
const SimpleMetronome: React.FC = () => {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // BPM値の変更
  const handleBpmChange = (increment: number) => {
    const newBpm = Math.min(Math.max(40, bpm + increment), 208);
    setBpm(newBpm);
  };
  
  // メトロノームの開始/停止
  const toggleMetronome = () => {
    setIsPlaying(!isPlaying);
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  practiceButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: '100%',
    height: '80%',
    backgroundColor: '#F8F8F8',
  },
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  noDataText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  // 横向き表示用のスタイル
  landscapeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  rotationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  rotatedContent: {
    position: 'absolute',
    backgroundColor: '#000000',
    overflow: 'hidden',
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
  // 練習ツール関連のスタイル
  toolButtonsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
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
  bottomToolContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 9990,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  topToolWrapper: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10000,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  toolWrapper: {
    flex: 1,
    padding: 16,
  },
  compactTuner: {
    flex: 1,
    borderRadius: 12,
  },
  tunerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tunerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  tunerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteDisplay: {
    width: '30%',
    alignItems: 'center',
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
  inTuneText: {
    color: '#4CAF50',
  },
  tuningMeter: {
    width: '50%',
    height: 20,
    position: 'relative',
  },
  meterScale: {
    width: '100%',
    height: 4,
    backgroundColor: '#555555',
    borderRadius: 2,
    position: 'relative',
    top: 8,
  },
  meterCenter: {
    position: 'absolute',
    width: 4,
    height: 12,
    backgroundColor: '#FFFFFF',
    left: '50%',
    marginLeft: -2,
    top: -4,
    borderRadius: 2,
  },
  meterIndicator: {
    position: 'absolute',
    width: 8,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    top: 0,
    marginLeft: -4,
  },
  tuningStatus: {
    width: '20%',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inTuneStatus: {
    color: '#4CAF50',
  },
  outOfTuneStatus: {
    color: '#F44336',
  },
  compactTunerContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sideToolWrapper: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10000,
    borderRadius: 16,
  },
  horizontalToolContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 12000,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  landscapeTunerContainer: {
    flexDirection: 'column',
    flex: 1,
    paddingHorizontal: 16,
  },
  landscapeTunerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    width: '100%',
  },
  noteDisplayLandscape: {
    width: '30%',
    alignItems: 'center',
  },
  landscapeNoteText: {
    fontSize: 36,
  },
  tuningMeterLandscape: {
    width: '50%',
    height: 30,
    position: 'relative',
  },
  landscapeTuningStatus: {
    width: '20%',
    fontSize: 14,
    fontWeight: 'bold',
  },
  landscapeTunerWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalTunerContainer: {
    borderRadius: 12,
    padding: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#4CAF50',
    overflow: 'hidden',  // オーバーフローを隠す
  },
  guitarTunerContainer: {
    flex: 1,
    padding: 10,
  },
  guitarStrings: {
    alignItems: 'center', 
    justifyContent: 'space-between',
    height: 240,
  },
  guitarString: {
    width: '100%',
    height: 36,
    backgroundColor: 'rgba(50,50,50,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginVertical: 2,
  },
  activeString: {
    backgroundColor: 'rgba(33,150,243,0.3)',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  stringNote: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  stringOctave: {
    fontSize: 14,
    color: '#AAA',
  },
  tuningIndicatorContainer: {
    height: 80,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tuningScale: {
    width: '100%',
    height: 3,
    backgroundColor: '#666',
    position: 'relative',
  },
  tuningCenter: {
    position: 'absolute',
    width: 3,
    height: 15,
    backgroundColor: '#FFF',
    left: '50%',
    marginLeft: -1.5,
    top: -6,
  },
  tuningPointer: {
    position: 'absolute',
    width: 8,
    height: 30,
    backgroundColor: '#F44336',
    borderRadius: 4,
    top: '50%',
    marginTop: -15,
  },
  tuningPointerInTune: {
    backgroundColor: '#4CAF50',
  },
  centValue: {
    marginTop: 35,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tuneStatus: {
    alignItems: 'center',
    marginTop: 15,
  },
  tuneStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  outOfTuneText: {
    color: '#F44336',
  },
  pianoTunerContainer: {
    flex: 1,
    padding: 10,
  },
  pianoKeysContainer: {
    height: 300,
    width: '100%',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  pianoKey: {
    height: 22,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginVertical: 1,
  },
  naturalKey: {
    backgroundColor: 'rgba(250,250,250,0.7)',
  },
  sharpKey: {
    backgroundColor: 'rgba(30,30,30,0.7)',
  },
  keyLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  naturalKeyLabel: {
    color: '#333',
  },
  sharpKeyLabel: {
    color: '#FFF',
  },
  noteDisplayContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  currentNote: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  octaveIndicator: {
    fontSize: 20,
    fontWeight: 'normal',
    color: '#AAA',
  },
  centsValue: {
    fontSize: 14,
    marginTop: 5,
  },
  accuracyMeterContainer: {
    height: 60,
    width: '100%',
    position: 'relative',
    marginVertical: 10,
  },
  accuracyScale: {
    width: '100%',
    height: 2,
    backgroundColor: '#666',
    position: 'relative',
    marginTop: 20,
  },
  centerLine: {
    position: 'absolute',
    width: 2,
    height: 16,
    backgroundColor: '#FFF',
    left: '50%',
    marginLeft: -1,
    top: -7,
  },
  scaleTick: {
    position: 'absolute',
    width: 1,
    height: 8,
    backgroundColor: '#888',
    top: -3,
  },
  accuracyIndicator: {
    position: 'absolute',
    width: 12,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#F44336',
    top: 6,
    marginLeft: -6,
  },
  accuracyIndicatorInTune: {
    backgroundColor: '#4CAF50',
  },
  tuningStatusContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  tuningStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  analogTunerContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  analogHeader: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  analogTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  analogNoteDisplay: {
    alignItems: 'center',
    marginTop: 5,
  },
  analogNote: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFF',
  },
  analogOctave: {
    fontSize: 20,
    color: '#CCC',
  },
  meterContainer: {
    marginVertical: 20,
    height: 120,
    alignItems: 'center',
  },
  meterTick: {
    position: 'absolute',
    width: 1,
    height: 5,
    backgroundColor: '#999',
    bottom: 8,
  },
  centerTick: {
    backgroundColor: '#FFF',
    width: 2,
  },
  inTuneTick: {
    backgroundColor: '#4CAF50',
  },
  meterAxis: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    bottom: 20,
    left: '50%',
    marginLeft: -6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  meterNeedle: {
    position: 'absolute',
    width: 2,
    height: 55,
    backgroundColor: '#FF9800',
    bottom: 0,
    borderRadius: 1,
    transformOrigin: 'bottom',
  },
  inTuneRange: {
    position: 'absolute',
    width: '20%',
    height: 5,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    bottom: 8,
    left: '40%',
    borderRadius: 2,
  },
  centsDisplay: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  inTuneIndicator: {
    backgroundColor: '#4CAF50',
  },
  outOfTuneIndicator: {
    backgroundColor: '#F44336',
  },
  analogStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  spectrumTunerContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: 'transparent',
  },
  spectrumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  spectrumTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '600',
  },
  spectrumNoteDisplay: {
    alignItems: 'center',
    marginVertical: 5,
  },
  spectrumNote: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  spectrumOctave: {
    fontSize: 20,
    color: '#BBBBBB',
  },
  spectrumCents: {
    fontSize: 15,
    marginTop: 2,
  },
  closeStatus: {
    color: '#FFC107', // 黄色 - 近いけどまだ
  },
  spectrumContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  spectrumScale: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 5,
  },
  spectrumCenterLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    top: '50%',
  },
  barsContainer: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 2,
  },
  spectrumBar: {
    width: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  spectrumMarker: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: '50%',
    marginLeft: -1,
  },
  spectrumStatusContainer: {
    alignItems: 'center',
    marginTop: 5,
    paddingVertical: 5,
  },
  spectrumStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  simpleChromaTuner: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(33,33,33,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#555',
  },
  simpleMeterContainer: {
    width: '100%',
    height: 40,
    position: 'relative',
    marginBottom: 10,
  },
  simpleCenterLine: {
    position: 'absolute',
    width: 2,
    height: 30,
    backgroundColor: '#FFF',
    left: '50%',
    top: 0,
    marginLeft: -1,
  },
  simpleIndicator: {
    position: 'absolute',
    width: 12,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F44336',
    top: 3,
    marginLeft: -6,
  },
  simpleTick: {
    position: 'absolute',
    width: 1,
    height: 10,
    backgroundColor: '#777',
    top: 10,
  },
  simpleCenterTick: {
    height: 16,
    backgroundColor: '#CCC',
  },
  simpleCents: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  simpleStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  simpleStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // meterScaleの重複を修正（元のものをanalogMeterScaleにリネーム）
  analogMeterScale: {
    width: '100%',
    height: 80,
    backgroundColor: '#333',
    borderRadius: 40,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#666',
  },
  
  // 横長チューナー用のスタイルを追加
  wideChromaTuner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  wideTunerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  wideTunerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  wideContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wideNoteContainer: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideNoteText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wideOctaveText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  wideMeterContainer: {
    flex: 1,
    height: 60,
    paddingHorizontal: 20,
  },
  wideMeterScale: {
    width: '100%',
    height: 6,
    backgroundColor: '#444',
    borderRadius: 3,
    position: 'relative',
    marginTop: 10,
  },
  wideCenterLine: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#FFF',
    left: '50%',
    top: -7,
    marginLeft: -1,
  },
  wideTick: {
    position: 'absolute',
    width: 1,
    height: 10,
    backgroundColor: '#777',
    top: -2,
  },
  wideCenterTick: {
    height: 16,
    backgroundColor: '#CCC',
    width: 2,
  },
  wideIndicator: {
    position: 'absolute',
    width: 10,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#F44336',
    top: -7,
    marginLeft: -5,
  },
  wideCentsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
  },
  wideStatusContainer: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // シンプル音名チューナー用のスタイル
  simpleNoteTuner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  simpleNoteTunerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  simpleNoteDisplay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  simpleNoteText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inTuneBackground: {
    backgroundColor: 'rgba(76,175,80,0.6)',
  },
  outOfTuneBackground: {
    backgroundColor: 'rgba(244,67,54,0.6)',
  },
  // プロチューナー用のスタイル
  proTuner: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  proTunerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proTunerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  proNoteDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  proNoteText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proOctaveText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  proCentsText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  proMeterContainer: {
    width: '100%',
    height: 30,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  meterMarkings: {
    width: '100%',
    height: 2,
    backgroundColor: '#444',
    position: 'relative',
  },
  proMeterNeedle: {
    position: 'absolute',
    width: 2,
    height: 16,
    backgroundColor: '#FF9800',
    bottom: 0,
    left: '50%',
    marginLeft: -1,
    borderRadius: 1,
    transformOrigin: 'bottom',
  },
  proMeterAxis: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: '50%',
    marginLeft: -3,
    borderWidth: 1,
    borderColor: '#333',
  },
  proInTuneRange: {
    position: 'absolute',
    width: '10%',
    height: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    bottom: 0,
    left: '45%',
    borderRadius: 2,
  },
  proTuneStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  proStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  flatText: {
    color: '#2196F3', // 青 - 低い
  },
  sharpText: {
    color: '#FF9800', // オレンジ - 高い
  },
  // 縦型バーチューナー用のスタイル
  verticalBarTuner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
  },
  noteContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  barsContainer: {
    height: 130,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
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
  },
  inTuneText: {
    color: '#4CAF50', // 緑色
  },
  flatText: {
    color: '#2196F3', // 青色
  },
  sharpText: {
    color: '#FF9800', // オレンジ色
  },
  // 背景が光るメトロノーム用のスタイル
  metronomeContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  pulseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,87,34,0.1)',
  },
  metronomeContent: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  // シンプルなメトロノーム用のスタイル
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
  inlineToolContainer: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 8,
    padding: 8,
    marginLeft: 12,
    width: 150,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: '#4CAF50',
  },
});

export default PracticeTools; 