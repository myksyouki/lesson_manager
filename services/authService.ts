import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

export const login = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (email: string, password: string) => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    return await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// 再認証用の関数（アカウント削除前に必要）
export const reauthenticate = async (password: string) => {
  try {
    // パスワードが空の場合は再認証をスキップ
    if (!password) {
      console.log('パスワードが空なので再認証をスキップします');
      return true;
    }
    
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('ユーザーが見つかりません');
    }
    
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (error) {
    console.error('再認証エラー:', error);
    throw error;
  }
};

// アカウント削除予約
export const scheduleAccountDeletion = async () => {
  try {
    console.log('アカウント削除予約処理開始...');
    const user = auth.currentUser;
    
    if (!user) {
      console.error('ユーザーが見つかりません');
      throw new Error('ユーザーが見つかりません');
    }
    
    console.log(`現在のユーザー: ${user.uid}`);
    
    // 削除予定日を設定（現在から30日後）
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);
    console.log(`削除予定日: ${deletionDate.toISOString()}`);
    
    // Firestoreに削除予約情報を保存
    try {
      // 明示的にユーザーIDを指定してドキュメント参照を作成
      const deletionRef = doc(db, 'accountDeletions', user.uid);
      console.log(`ドキュメント参照を作成: ${deletionRef.path}`);
      
      // リトライロジックを追加
      let retryCount = 0;
      const maxRetries = 3;
      
      const attemptSetDoc = async () => {
        try {
          await setDoc(deletionRef, {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            scheduledForDeletion: Timestamp.fromDate(deletionDate),
            createdAt: Timestamp.now()
          });
          console.log('削除予約データを正常に保存しました');
          return true;
        } catch (err) {
          retryCount++;
          console.warn(`ドキュメント保存エラー (試行 ${retryCount}/${maxRetries}):`, err);
          
          if (retryCount >= maxRetries) {
            throw err;
          }
          
          // 少し待ってから再試行
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptSetDoc();
        }
      };
      
      await attemptSetDoc();
    } catch (firestoreError) {
      console.error('Firestore書き込みエラー:', firestoreError);
      throw firestoreError;
    }
    
    return {
      scheduledForDeletion: deletionDate
    };
  } catch (error) {
    console.error('アカウント削除予約エラー:', error);
    throw error;
  }
};

// 削除予約をキャンセル
export const cancelAccountDeletion = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }
    
    // 削除予約情報を削除
    const deletionRef = doc(db, 'accountDeletions', user.uid);
    await deleteDoc(deletionRef);
    
    return true;
  } catch (error) {
    console.error('削除予約キャンセルエラー:', error);
    throw error;
  }
};

