import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// PracticeMenu型定義（必要に応じて拡張可能）
export interface PracticeMenu {
  id: string;
  title: string;
  description: string;
  instrument: string;
  category: string;
  difficulty: number;
  duration: number;
  tags: string[];
  steps: Array<{ id: string; title: string; description: string; duration: number | string }>;
}

/**
 * FirestoreのpracticeMenusコレクションから練習メニューを取得して返却する
 */
export const getPracticeMenus = async (): Promise<PracticeMenu[]> => {
  const practiceMenus: PracticeMenu[] = [];
  try {
    // instrumentごとのドキュメントを取得
    const instrumentsSnapshot = await getDocs(collection(db, 'practiceMenus'));
    for (const instrumentDoc of instrumentsSnapshot.docs) {
      const instrumentId = instrumentDoc.id;
      // 各カテゴリを取得
      const categoriesSnapshot = await getDocs(
        collection(db, 'practiceMenus', instrumentId, 'categories')
      );
      for (const categoryDoc of categoriesSnapshot.docs) {
        const categoryId = categoryDoc.id;
        // 各メニューを取得
        const menusSnapshot = await getDocs(
          collection(db, 'practiceMenus', instrumentId, 'categories', categoryId, 'menus')
        );
        for (const menuDoc of menusSnapshot.docs) {
          const data = menuDoc.data() as any;
          practiceMenus.push({
            id: menuDoc.id,
            title: data.title || '',
            description: data.description || '',
            instrument: instrumentId,
            category: categoryId,
            difficulty: data.difficulty || 0,
            duration: data.estimatedDuration || 0,
            tags: data.tags || [],
            steps: data.steps || [],
          });
        }
      }
    }
  } catch (error) {
    console.error('練習メニューの取得エラー:', error);
    throw error;
  }
  return practiceMenus;
};