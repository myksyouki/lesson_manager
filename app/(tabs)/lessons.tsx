import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLessonStore } from '../store/lessons';
import LessonCard from '../components/LessonCard';

export default function LessonsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ['リズム', 'テクニック', '表現', 'ペダル', '音色', '強弱'];
  const { lessons } = useLessonStore();

  const handleTagPress = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      searchText === '' ||
      lesson.teacher.includes(searchText) ||
      lesson.piece.includes(searchText) ||
      lesson.summary.includes(searchText);

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => lesson.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>レッスン一覧</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="レッスンを検索"
              placeholderTextColor="#8E8E93"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagScrollView}
            contentContainerStyle={styles.tagScrollContent}>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                onPress={() => handleTagPress(tag)}>
                <Text
                  style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.tagTextSelected,
                  ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.lessonList}>
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              id={lesson.id}
              teacher={lesson.teacher}
              date={lesson.date}
              piece={lesson.piece}
              tags={lesson.tags}
              isFavorite={lesson.isFavorite}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 30, // Larger title
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12, // Increased border radius
    paddingHorizontal: 14,
    height: 48, // Increased height for better touch target
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 17, // Larger font size
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagScrollView: {
    marginBottom: 16,
  },
  tagScrollContent: {
    paddingRight: 20,
  },
  tag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 18, // Increased border radius
    paddingVertical: 8, // Increased padding
    paddingHorizontal: 14, // Increased padding
    marginRight: 10,
  },
  tagSelected: {
    backgroundColor: '#1a73e8',
  },
  tagText: {
    fontSize: 15, // Larger font size
    color: '#5f6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagTextSelected: {
    color: '#ffffff',
  },
  lessonList: {
    padding: 20,
  },
});