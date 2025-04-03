// This file contains webhook handlers that would be implemented as Firebase Cloud Functions
// in a production environment. These functions demonstrate how to process audio files
// on the server side when they are uploaded to Firebase Storage.

import { db } from '../app/config/firebase';
import { transcribeAudio, generateSummary, extractTags } from './openai';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Example webhook handler for storage events
export const handleStorageWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Validate the event
    if (!event || !event.name || !event.metadata) {
      return res.status(400).json({ error: 'Invalid event' });
    }

    // Extract file path and metadata
    const filePath = event.name;
    const metadata = event.metadata;
    const lessonId = metadata.lesson_id;

    if (!lessonId) {
      return res.status(400).json({ error: 'Missing lesson ID in metadata' });
    }

    // Update lesson status to processing
    await updateLessonStatus(lessonId, 'processing');

    // Process the audio file
    const result = await processAudioFile(filePath, lessonId);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Process an audio file that has been uploaded to Firebase Storage
const processAudioFile = async (filePath, lessonId) => {
  try {
    // Step 1: Transcribe the audio
    const transcriptionResult = await transcribeAudio(filePath);

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

    // Step 4: Update the lesson record with the results in Firestore
    await updateLessonWithAIResults(lessonId, transcriptionResult.text, summaryResult.summary, tags);

    return {
      success: true,
      transcription: transcriptionResult.text,
      summary: summaryResult.summary,
      tags,
    };
  } catch (error) {
    console.error('Error processing audio file:', error);
    await updateLessonStatus(lessonId, 'error', 'Processing failed');
    return { success: false, error: error.message };
  }
};

// Update lesson with transcription, summary, and tags in Firestore
const updateLessonWithAIResults = async (lessonId, transcription, summary, tags) => {
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

// Update lesson status in Firestore
const updateLessonStatus = async (lessonId, status, errorMessage = null) => {
  try {
    const updateData = {
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