// app/services/firebase.ts
import { auth, db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import firebaseApp from "../config/firebase";

// Firebase Functionsの初期化 - 既に初期化されたアプリを使用
console.log('Firebase Functionsの初期化を開始...');
const functions = getFunctions(firebaseApp, "asia-northeast1");
console.log('Firebase Functions初期化完了:', !!functions);

// 開発環境の場合はエミュレータに接続
if (__DEV__) {
  try {
    // エミュレータは使用しない場合はコメントアウト
    // connectFunctionsEmulator(functions, "localhost", 5001);
    console.log('開発環境でのFirebase Functions設定完了');
  } catch (error) {
    console.warn('Firebase Functionsエミュレータ接続エラー:', error);
  }
}

// Functions参照テスト
try {
  const testFunction = httpsCallable(functions, "createTaskFromChat");
  console.log('createTaskFromChat関数の参照を取得できました:', !!testFunction);
} catch (error) {
  console.error('Functions参照テストエラー:', error);
}

// レッスンデータを取得するための関数
const getLessonDataFunction = httpsCallable(functions, "getLessonData");

export const checkFirebaseConnection = async () => {
  try {
    console.log("✅ Firebase Auth:", auth);
    console.log("✅ Firestore DB:", db);
    console.log("✅ Firebase Storage:", storage);
    console.log("✅ Firebase Functions:", functions);
    return "Firebase is connected!";
  } catch (error) {
    console.error("❌ Firebase connection failed:", error);
    return "Firebase connection failed";
  }
};

// Upload audio file to Firebase Storage
export const uploadAudioFile = async (uri: string, fileName: string) => {
  try {
    // For web, the uri is already a blob
    let blob: Blob;
    
    if (Platform.OS !== "web") {
      // For native platforms, convert uri to blob
      const response = await fetch(uri);
      blob = await response.blob();
    } else {
      // For web, uri should already be a Blob
      if (typeof uri === 'string') {
        // 文字列の場合は、Blobに変換する必要がある
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        // すでにBlobの場合は直接使用
        blob = uri as unknown as Blob;
      }
    }

    // Create a storage reference
    const storageRef = ref(storage, `audio/${auth.currentUser?.uid}/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
  } catch (error) {
    console.error("Error uploading audio file:", error);
    return { success: false, error };
  }
};

// Create a new lesson record in Firestore
/*
// この関数は現在使用されていません。lessonService.ts の saveLesson 関数を代わりに使用してください。
// 重複してドキュメントが作成される問題を防ぐため、この関数はコメントアウトされています。
export const createLessonRecord = async (lessonData: any) => {
  try {
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }
    
    const lessonRef = await addDoc(collection(db, "lessons"), {
      ...lessonData,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "processing", // Initial status while transcription and summary are being processed
    });
    
    return {
      success: true,
      lessonId: lessonRef.id
    };
  } catch (error) {
    console.error("Error creating lesson record:", error);
    return {
      success: false,
      error
    };
  }
};
*/

// Get lesson data including transcription and summary
export const getLessonData = async (lessonId: string) => {
  try {
    // Firebase Functionsを使用してレッスンデータを取得
    const result = await getLessonDataFunction({ lessonId });
    const data = result.data as any;
    
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.error || "Failed to get lesson data");
    }
  } catch (error) {
    console.error("Error getting lesson data:", error);
    
    // Functionsが失敗した場合は直接Firestoreから取得を試みる
    try {
      const lessonDoc = await getDoc(doc(db, "lessons", lessonId));
      if (lessonDoc.exists()) {
        return { success: true, data: lessonDoc.data() };
      } else {
        return { success: false, error: "Lesson not found" };
      }
    } catch (fbError) {
      console.error("Error getting lesson from Firestore:", fbError);
      return { success: false, error };
    }
  }
};

// Update lesson status (e.g., to "error" if processing fails)
export const updateLessonStatus = async (lessonId: string, status: string, errorMessage: string | null = null) => {
  try {
    const lessonRef = doc(db, "lessons", lessonId);
    
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
    console.error("Error updating lesson status:", error);
    return { success: false, error };
  }
};