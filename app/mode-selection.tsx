import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Image, 
  Dimensions, 
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';

const { width, height } = Dimensions.get('window');

export default function ModeSelectionScreen() {
  const { enterDemoMode } = useAuthStore();

  const handleDemoMode = async () => {
    try {
      await enterDemoMode();
      router.replace('/tabs');
    } catch (error) {
      console.error('デモモード開始エラー:', error);
    }
  };

  const handleCreateAccount = () => {
    router.push('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F5FBFF', '#E0F6FF', '#D5F0FF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.appName}>Resonote</Text>
        </View>
        
        <Text style={styles.title}>アプリの使用方法を選択</Text>
        <Text style={styles.subtitle}>アカウントを作成するか、デモモードで試すかを選択してください</Text>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleCreateAccount}
          >
            <LinearGradient
              colors={['#4285F4', '#356AC3']}
              style={styles.optionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="person-add" size={28} color="white" />
              <Text style={styles.optionText}>アカウント作成</Text>
              <Text style={styles.optionDescription}>全機能を利用可能</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.optionButton, styles.demoButton]}
            onPress={handleDemoMode}
          >
            <View style={styles.demoContent}>
              <MaterialIcons name="remove-red-eye" size={28} color="#356AC3" />
              <Text style={styles.demoText}>アカウント作成せず利用</Text>
              <Text style={styles.demoDescription}>チャット機能のみ利用可能</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.privacyNote}>
          「アカウント作成」を選択すると、
          <Text 
            style={styles.link}
            onPress={() => router.push('/privacy-policy')}
          >
            プライバシーポリシー
          </Text>
          と
          <Text 
            style={styles.link}
            onPress={() => router.push('/terms-of-service')}
          >
            利用規約
          </Text>
          に同意したことになります。
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  optionButton: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 90,
  },
  optionGradient: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  demoButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  demoContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  demoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  demoDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  privacyNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  link: {
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
}); 