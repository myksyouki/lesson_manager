import { LogBox } from 'react-native';

// Expo Router内部のHooks呼び出し警告を無視
LogBox.ignoreLogs(['Do not call Hooks inside useEffect']);

// expo-routerのエントリポイントをそのままエクスポート
export { default } from 'expo-router/entry'; 