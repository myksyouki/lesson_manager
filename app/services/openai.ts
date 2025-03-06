import OpenAI from 'openai';
import { storage } from '../config/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, API calls should be made from a secure backend
});

// Transcribe audio using Whisper API
export const transcribeAudio = async (audioPath: string) => {
  try {
    // Get the file URL from Firebase Storage
    const audioRef = ref(storage, audioPath);
    const publicUrl = await getDownloadURL(audioRef);
    
    if (!publicUrl) {
      throw new Error('Failed to get audio file URL');
    }

    // Fetch the audio file
    const audioFile = await fetchAudioFile(publicUrl);

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja', // Japanese language
    });

    return { success: true, text: transcription.text };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return { success: false, error };
  }
};

// Helper function to fetch audio file as a File object
const fetchAudioFile = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], 'audio.mp3', { type: 'audio/mp3' });
};

// Generate summary using OpenAI API
export const generateSummary = async (transcription: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `あなたは音楽レッスンの内容を分析し、要約するAIアシスタントです。
          以下の文字起こしから、レッスンの重要なポイントを抽出し、簡潔にまとめてください。
          特に以下の点に注目してください：
          1. 技術的な指導内容（リズム、指使い、表現など）
          2. 先生からの具体的なアドバイス
          3. 次回までの練習課題
          4. 曲の解釈や音楽的な表現に関するコメント
          
          要約は箇条書きではなく、段落形式で300字程度にまとめてください。`
        },
        {
          role: 'user',
          content: transcription
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return { 
      success: true, 
      summary: response.choices[0].message.content 
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return { success: false, error };
  }
};

// Extract tags from transcription
export const extractTags = async (transcription: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `あなたは音楽レッスンの内容からキーワードを抽出するAIアシスタントです。
          以下の文字起こしから、レッスンの内容に関連するタグを5つ以内で抽出してください。
          
          タグの候補：リズム、テクニック、表現、ペダル、音色、強弱、アーティキュレーション、フレージング、和声、調性、形式、歴史、解釈
          
          タグはカンマ区切りのリストとして返してください。例：「リズム,表現,ペダル」`
        },
        {
          role: 'user',
          content: transcription
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const tagsString = response.choices[0].message.content;
    const tags = tagsString.split(',').map(tag => tag.trim());

    return { success: true, tags };
  } catch (error) {
    console.error('Error extracting tags:', error);
    return { success: false, error };
  }
};

// Test OpenAI connection
export const testOpenAIConnection = async () => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Hello, are you connected?'
        }
      ],
      max_tokens: 50,
    });

    return { 
      success: true, 
      message: response.choices[0].message.content,
      model: response.model
    };
  } catch (error) {
    console.error('Error testing OpenAI connection:', error);
    return { success: false, error };
  }
};