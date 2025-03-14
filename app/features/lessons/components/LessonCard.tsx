import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../../components/ui/Card';
import { Tag } from '../../../components/ui/Tag';
import { useTheme } from '../../../theme/index';

// 日付フォーマット関数
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  
  return `${year}年${month}月${day}日(${dayOfWeek})`;
};

interface LessonCardProps {
  lesson: {
    id: string;
    teacher: string;
    date: string;
    pieces?: string[];
    summary?: string;
    tags?: string[];
    isFavorite?: boolean;
    status?: string;
  };
  onToggleFavorite?: (id: string) => void;
}

export const LessonCard = ({ lesson, onToggleFavorite }: LessonCardProps) => {
  const { colors } = useTheme();
  
  const handlePress = () => {
    router.push(`/lesson-detail?id=${lesson.id}`);
  };
  
  const handleFavoritePress = () => {
    if (onToggleFavorite) {
      onToggleFavorite(lesson.id);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'transcribed':
        return colors.warning;
      case 'processing':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'transcribed':
        return '文字起こし完了';
      case 'processing':
        return '処理中';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {lesson.pieces && lesson.pieces.length > 0 
                ? lesson.pieces[0] 
                : 'タイトルなし'}
            </Text>
            {lesson.status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lesson.status) }]}>
                <Text style={styles.statusText}>{getStatusText(lesson.status)}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleFavoritePress}>
            <MaterialIcons
              name={lesson.isFavorite ? 'star' : 'star-border'}
              size={24}
              color={lesson.isFavorite ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        
        {lesson.pieces && lesson.pieces.length > 1 && (
          <View style={styles.piecesContainer}>
            {lesson.pieces.slice(1, 3).map((piece, index) => (
              <Text key={index} style={[styles.additionalPiece, { color: colors.textSecondary }]}>
                {piece}
              </Text>
            ))}
            {lesson.pieces.length > 3 && (
              <Text style={[styles.morePiecesText, { color: colors.textSecondary }]}>
                +{lesson.pieces.length - 3}曲
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {lesson.teacher || '講師名なし'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {lesson.date ? formatDate(new Date(lesson.date)) : '日付なし'}
            </Text>
          </View>
        </View>
        
        {lesson.summary && (
          <Text 
            style={[styles.summary, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {lesson.summary}
          </Text>
        )}
        
        {lesson.tags && lesson.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {lesson.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
            {lesson.tags.length > 3 && (
              <Text style={[styles.moreTagsText, { color: colors.textSecondary }]}>
                +{lesson.tags.length - 3}
              </Text>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  infoContainer: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 6,
  },
  summary: {
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  moreTagsText: {
    fontSize: 14,
    alignSelf: 'center',
  },
  piecesContainer: {
    marginBottom: 8,
  },
  additionalPiece: {
    fontSize: 14,
    marginBottom: 2,
  },
  morePiecesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
