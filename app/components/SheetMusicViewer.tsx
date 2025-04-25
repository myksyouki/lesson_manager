import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface SheetMusicViewerProps {
  url: string | null;
}

const SheetMusicViewer = ({ url }: SheetMusicViewerProps) => {
  if (!url) return null;
  
  console.log('楽譜URL:', url);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>楽譜</Text>
      <Image 
        source={{ uri: url }} 
        style={styles.image}
        resizeMode="contain"
        onLoad={() => console.log('楽譜画像が読み込まれました')}
        onError={(error) => console.error('楽譜画像読み込みエラー:', error.nativeEvent.error)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 300,
    marginVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  }
});

export default SheetMusicViewer; 