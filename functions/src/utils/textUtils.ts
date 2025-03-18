import { openai } from "../config";

/**
 * OpenAI APIを使用してテキストを要約する関数
 * @param {string} text 要約するテキスト
 * @return {Promise<{summary: string, tags: string[]}>} 要約結果とタグ
 */
export async function summarizeTextWithOpenAI(text: string): Promise<{summary: string, tags: string[]}> {
  console.log("summarizeTextWithOpenAI関数が呼び出されました");
  try {
    // APIキーの状態を確認
    console.log("OpenAI API初期化状態:", {
      apiInitialized: openai ? "初期化済み" : "未初期化",
      apiKeyAvailable: process.env.OPENAI_API_KEY ? "利用可能" : "未設定"
    });
    
    if (!openai) {
      console.error("OpenAI APIが初期化されていません。APIキーの設定を確認してください。");
      console.error("環境変数:", {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "設定あり" : "未設定",
        FUNCTIONS_CONFIG_OPENAI_API_KEY: process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY ? "設定あり" : "未設定",
        FUNCTIONS_CONFIG_OPENAI_APIKEY: process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY ? "設定あり" : "未設定"
      });
      return {
        summary: "OpenAI APIが利用できないため、要約できませんでした。",
        tags: ["レッスン", "音楽", "練習", "技術", "表現"],
      };
    }

    // 空のテキストやごく短いテキストの場合はデフォルト値を返す
    if (!text || text.trim().length < 10) {
      console.log("テキストがないか非常に短いため、デフォルトの要約とタグを返します。");
      return {
        summary: "テキストが不足しているため、要約できませんでした。",
        tags: ["レッスン", "音楽", "練習", "基礎練習", "演奏技術"],
      };
    }

    console.log("テキスト要約を開始します（文字数: " + text.length + "）");

    // 要約用のプロンプト
    const summaryPrompt = `
    以下は楽器レッスンの文字起こしデータです。この内容を学習者が振り返りやすいように、セクションごとに整理し、指摘内容・課題・練習アドバイスを詳細にまとめてください。
    ※セクションが明確でない場合は、内容の流れから区切りを推定し、「セクション1」「セクション2」など番号で整理してください。

    【要件】
    - レッスンの内容をセクション単位（例：基礎練習、エチュード、曲名ごと）で分けて要約してください。
    - 各セクションで「指摘内容」「今後の課題」「練習アドバイス」の3つを明確に分類してください。
    - 雑談や無関係な話題は省き、重要な部分に焦点を当ててください。
    - 各セクションは必ず300字以上で記述し、具体的な指摘内容と練習方法を詳細に含めてください。
    - 最低でも全体で1000字以上の要約を作成してください。

    【フォーマット（例）】

    ■ セクション1：基礎練習（ロングトーン・スケール）
    1. 指摘内容：
    - ロングトーンで音の立ち上がりが不安定。音の始まりに雑音が入りやすい傾向がある。
    - スケール練習で音程が上下でぶれる傾向あり。特に高音域での音程の不安定さが目立つ。
    - 音色にムラがあり、一定の音質を保てていない箇所がある。

    2. 今後の課題：
    - ロングトーンで音の安定感を意識する。特に音の立ち上がり部分での安定したアタックを習得する。
    - スケール練習を一定のテンポで確実に行い、全ての音域で均等な音質を目指す。
    - 呼吸の仕方や姿勢を意識して、安定した音色を作れるようにする。

    3. 練習アドバイス：
    - メトロノームを使って、ロングトーンを1音ずつ丁寧に練習する。特に音の立ち上がりに注意して、クリーンなアタックを心がける。
    - スケールを2オクターブ分、ゆっくりテンポ（♩=60）から始め、徐々に速くしていく練習法を取り入れる。
    - 鏡を見ながら練習して姿勢を確認し、深い呼吸を意識する。

    ---

    ■ セクション2：エチュード（例：○○教本 第3番）
    1. 指摘内容：
    - ○○のフレーズで指がもつれる。
    - リズムが走りやすくなる箇所あり。

    2. 今後の課題：
    - フィンガリングの精度向上。
    - リズムの安定を意識。

    3. 練習アドバイス：
    - 片手ずつゆっくりテンポで練習。
    - 譜面を分割して重点的に練習。

    ---

    ■ セクション3：曲（曲名：クラリネット協奏曲 第1楽章）
    1. 指摘内容：
    - 出だしの音の入りが遅れる。
    - ブレスのタイミングが不自然。

    2. 今後の課題：
    - フレーズ頭の入りのタイミング調整。
    - 呼吸のポイントを譜面に記す。

    3. 練習アドバイス：
    - フレーズ冒頭だけを繰り返し練習。
    - 呼吸の位置でブレス練習を取り入れる。

    文字起こし:
    ${text}
    `;

    // 要約結果を取得
    let summary = "";
    let tags: string[] = [];

    try {
      console.log("OpenAI APIを使用して要約を生成します");
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          {
            role: "system",
            content:
              "あなたは音楽教育の専門家です。生徒が提供したレッスンの文字起こしを、わかりやすく構造化された要約に変換することができます。",
          },
          {
            role: "user",
            content: summaryPrompt,
          },
        ],
        max_tokens: 1500,
      });

      summary = summaryResponse.choices[0]?.message.content || "";
      console.log("要約生成結果:", 
        summary ? `${summary.length}文字の要約を生成しました` : "要約が生成されませんでした");
    } catch (summaryError) {
      console.error("要約生成中にエラーが発生しました:", summaryError);
      summary = "要約の生成中にエラーが発生しました。後ほど再試行してください。";
    }

    // タグ生成
    try {
      console.log("タグ生成を開始します: OpenAI APIを呼び出します");
      
      const tagsPrompt = `
      以下は楽器レッスンの文字起こしデータです。この内容から、レッスンに関連する重要なタグを5〜10個抽出してください。
      
      【抽出すべきタグの種類】
      - 技術的要素（例：ビブラート、スタッカート、アーティキュレーション、運指、音色、表現力）
      - 課題の種類（例：リズム、音程、姿勢、呼吸、フィンガリング）
      - 練習内容（例：スケール、アルペジオ、エチュード、曲名）
      - 楽曲名（実際にレッスンで扱った曲があれば、その曲名）
      
      【出力形式】
      - 箇条書きで（- タグ名）の形式でタグだけをリストアップしてください
      - タグの前に「重要タグ：」などの見出しは不要です
      - タグは1つずつ改行して出力してください
      
      【文字起こしデータ】
      ${text}
      `;

      const tagsResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたは音楽レッスンの内容からキーワードを抽出するAIアシスタントです。",
          },
          {
            role: "user",
            content: tagsPrompt,
          },
        ],
        max_completion_tokens: 500,
      });

      const tagsText = tagsResponse.choices[0]?.message.content || "";
      console.log("タグ生成結果（未加工）:", tagsText);

      // リスト形式で返されたタグを処理
      // "- タグ名" の形式から、タグ名のみを抽出
      const tagLines = tagsText.split("\n").filter(line => line.trim().startsWith("-"));
      
      if (tagLines.length === 0) {
        // 箇条書きが見つからない場合は、行ごとに処理
        const lines = tagsText.split("\n").filter(line => line.trim().length > 0);
        tags = lines.map(line => line.trim().replace(/^\d+\.\s*/, "").replace(/^[•*]\s*/, "")).filter(tag => tag.length > 0);
        console.log("行ベースで抽出したタグ:", tags);
      } else {
        // 通常の箇条書き処理
        tags = tagLines.map(line => line.replace(/^-\s*/, "").trim()).filter(tag => tag.length > 0);
        console.log("箇条書きから抽出したタグ:", tags);
      }
      
      // 「重要タグ：」などの行がタグとして抽出された場合、それを除外
      tags = tags.filter(tag => !tag.includes("重要タグ") && !tag.includes("："));
      console.log("フィルタリング後のタグ:", tags);

      // タグが抽出できなかった場合のフォールバック処理
      if (tags.length === 0) {
        // カンマ区切りの場合を試す
        const commaBasedTags = tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
          
        if (commaBasedTags.length > 0) {
          tags = commaBasedTags;
          console.log("カンマ区切りで抽出したタグ:", tags);
        }
      }
    } catch (tagsError) {
      console.error("タグ抽出中にエラーが発生しました:", tagsError);
    }

    // タグが抽出できなかった場合はデフォルトタグを使用
    if (tags.length === 0) {
      console.log("タグが抽出できなかったため、デフォルトタグを使用します");
      tags = ["レッスン", "音楽", "練習", "音楽表現", "技術向上"];
    }

    console.log("最終的なタグ:", tags);
    console.log("テキスト要約が完了しました");

    return { summary, tags };
  } catch (error) {
    console.error("テキスト要約中にエラーが発生しました:", error);
    return {
      summary: "要約の生成中にエラーが発生しました。後ほど再試行してください。",
      tags: ["エラー", "レッスン", "音楽", "練習", "技術"],
    };
  }
}
