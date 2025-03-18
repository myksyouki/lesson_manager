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
        summary: "APIキーの設定が必要です。OpenAI APIキーを設定してください。現在はAI要約が利用できない状態です。",
        tags: ["設定必要", "音楽", "練習"],
      };
    }

    // 空のテキストやごく短いテキストの場合はデフォルト値を返す
    if (!text || text.trim().length < 10) {
      console.log("テキストがないか非常に短いため、デフォルトの要約とタグを返します。");
      return {
        summary: "音声データが不足しているため、要約できませんでした。より長い録音データをアップロードしてください。",
        tags: ["データ不足", "音楽レッスン"],
      };
    }

    console.log("テキスト要約を開始します（文字数: " + text.length + "）");

    // 要約用のプロンプト
    const summaryPrompt = `
    以下は楽器レッスンの文字起こしデータです。  
    この内容を**学習者が振り返りやすいように、わかりやすく・見やすく要約**してください。  
    出力結果は読みやすくなるよう、**絵文字や装飾**を使ってください。

    ---

    【要件】
    - 内容を「セクション単位」で分けて整理してください。  
      例：基礎練習、エチュード、曲ごと など。セクションが明確でない場合は、「セクション1」などで区切ってください。
    - 各セクションには以下の3項目を明確に記述してください👇
      - 🎯 **指摘内容**
      - 📌 **今後の課題**
      - 🎵 **練習アドバイス**

    - 出力は**以下のフォーマット**に従ってください👇  
    - **各セクションは300字以上**で、できるだけ具体的にまとめてください。  
    - 要約全体は**1000字以上**とし、生徒が読み返して理解しやすい自然な日本語で記述してください。  
    - プロンプト本文は出力せず、「要約のみ」表示してください。

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
      
      // APIリクエスト前の状態ログ
      console.log(`要約前の入力テキスト長: ${text.length}文字, OpenAI初期化状態: ${openai ? "初期化済み" : "未初期化"}`);
      
      // システムプロンプトをより詳細に設定
      const systemPrompt = `
