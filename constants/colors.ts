/**
 * アプリケーションで使用する色の定義
 */
export const colors = {
  // 背景色
  background: {
    primary: '#121212',    // メイン背景（ダーク）
    secondary: '#1E1E1E',  // セカンダリ背景（カード背景など）
    tertiary: '#2A2A2A',   // 入力フィールドなど
  },
  
  // テキスト色
  text: {
    primary: '#FFFFFF',    // 主要テキスト
    secondary: '#B3B3B3',  // 補足テキスト
    tertiary: '#757575',   // 薄いテキスト
    accent: '#BB86FC',     // アクセントテキスト
  },
  
  // ボタン色
  button: {
    primary: '#BB86FC',    // プライマリーボタン
    secondary: '#3700B3',  // セカンダリーボタン
    disabled: '#666666',   // 無効状態
  },
  
  // アクセント色
  accent: {
    primary: '#BB86FC',    // プライマリーアクセント
    secondary: '#03DAC6',  // セカンダリーアクセント
    danger: '#CF6679',     // 警告・エラー
  },
  
  // その他の色
  divider: '#323232',      // 区切り線
  overlay: 'rgba(0, 0, 0, 0.5)', // オーバーレイ
  success: '#03DAC6',      // 成功状態
  error: '#CF6679',        // エラー状態
  
  // デモモード関連
  demo: {
    indicator: '#FFA000',  // デモモード表示
    background: '#332D00', // デモモード背景アクセント
  }
}; 