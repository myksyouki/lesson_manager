import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import ListHeader from '../features/lessons/components/list/ListHeader';
import LessonCard from '../features/lessons/components/list/LessonCard';
import { Lesson } from '../store/lessons';

export default function LessonsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ['リズム', 'テクニック', '表現', 'ペダル', '音色', '強弱'];
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Firestoreからのリアルタイム更新を監視
  useEffect(() => {
    if (!auth.currentUser) return;

    console.log('レッスン一覧: リアルタイム監視を開始します');
    
    const lessonsRef = collection(db, 'lessons');
    // user_idフィールドを使用したクエリを作成
    const userId = auth.currentUser.uid;
    const q = query(lessonsRef, where('user_id', '==', userId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const lessonsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          teacher: data.teacher || data.teacherName || '',
          date: data.date || '',
          piece: data.piece || '',
          pieces: data.pieces || [],
          summary: data.summary || '',
          notes: data.notes || '',
          tags: data.tags || [],
          user_id: data.user_id || data.userId || '',
          audioUrl: data.audioUrl || data.audio_url || null,
          transcription: data.transcription || '',
          status: data.status || '',
          isFavorite: data.isFavorite || false,
          isDeleted: data.isDeleted || false,
          processingId: data.processingId || '',
          created_at: data.created_at || data.createdAt || new Date(),
          updated_at: data.updated_at || data.updatedAt || new Date(),
        };
      });
      
      // 削除されたレッスンをフィルタリング
      const filteredLessons = lessonsList.filter(lesson => !lesson.isDeleted);
      
      console.log(`レッスン一覧: ${filteredLessons.length}件のレッスンを更新しました`);
      setLessons(filteredLessons);
      setIsLoading(false);
    });
    
    return () => {
      console.log('レッスン一覧: リアルタイム監視を終了します');
      unsubscribe();
    };
  }, [auth.currentUser?.uid]);

  const handleTagPress = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      searchText === '' ||
      lesson.teacher.includes(searchText) ||
      (lesson.pieces && lesson.pieces.some(piece => piece.includes(searchText))) ||
      lesson.summary.includes(searchText);

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => lesson.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ListHeader
          searchText={searchText}
          onSearchChange={setSearchText}
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagPress={handleTagPress}
        />

        <ScrollView style={styles.lessonList}>
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              id={lesson.id}
              teacher={lesson.teacher}
              date={lesson.date}
              pieces={lesson.pieces || []}
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
  lessonList: {
    flex: 1,
    padding: 20,
  },
});