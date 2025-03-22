/**
 * 楽器別知識ベース管理モジュール
 */

import * as admin from 'firebase-admin';

/**
 * 楽器ナレッジベースの型定義
 */
export interface InstrumentKnowledge {
  id: string;
  instrument: string;
  content: string;
  updatedAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

/**
 * 楽器の知識ベースを取得する
 * @param instrumentId 楽器ID（または楽器名）
 * @returns 楽器の知識ベース情報
 */
export async function getInstrumentKnowledge(instrumentId: string): Promise<InstrumentKnowledge | null> {
  try {
    // 楽器名に基づいて正規化されたIDを作成
    const normalizedId = instrumentId.toLowerCase().trim().replace(/\s+/g, '-');
    
    // Firestoreから楽器の知識ベースを取得
    const db = admin.firestore();
    const knowledgeDoc = await db.collection('knowledgeBase').doc(normalizedId).get();
    
    if (!knowledgeDoc.exists) {
      // 正確なIDで見つからない場合、楽器名で検索
      const querySnapshot = await db.collection('knowledgeBase')
        .where('instrument', '==', instrumentId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        console.log(`楽器「${instrumentId}」の知識ベースが見つかりません`);
        return null;
      }
      
      const data = querySnapshot.docs[0].data() as InstrumentKnowledge;
      return data;
    }
    
    const data = knowledgeDoc.data() as InstrumentKnowledge;
    return data;
  } catch (error) {
    console.error(`楽器の知識ベース取得エラー:`, error);
    throw new Error(`楽器「${instrumentId}」の知識ベースの取得中にエラーが発生しました`);
  }
} 