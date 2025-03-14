import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/index';
import { AnimatedLoader, FadeIn, Scale, AnimatedButton } from '../../../components/AnimatedComponents';

interface EmptyOrLoadingProps {
  isLoading: boolean;
  onGenerateTasks: () => void;
}

export const EmptyOrLoading: React.FC<EmptyOrLoadingProps> = ({
  isLoading,
  onGenerateTasks,
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <FadeIn duration={600}>
        <View style={styles.loadingContainer}>
          <AnimatedLoader 
            size={50} 
            color={theme.colors.primary} 
            style={{ marginBottom: 20 }}
          />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            データを読み込み中...
          </Text>
        </View>
      </FadeIn>
    );
  }

  return (
    <FadeIn duration={800}>
      <View style={styles.emptyState}>
        <Scale duration={1000} from={0.8}>
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name="assignment" 
              size={70} 
              color={theme.colors.textTertiary} 
            />
          </View>
        </Scale>
        
        <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
          課題がありません
        </Text>
        
        <Text style={[styles.emptyStateDescription, { color: theme.colors.textSecondary }]}>
          過去のレッスンから新しい練習課題を自動生成できます
        </Text>
        
        <AnimatedButton 
          title="レッスンから課題を生成"
          onPress={onGenerateTasks}
          style={{ 
            backgroundColor: theme.colors.primary, 
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            marginTop: 24
          }}
          textStyle={styles.generateButtonText}
          activeScale={0.95}
        />
      </View>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyStateDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyOrLoading;
