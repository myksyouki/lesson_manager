import { Platform } from 'react-native';
import { Timestamp } from 'firebase/firestore';

// レッスンのインターフェース
export interface Lesson {
  id: string;
  title: string;
  date: Date;
  instrument: string;
  audioUrl?: string;
  transcription?: string;
  summary?: string;
  tags?: string[];
  summaryRequired: boolean;
  summaryInProgress: boolean;
  isArchived: boolean;
  isFavorite?: boolean;
  pieces?: string;
  notes?: string;
}

// 練習メニューのインターフェース
export interface PracticeMenu {
  id: string;
  title: string;
  description: string;
  instrument: string;
  duration: number;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    duration: number;
    orderIndex: number;
  }>;
  category?: string;
  difficulty?: string;
  tags?: string[];
}

// チャットルームのインターフェース
export interface ChatRoom {
  id: string;
  title: string;
  lastMessageTime?: Date;
  isArchived?: boolean;
}

// チャットメッセージのインターフェース
export interface Chat {
  id: string;
  roomId: string;
  text: string;
  isUser: boolean;
  createdAt: Date;
}

// デモモード用のサンプルレッスンデータ
const sampleLessons: Lesson[] = [
  {
    id: "demo-lesson-1",
    title: "ショパン ノクターン第2番 練習",
    date: new Date(2023, 10, 15),
    instrument: "ピアノ",
    audioUrl: "",
    transcription: "今日はショパンのノクターン第2番の練習に焦点を当てました。左手のアルペジオが特に重要で、流れるような演奏を心がけるべきです。ペダリングについても詳しく解説がありました。特に小節の変わり目でのペダルの踏み替えを意識して練習しましょう。",
    summary: "ショパンのノクターン第2番の練習。左手のアルペジオと適切なペダリングの技術に焦点を当てました。",
    tags: ["ピアノ", "クラシック", "ショパン"],
    summaryRequired: false,
    summaryInProgress: false,
    isArchived: false,
    isFavorite: true,
    pieces: "ショパン ノクターン第2番 変ホ長調",
    notes: "次回までに冒頭から16小節目までを暗譜する"
  },
  {
    id: "demo-lesson-2",
    title: "ジャズ即興演奏の基礎",
    date: new Date(2023, 9, 28),
    instrument: "サックス",
    audioUrl: "",
    transcription: "今日はII-V-Iのコード進行を使った即興演奏練習をしました。ミクソリディアンとドリアンのスケールを使い分けることが重要です。リズムのバリエーションも増やしていけるとより表現の幅が広がります。スケール練習は毎日15分行い、異なるテンポで練習することをおすすめします。",
    summary: "ジャズの即興演奏について、II-V-Iコード進行を用いた練習方法を学びました。適切なスケールの選択とリズムのバリエーションの重要性について説明がありました。",
    tags: ["サックス", "ジャズ", "即興演奏"],
    summaryRequired: false,
    summaryInProgress: false,
    isArchived: false,
    isFavorite: false,
    pieces: "Autumn Leaves, All The Things You Are",
    notes: "スケール練習を毎日継続すること"
  },
  {
    id: "demo-lesson-3",
    title: "ボーカルトレーニング:呼吸法と発声",
    date: new Date(2023, 11, 5),
    instrument: "ボーカル",
    audioUrl: "",
    transcription: "横隔膜を意識した深い呼吸を練習しました。声を出す前に適切な姿勢と呼吸を確立することが大切です。高音域への移行では、ファルセットへの切り替えをスムーズに行うための練習も行いました。毎日のボイストレーニングとして、5音スケールを上下する練習を10分間行うと良いでしょう。",
    summary: "ボーカルトレーニングでは、正しい呼吸法と発声テクニックを学びました。特に横隔膜を使った深い呼吸と、高音域へのスムーズな移行方法についての指導がありました。",
    tags: ["ボーカル", "呼吸法", "発声"],
    summaryRequired: false,
    summaryInProgress: false,
    isArchived: false,
    isFavorite: true,
    pieces: "",
    notes: "毎日のボイストレーニングを続けること"
  }
];

