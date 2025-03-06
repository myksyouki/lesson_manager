import { storage, auth } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Upload audio file to Firebase Storage
export const uploadAudioFile = async (uri: string, fileName: string) => {
  try {
    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate file path in Firebase Storage
    const filePath = `audio/${user.uid}/${fileName}`;
    const fileRef = ref(storage, filePath);

    // Convert file to blob
    let blob;
    if (Platform.OS !== 'web') {
      const response = await fetch(uri);
      blob = await response.blob();
    } else {
      blob = uri as unknown as Blob;
    }

    // Upload the file to Firebase Storage
    await uploadBytes(fileRef, blob);

    // Get the public URL
    const publicUrl = await getDownloadURL(fileRef);

    return { success: true, url: publicUrl, path: filePath };
  } catch (error) {
    console.error('Error uploading audio file:', error);
    return { success: false, error };
  }
};

// Get a public URL for a file in Firebase Storage
export const getPublicUrl = async (path: string) => {
  try {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    console.error('Error getting file URL:', error);
    return null;
  }
};

// Delete a file from Firebase Storage
export const deleteFile = async (path: string) => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error };
  }
};