import { uploadAudioFile } from './storage';
import { transcribeAudio, generateSummary, extractTags } from './openai';
import { useLessonStore } from '../store/lessons';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

// Process audio file: upload, transcribe, summarize, and save to Firestore
export const processAudioFile = async (fileUri: string, lessonData: any) => {
  try {
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileName = `lesson_${timestamp}.m4a`;

    // Step 1: Upload the audio file to Firebase Storage
    const uploadResult = await uploadAudioFile(fileUri, fileName);

    if (!uploadResult.success) {
      throw new Error('Failed to upload audio file');
    }

    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Step 2: Create a new lesson record in Firestore
    const { addLesson } = useLessonStore.getState();

    const lessonRecord = {
      ...lessonData,
      audio_url: uploadResult.url,
      audio_path: uploadResult.path,
      status: 'processing',
      user_id: user.uid,
      created_at: serverTimestamp(),
    };

    const lessonDocRef = await addDoc(collection(db, "lessons"), lessonRecord);

    // Step 3: Start the transcription process
    // Step 3a: Transcribe the audio
    const transcriptionResult = await transcribeAudio(uploadResult.path);

    if (!transcriptionResult.success) {
      await updateLessonStatus(lessonDocRef.id, 'error', 'Transcription failed');
      throw new Error('Failed to transcribe audio');
    }

    // Step 3b: Generate a summary from the transcription
    const summaryResult = await generateSummary(transcriptionResult.text);

    if (!summaryResult.success) {
      await updateLessonStatus(lessonDocRef.id, 'error', 'Summary generation failed');
      throw new Error('Failed to generate summary');
    }

    // Step 3c: Extract tags from the transcription
    const tagsResult = await extractTags(transcriptionResult.text);

    let tags = lessonData.tags || [];
    if (tagsResult.success) {
      tags = [...new Set([...tags, ...tagsResult.tags])]; // Combine and deduplicate tags
    }

    // Step 4: Update the lesson record with the transcription, summary, and tags
    await updateLessonWithAIResults(
      lessonDocRef.id, 
      transcriptionResult.text, 
      summaryResult.summary,
      tags
    );

    // Return the processed lesson data
    return {
      success: true,
      lessonId: lessonDocRef.id,
      transcription: transcriptionResult.text,
      summary: summaryResult.summary,
      tags,
    };
  } catch (error) {
    console.error('Error processing audio file:', error);
    return { success: false, error };
  }
};

// Update lesson with transcription and summary in Firestore
const updateLessonWithAIResults = async (lessonId, transcription, summary, tags) => {
  try {
    const lessonRef = doc(db, "lessons", lessonId);
    await updateDoc(lessonRef, {
      transcription,
      summary,
      tags,
      status: 'completed',
      updated_at: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating lesson with AI results:', error);
    return { success: false, error };
  }
};

// Update lesson status (e.g., to 'error' if processing fails)
const updateLessonStatus = async (lessonId, status, errorMessage = null) => {
  try {
    const updateData = {
      status,
      updated_at: serverTimestamp(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const lessonRef = doc(db, "lessons", lessonId);
    await updateDoc(lessonRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating lesson status:', error);
    return { success: false, error };
  }
};

// Record audio and process it
export const recordAndProcessAudio = async (recordingUri: string, lessonData: any) => {
  try {
    return await processAudioFile(recordingUri, lessonData);
  } catch (error) {
    console.error('Error processing recording:', error);
    return { success: false, error };
  }
};