// デモモード用の練習メニューデータ
const samplePracticeMenus: PracticeMenu[] = [
  {
    id: "demo-practice-1",
    title: "ピアノ基礎練習プログラム",
    description: "指の独立性と基本テクニックを強化するための総合的な練習メニューです",
    steps: [
      {
        id: "step-1-1",
        title: "ハノン練習",
        description: "ハノン練習曲1-5番を各3回ずつ、テンポを少しずつ上げながら練習します",
        duration: 15,
        orderIndex: 1
      },
      {
        id: "step-1-2",
        title: "スケール練習",
        description: "長調・短調のスケールを4オクターブで練習。特にハ長調、イ短調、ト長調、ホ短調を重点的に",
        duration: 15,
        orderIndex: 2
      },
      {
        id: "step-1-3",
        title: "アルペジオ練習",
        description: "主要コードのアルペジオを両手で練習。リズムとテンポを変えて繰り返し練習",
        duration: 15,
        orderIndex: 3
      }
    ],
    instrument: "ピアノ",
    duration: 45,
    category: "基礎練習",
    difficulty: "中級",
    tags: ["ピアノ", "テクニック", "基礎練習"]
  },
  {
    id: "demo-practice-2",
    title: "サックス音色改善プログラム",
    description: "音質と表現力を向上させるための練習メニュー",
    steps: [
      {
        id: "step-2-1",
        title: "ロングトーン練習",
        description: "各音を8カウントずつ、ダイナミクスを変えながら保持する練習",
        duration: 15,
        orderIndex: 1
      },
      {
        id: "step-2-2",
        title: "タンギング練習",
        description: "シングル・ダブル・トリプルタンギングの基本練習とその応用",
        duration: 20,
        orderIndex: 2
      },
      {
        id: "step-2-3",
        title: "表現練習",
        description: "同じフレーズを異なる感情や強弱をつけて演奏する練習",
        duration: 15,
        orderIndex: 3
      }
    ],
    instrument: "サックス",
    duration: 50,
    category: "音色改善",
    difficulty: "中級",
    tags: ["サックス", "音色", "表現力"]
  },
  {
    id: "demo-practice-3",
    title: "ボーカル呼吸法プログラム",
    description: "息のコントロールと持続力を向上させるための練習メニュー",
    steps: [
      {
        id: "step-3-1",
        title: "横隔膜呼吸練習",
        description: "横隔膜を意識した深い呼吸を繰り返し練習",
        duration: 10,
        orderIndex: 1
      },
      {
        id: "step-3-2",
        title: "息のコントロール練習",
        description: "一定の音を長く均一に保つ練習と、強弱をつけて息を出す練習",
        duration: 10,
        orderIndex: 2
      },
      {
        id: "step-3-3",
        title: "フレージング練習",
        description: "曲の一部を使って、適切な箇所で息継ぎをする練習",
        duration: 10,
        orderIndex: 3
      }
    ],
    instrument: "ボーカル",
    duration: 30,
    category: "呼吸法",
    difficulty: "初級",
    tags: ["ボーカル", "呼吸法", "持続力"]
  }
];

