import { transcribeAudio, generateSummary, extractTags } from './openai';
import { db } from '../config/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * This file contains functions that would ideally be run on a server.
 * In a production environment, these would be implemented as Firebase Cloud Functions
 * or another serverless solution to keep API keys secure and handle heavy processing.
 */

// Process an audio file that has been uploaded to Firebase Storage
export const processAudioServerSide = async (lessonId: string, audioPath: string) => {
  try {
    // Update lesson status to processing
    await updateLessonStatus(lessonId, 'processing');
    
    // Step 1: Transcribe the audio
    const transcriptionResult = await transcribeAudio(audioPath);
    
    if (!transcriptionResult.success) {
      await updateLessonStatus(lessonId, 'error', 'Transcription failed');
      return { success: false, error: 'Transcription failed' };
    }
    
    // Step 2: Generate a summary from the transcription
    const summaryResult = await generateSummary(transcriptionResult.text);
    
    if (!summaryResult.success) {
      await updateLessonStatus(lessonId, 'error', 'Summary generation failed');
      return { success: false, error: 'Summary generation failed' };
    }
    
    // Step 3: Extract tags from the transcription
    const tagsResult = await extractTags(transcriptionResult.text);
    
    let tags = [];
    if (tagsResult.success) {
      tags = tagsResult.tags;
    }
    
    // Step 4: Update the lesson record in Firestore
    await updateLessonWithAIResults(lessonId, transcriptionResult.text, summaryResult.summary, tags);
    
    return {
      success: true,
      transcription: transcriptionResult.text,
      summary: summaryResult.summary,
      tags,
    };
  } catch (error) {
    console.error('Error in processAudioServerSide:', error);
    await updateLessonStatus(lessonId, 'error', 'Processing failed');
    return { success: false, error };
  }
};

// Update lesson with transcription, summary, and tags in Firestore
const updateLessonWithAIResults = async (lessonId: string, transcription: string, summary: string, tags: string[]) => {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
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

// Update lesson status (e.g., "processing", "error")
const updateLessonStatus = async (lessonId: string, status: string, errorMessage?: string) => {
  try {
    const updateData: any = {
      status,
      updated_at: serverTimestamp(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating lesson status:', error);
    return { success: false, error };
  }
};

// Create a webhook handler for Firebase Storage events
// This would be implemented as a Firebase Cloud Function in production
export const handleStorageWebhook = async (event: any) => {
  try {
    // Firebase Storage event format:
    // {
    //   "bucket": "lesson-manager.appspot.com",
    //   "name": "audio/user-id/filename.m4a",
    //   "contentType": "audio/m4a",
    //   "metadata": {
    //     "lesson_id": "lesson-id"
    //   }
    // }

    const audioPath = event.name;
    const lessonId = event.metadata?.lesson_id;

    if (!lessonId) {
      return { success: false, error: 'No lesson ID in metadata' };
    }

    // Process the audio file
    return await processAudioServerSide(lessonId, audioPath);
  } catch (error) {
    console.error('Error in handleStorageWebhook:', error);
    return { success: false, error };
  }
};