あなたは音楽教育の専門家です。生徒のレッスンの文字起こしを、わかりやすく構造化された要約に変換する役割を担っています。
以下の重要なルールに従ってください：
1. 必ず日本語で応答してください
2. プロンプトの内容は要約には含めないでください
3. ユーザーが提供するフォーマットに厳密に従ってください
4. 各セクションは「■ セクション番号：内容」の形式で始めてください
5. 各セクション内は「1. 指摘内容」「2. 今後の課題」「3. 練習アドバイス」の3つのパートに分けてください
6. セクションが明確でない場合は、内容から適切に判断してセクション分けしてください
7. 内容が少ない場合でも、最低1000文字以上の要約を作成してください
8. プロンプト自体を出力しないでください - 要約だけを出力してください
`;
      
      // 重要: temperature値を下げて一貫性を高める
      const summaryResponse = await openai.chat.completions.create({
        model: "o3-mini-2025-01-31",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: summaryPrompt,
          },
        ],
        max_completion_tokens: 2000
      });

      // API応答ログ
      console.log(`OpenAI API応答: ${JSON.stringify({
        id: summaryResponse.id,
        model: summaryResponse.model,
        usage: summaryResponse.usage,
        choices_length: summaryResponse.choices?.length || 0,
        finish_reason: summaryResponse.choices[0]?.finish_reason || "不明"
      })}`);

      // レスポンスの詳細チェック
      if (!summaryResponse.choices || summaryResponse.choices.length === 0) {
        console.error("OpenAI APIからの応答に選択肢がありません");
        throw new Error("APIレスポンスエラー: 応答に選択肢がありません");
      }

      const rawSummary = summaryResponse.choices[0]?.message.content || "";
      
      // プロンプトの内容が含まれていないか確認
      if (rawSummary.includes("【要件】") || rawSummary.includes("【フォーマット（例）】")) {
        console.warn("要約にプロンプトの内容が含まれている可能性があります");
        // プロンプト部分を除去する処理
        summary = cleanupPromptContent(rawSummary);
      } else {
        summary = rawSummary;
      }
      
      // 要約が空または非常に短い場合はエラーとして扱う
      if (!summary || summary.length < 50) {
        console.error("生成された要約が空または非常に短いです");
        // エラーをスローするのではなく、エラーメッセージを設定する
        summary = "AI要約の生成に失敗しました。文字起こしデータが不十分か、AI処理中に問題が発生した可能性があります。後ほど再度お試しいただくか、管理者にお問い合わせください。";
      } else {
        console.log("要約生成結果:", 
          summary ? `${summary.length}文字の要約を生成しました` : "要約が生成されませんでした");
        
        // 要約の先頭部分をログに出力して確認
        if (summary) {
          console.log("要約の先頭100文字:", summary.substring(0, 100));
        }
      }
    } catch (summaryError) {
      console.error("要約生成中にエラーが発生しました:", summaryError);
      summary = "要約の生成中にエラーが発生しました。後ほど再試行してください。サポートが必要な場合は管理者にお問い合わせください。";
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
      - 必ず箇条書きで（- タグ名）の形式でタグだけをリストアップしてください
      - タグの前に「重要タグ：」などの見出しは不要です
      - タグは1つずつ改行して出力してください
      - 一度確認し、箇条書き形式でない場合は、必ず箇条書き形式に修正してください
      
      【文字起こしデータ】
      ${text}
      `;

      const tagsResponse = await openai.chat.completions.create({
        model: "o3-mini-2025-01-31",
        messages: [
          {
            role: "system",
            content: "あなたは音楽レッスンの内容からキーワードを抽出するAIアシスタントです。必ず指定された箇条書き形式でタグを出力してください。",
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
        tags = lines.map(line => line.trim()
          .replace(/^\d+\.\s*/, "") // 数字.の形式を削除
          .replace(/^[•*]\s*/, "") // •や*で始まる場合も削除
          .replace(/^・\s*/, "") // ・で始まる場合も削除
          .replace(/^【.*】\s*/, "") // 【】で囲まれた見出しを削除
        ).filter(tag => tag.length > 0 && !tag.includes("：") && !tag.includes(":"));
        console.log("行ベースで抽出したタグ:", tags);
      } else {
        // 通常の箇条書き処理
        tags = tagLines.map(line => line.replace(/^-\s*/, "").trim()).filter(tag => tag.length > 0);
        console.log("箇条書きから抽出したタグ:", tags);
      }
      
      // 「重要タグ：」などの行がタグとして抽出された場合、それを除外
      tags = tags.filter(tag => !tag.includes("重要タグ") && !tag.includes("：") && !tag.includes(":"));
      
      // タグが0個の場合はデフォルトタグを使用
      if (tags.length === 0) {
        console.log("タグが抽出できなかったため、デフォルトタグを使用します");
        tags = ["音楽レッスン", "練習", "音楽"];
      }
    } catch (tagsError) {
      console.error("タグ抽出中にエラーが発生しました:", tagsError);
    }

    console.log("最終的なタグ:", tags);
    console.log("テキスト要約が完了しました");

    return { summary, tags };
  } catch (error) {
    console.error("テキスト要約中にエラーが発生しました:", error);
    return {
      summary: "要約サービスで技術的な問題が発生しました。しばらく経ってから再度お試しください。サポートが必要な場合は管理者にお問い合わせください。",
      tags: ["エラー発生", "システム障害", "サポート必要"],
    };
  }
}

/**
 * 要約からプロンプト内容を除去する関数
 * @param {string} rawSummary 生成された要約テキスト
 * @return {string} クリーンアップされた要約
 */
function cleanupPromptContent(rawSummary: string): string {
  // プロンプト部分の除去パターン
  const patterns = [
    /【要件】[\s\S]*?(?=■)/, // 【要件】セクションを削除
    /【フォーマット（例）】[\s\S]*?(?=■)/, // 【フォーマット（例）】セクションを削除
    /文字起こし:[\s\S]*?(?=■)/, // 文字起こしセクションを削除
  ];
  
  let cleanedSummary = rawSummary;
  
  // 各パターンで削除を試行
  patterns.forEach(pattern => {
    cleanedSummary = cleanedSummary.replace(pattern, "");
  });
  
  // セクション1から始まることを確認
  if (!cleanedSummary.trim().startsWith("■")) {
    // 最初のセクションマーカーを探す
    const sectionIndex = cleanedSummary.indexOf("■");
    if (sectionIndex > 0) {
      cleanedSummary = cleanedSummary.substring(sectionIndex);
    }
  }
  
  return cleanedSummary.trim();
}