// デモモード用のチャットメッセージ
const sampleChatMessages: Chat[] = [
  {
    id: "chat-1",
    roomId: "room-1",
    text: "効果的な練習方法についてアドバイスをいただけますか？限られた時間でも上達するためのコツを知りたいです。",
    isUser: true,
    createdAt: new Date(2023, 11, 10, 15, 30)
  },
  {
    id: "chat-2",
    roomId: "room-1",
    text: "効果的な練習のために、以下のポイントを意識してみてください：\n\n1. **質を量より重視する**：30分の集中した練習は、2時間の漫然とした練習より効果的です。\n\n2. **スモールステップで取り組む**：難しい部分は極めてゆっくりしたテンポから始め、少しずつ速くしていきましょう。\n\n3. **録音して客観的に聴く**：自分の演奏を録音して聴くことで、気づかなかった問題点が見えてきます。\n\n4. **目標を明確にする**：「今日はこの8小節をマスターする」など、具体的な目標を設定しましょう。\n\n5. **定期的な休憩**：20-25分練習したら5分休憩するポモドーロテクニックも効果的です。",
    isUser: false,
    createdAt: new Date(2023, 11, 10, 15, 32)
  },
  {
    id: "chat-3",
    roomId: "room-1",
    text: "初心者に適した曲はありますか？ピアノを始めたばかりですが、モチベーションを保てる曲を探しています。",
    isUser: true,
    createdAt: new Date(2023, 11, 11, 10, 15)
  },
  {
    id: "chat-4",
    roomId: "room-1",
    text: "ピアノ初心者の方におすすめの曲をいくつかご紹介します：\n\n1. **バッハ：ミニュエト ト長調** (アンナ・マグダレーナのための音楽帳より) - シンプルながらも美しいメロディを持つ曲です。\n\n2. **ブルグミュラー：25の練習曲** から「アラベスク」や「素直な心」 - 技術的にも音楽的にも学ぶところが多い曲です。\n\n3. **ショパン：ワルツ イ短調（遺作）** - 比較的取り組みやすいショパンの曲です。\n\n4. **シューマン：「子供の情景」**から「トロイメライ」 - テンポがゆっくりで美しい曲です。\n\n5. **ギロック：「叙情小曲集」**から - 現代的な響きで初心者に人気があります。\n\nこれらの曲は技術的に無理のない範囲で、それでいて音楽的な満足感が得られるものです。ご自身の好みや目標に合わせて選んでみてください。",
    isUser: false,
    createdAt: new Date(2023, 11, 11, 10, 18)
  },
  {
    id: "chat-5",
    roomId: "room-2",
    text: "練習時間の管理について悩んでいます。仕事の合間に効率よく練習する方法はありますか？",
    isUser: true,
    createdAt: new Date(2023, 11, 12, 18, 45)
  },
  {
    id: "chat-6",
    roomId: "room-2",
    text: "忙しい日常の中で効率よく練習するためのアドバイスです：\n\n1. **練習の細分化**：15-20分の短いセッションに分けて、隙間時間を活用しましょう。朝の準備前、昼休み、帰宅後など。\n\n2. **優先順位の明確化**：練習セッションごとに1-2つの焦点を決めておきましょう（例：午前は技術練習、夕方は表現練習）。\n\n3. **メンタル練習の活用**：通勤時間などに楽譜を頭の中でイメージする練習も効果的です。\n\n4. **週間計画の作成**：週の始めに練習スケジュールを立て、カレンダーに予定として組み込みましょう。\n\n5. **テクノロジーの活用**：練習アプリやタイマーを使って、短時間でも集中できる環境を作りましょう。\n\n質より量が重要なので、10分でも集中した練習は価値があります。無理のないペースで継続することが長期的な上達につながります。",
    isUser: false,
    createdAt: new Date(2023, 11, 12, 18, 50)
  }
];

// デモモード用のチャットルーム
const sampleChatRooms: ChatRoom[] = [
  {
    id: "room-1",
    title: "ピアノテクニック相談",
    lastMessageTime: new Date(2023, 11, 11, 10, 18),
    isArchived: false
  },
  {
    id: "room-2",
    title: "ショパン演奏のコツ",
    lastMessageTime: new Date(2023, 11, 12, 18, 50),
    isArchived: false
  }
];

// デモモード用のデフォルトデータを取得する関数
export const getDefaultDemoData = () => {
  return {
    lessons: sampleLessons,
    practiceMenus: samplePracticeMenus,
    chatRooms: sampleChatRooms,
    chatMessages: sampleChatMessages
  };
}; 