// 削除予約情報を取得
export const getAccountDeletionStatus = async (userId?: string) => {
  try {
    console.log('削除予約ステータス取得開始...');
    
    // 明示的にユーザー情報をログ出力
    console.log(`指定されたユーザーID: ${userId || 'なし'}`);
    console.log(`現在のユーザー: ${auth.currentUser?.uid || 'ログインなし'}`);
    
    const user = userId ? { uid: userId } : auth.currentUser;
    if (!user) {
      console.error('ユーザーが見つかりません');
      return {
        isScheduledForDeletion: false,
        scheduledForDeletion: null,
        remainingDays: 0,
        error: new Error('ユーザーが見つかりません')
      };
    }
    
    console.log(`ステータス確認するユーザー: ${user.uid}`);
    
    try {
      const deletionRef = doc(db, 'accountDeletions', user.uid);
      console.log(`アクセスするドキュメント: ${deletionRef.path}`);
      
      const deletionDoc = await getDoc(deletionRef);
      console.log(`ドキュメント存在: ${deletionDoc.exists()}`);
      
      if (deletionDoc.exists()) {
        const data = deletionDoc.data();
        console.log('取得したデータ:', data);
        
        const scheduledDate = data.scheduledForDeletion.toDate();
        const remainingDays = Math.ceil(
          (scheduledDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        console.log(`削除予定日: ${scheduledDate.toISOString()}, 残り日数: ${remainingDays}`);
        
        return {
          isScheduledForDeletion: true,
          scheduledForDeletion: scheduledDate,
          remainingDays: remainingDays
        };
      } else {
        console.log('削除予約データはありません');
        return {
          isScheduledForDeletion: false,
          scheduledForDeletion: null,
          remainingDays: 0
        };
      }
    } catch (docError) {
      console.error('ドキュメント取得エラー:', docError);
      return {
        isScheduledForDeletion: false,
        scheduledForDeletion: null,
        remainingDays: 0,
        error: docError
      };
    }
  } catch (error) {
    console.error('削除予約ステータス取得エラー:', error);
    return {
      isScheduledForDeletion: false,
      scheduledForDeletion: null,
      remainingDays: 0,
      error: error
    };
  }
};

// ユーザーデータの匿名化処理
const anonymizeUserData = async (userId: string) => {
  try {
    console.log('ユーザーデータの匿名化を開始:', userId);
    
    // 匿名化IDを生成（再特定を防ぐためランダムなID）
    const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // バッチ処理の準備
    const batch = writeBatch(db);
    
    // 1. チャットルームとメッセージの匿名化
    const chatRoomsRef = collection(db, `users/${userId}/chatRooms`);
    const chatRoomsSnapshot = await getDocs(chatRoomsRef);
    
    console.log(`チャットルーム数: ${chatRoomsSnapshot.size}`);
    
    for (const chatDoc of chatRoomsSnapshot.docs) {
      // チャットルーム自体を匿名化
      batch.update(chatDoc.ref, {
        userId: anonymousId,
        userEmail: 'anonymous@example.com',
        anonymized: true,
        anonymizedAt: Timestamp.now(),
        // チャット内容自体は維持
      });
      
      // チャットルーム内のメッセージも確認
      const messagesRef = collection(chatDoc.ref, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      for (const msgDoc of messagesSnapshot.docs) {
        // 個人情報を含む可能性のあるフィールドを匿名化
        batch.update(msgDoc.ref, {
          userId: anonymousId,
          userEmail: 'anonymous@example.com',
          anonymized: true,
          // メッセージ内容自体は維持
        });
      }
    }
    
    // 2. レッスンデータの匿名化
    const lessonsRef = collection(db, `users/${userId}/lessons`);
    const lessonsSnapshot = await getDocs(lessonsRef);
    
    console.log(`レッスン数: ${lessonsSnapshot.size}`);
    
    for (const lessonDoc of lessonsSnapshot.docs) {
      batch.update(lessonDoc.ref, {
        user_id: anonymousId,
        teacherName: '匿名講師', // 講師名も匿名化
        anonymized: true,
        anonymizedAt: Timestamp.now(),
        // レッスン内容、文字起こし、要約などは保持
      });
    }
    
    // 3. プロフィール情報を削除（匿名化せず完全削除）
    const profileRef = doc(db, `users/${userId}/profile`, 'main');
    batch.delete(profileRef);
    
    // 4. ユーザードキュメント自体を更新
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      batch.update(userRef, {
        email: 'anonymous@example.com',
        displayName: '削除済みユーザー',
        anonymized: true,
        anonymizedAt: Timestamp.now(),
        originalUserId: userId, // 内部参照用に元のIDを保持
      });
    }
    
    // バッチ処理を実行
    await batch.commit();
    console.log('ユーザーデータの匿名化が完了しました');
    
    return { success: true, anonymousId };
  } catch (error) {
    console.error('データ匿名化エラー:', error);
    throw new Error('ユーザーデータの匿名化に失敗しました');
  }
};

// 即時アカウント削除関数（管理者用または30日経過後に使用）
export const deleteAccount = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }
    
    // 削除予約情報があれば削除
    try {
      const deletionRef = doc(db, 'accountDeletions', user.uid);
      await deleteDoc(deletionRef);
    } catch (e) {
      console.log('削除予約情報がないか、削除に失敗しました:', e);
    }
    
    // データの匿名化処理を実行
    await anonymizeUserData(user.uid);
    
    // アカウントを削除
    await deleteUser(user);
    return true;
  } catch (error) {
    console.error('アカウント削除エラー:', error);
    throw error;
  }
}; 