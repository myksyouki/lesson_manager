import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        stopRecording();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        setError('マイクの使用許可が必要です');
        return false;
      }
      
      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setRecordingStatus('recording');
      setDuration(0);
      
      // Start duration timer
      const interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      
      // Store interval ID in recording object for cleanup
      (recording as any)._durationInterval = interval;
      
      return true;
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('録音の開始に失敗しました');
      return false;
    }
  };

  const pauseRecording = async () => {
    if (!recording) return false;
    
    try {
      await recording.pauseAsync();
      setRecordingStatus('paused');
      
      // Clear duration interval
      clearInterval((recording as any)._durationInterval);
      
      return true;
    } catch (err) {
      console.error('Failed to pause recording', err);
      setError('録音の一時停止に失敗しました');
      return false;
    }
  };

  const resumeRecording = async () => {
    if (!recording) return false;
    
    try {
      await recording.startAsync();
      setRecordingStatus('recording');
      
      // Restart duration timer
      const interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      
      // Store interval ID in recording object for cleanup
      (recording as any)._durationInterval = interval;
      
      return true;
    } catch (err) {
      console.error('Failed to resume recording', err);
      setError('録音の再開に失敗しました');
      return false;
    }
  };

  const stopRecording = async () => {
    if (!recording) return false;
    
    try {
      // Clear duration interval
      clearInterval((recording as any)._durationInterval);
      
      await recording.stopAndUnloadAsync();
      
      // Get recording URI
      const uri = recording.getURI();
      setAudioUri(uri);
      
      // Reset recording state
      setRecording(null);
      setRecordingStatus('idle');
      
      return uri;
    } catch (err) {
      console.error('Failed to stop recording', err);
      setError('録音の停止に失敗しました');
      return false;
    }
  };

  const resetRecording = () => {
    setAudioUri(null);
    setDuration(0);
    setError(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    recording,
    recordingStatus,
    audioUri,
    duration,
    formattedDuration: formatDuration(duration),
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
};