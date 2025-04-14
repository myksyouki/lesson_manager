import { db, auth } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ChatRoom } from '../services/chatRoomService';
import { Alert } from 'react-native';

/**
 * 古い構造のチャットルームデータを新しい構造に移行する
 * /chatRooms/{roomId} -> /users/{userId}/chatRooms/{roomId}
 */
export const migrateChatRoomsToNewStructure = async (): Promise<{
  success: boolean;
  migratedCount: number;
  errorCount: number;
  message: string;
}> => {
  try {
    // 現在のユーザーを取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        migratedCount: 0,
        errorCount: 0,
        message: 'ユーザーが認証されていません'
      };
    }

    console.log('チャットルームデータの移行を開始します...');

    // 古い構造のチャットルームを取得
    const chatRoomsRef = collection(db, 'chatRooms');
    const q = query(chatRoomsRef, where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('移行するチャットルームがありません');
      return {
        success: true,
        migratedCount: 0,
        errorCount: 0,
        message: '移行するチャットルームが見つかりませんでした'
      };
    }

    console.log(`${querySnapshot.size}件のチャットルームを移行します`);

    let migratedCount = 0;
    let errorCount = 0;

    // 新しい構造のコレクション参照
    const newChatRoomsRef = collection(db, `users/${currentUser.uid}/chatRooms`);

    // 各チャットルームを移行
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const chatRoomData = docSnapshot.data() as ChatRoom;
        const chatRoomId = docSnapshot.id;

        console.log(`移行中: ${chatRoomId} - ${chatRoomData.title}`);

        // 新しい構造にドキュメントをコピー
        const newDocRef = doc(newChatRoomsRef, chatRoomId);
        await setDoc(newDocRef, chatRoomData);

        // 古いドキュメントを削除（オプション）
        // コメントアウトすると、元のデータを保持
        // await deleteDoc(docSnapshot.ref);

        migratedCount++;
        console.log(`${chatRoomId} の移行が完了しました`);
      } catch (error) {
        console.error(`チャットルーム ${docSnapshot.id} の移行に失敗しました:`, error);
        errorCount++;
      }
    }

    const resultMessage = `移行完了: ${migratedCount}件成功, ${errorCount}件失敗`;
    console.log(resultMessage);

    return {
      success: migratedCount > 0,
      migratedCount,
      errorCount,
      message: resultMessage
    };
  } catch (error) {
    console.error('データ移行中にエラーが発生しました:', error);
    return {
      success: false,
      migratedCount: 0,
      errorCount: 1,
      message: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
    };
  }
};

/**
 * チャットルームデータの移行を実行し、結果を表示する
 */
export const runChatRoomMigration = async (): Promise<void> => {
  try {
    // 移行を実行
    const result = await migrateChatRoomsToNewStructure();

    if (result.success) {
      Alert.alert(
        'データ移行完了',
        `${result.migratedCount}件のチャットルームを新しい構造に移行しました。\n${result.errorCount}件の移行に失敗しました。`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '移行エラー',
        `チャットルームの移行に失敗しました: ${result.message}`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('移行処理の実行中にエラーが発生しました:', error);
    Alert.alert(
      'エラー',
      '移行処理の実行中にエラーが発生しました。詳細はコンソールを確認してください。',
      [{ text: 'OK' }]
    );
  }
};

/**
 * チャットルームが新しい構造に存在するか確認する
 */
export const checkChatRoomExists = async (roomId: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    // 新しい構造でのパス
    const chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    const chatRoomDoc = await getDoc(chatRoomRef);

    return chatRoomDoc.exists();
  } catch (error) {
    console.error('チャットルーム存在確認中にエラーが発生しました:', error);
    return false;
  }
};    