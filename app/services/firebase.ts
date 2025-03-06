// This file is kept for reference but is no longer used
// All functionality has been migrated to Supabase
// app/services/firebase.ts
import { auth, db, storage } from "../config/firebase";

export const checkFirebaseConnection = async () => {
  try {
    console.log("✅ Firebase Auth:", auth);
    console.log("✅ Firestore DB:", db);
    console.log("✅ Firebase Storage:", storage);
    return "Firebase is connected!";
  } catch (error) {
    console.error("❌ Firebase connection failed:", error);
    return "Firebase connection failed";
  }
};
/*
import { storage, db, auth } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Upload audio file to Firebase Storage
export const uploadAudioFile = async (uri: string, fileName: string) => {
  try {
    // For web, the uri is already a blob
    let blob;
    
    if (Platform.OS !== 'web') {
      // For native platforms, convert uri to blob
      const response = await fetch(uri);
      blob = await response.blob();
    } else {
      blob = uri;
    }

    // Create a storage reference
    const storageRef = ref(storage, `audio/${auth.currentUser?.uid}/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
  } catch (error) {
    console.error('Error uploading audio file:', error);
    return { success: false, error };
  }
};

// Create a new lesson record in Firestore
export const createLessonRecord = async (lessonData) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
    const lessonRef = await addDoc(collection(db, 'lessons'), {
      ...lessonData,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'processing', // Initial status while transcription and summary are being processed
    });
    
    return { success: true, id: lessonRef.id };
  } catch (error) {
    console.error('Error creating lesson record:', error);
    return { success: false, error };
  }
};

// Update lesson with transcription and summary
export const updateLessonWithAIResults = async (lessonId, transcription, summary) => {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    
    await updateDoc(lessonRef, {
      transcription,
      summary,
      status: 'completed',
      updatedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating lesson with AI results:', error);
    return { success: false, error };
  }
};

// Update lesson status (e.g., to 'error' if processing fails)
export const updateLessonStatus = async (lessonId, status, errorMessage = null) => {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    
    await updateDoc(lessonRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating lesson status:', error);
    return { success: false, error };
  }
};
*/