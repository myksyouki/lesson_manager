import { openai } from "../config";

/**
 * OpenAI APIを使用してテキストを要約する関数
 * @param {string} text 要約するテキスト
 * @return {Promise<{summary: string, tags: string[]}>} 要約結果とタグ
 */
export async function summarizeTextWithOpenAI(text: string): Promise<{summary: string, tags: string[]}> {
  try {
    if (!openai) {
      throw new Error("OpenAI APIが初期化されていません");
    }

    console.log("テキスト要約を開始します");

    // 要約用のプロンプト
    const summaryPrompt = `
    以下はピアノレッスンの文字起こしです。この内容を300文字程度で要約してください。
    要約には、レッスンの主な内容、指導のポイント、改善点などを含めてください。
    
    文字起こし:
    ${text}
    `;

    // タグ抽出用のプロンプト
    const tagsPrompt = `
    以下はピアノレッスンの文字起こしです。この内容から、レッスンの内容を表す5つ程度のタグを抽出してください。
    タグは単語または短いフレーズで、カンマ区切りのリストとして返してください。
    
    文字起こし:
    ${text}
    `;

    // 要約の生成
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "あなたはピアノレッスンの内容を要約する専門家です。簡潔で分かりやすい要約を作成してください。",
        },
        {
          role: "user",
          content: summaryPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const summary = summaryResponse.choices[0]?.message.content || "要約を生成できませんでした。";

    // タグの抽出
    const tagsResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "あなたはピアノレッスンの内容からキーワードを抽出する専門家です。",
        },
        {
          role: "user",
          content: tagsPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 100,
    });

    const tagsText = tagsResponse.choices[0]?.message.content || "";
    
    // カンマ区切りのタグをリストに変換
    const tags = tagsText
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    console.log("テキスト要約が完了しました");

    return { summary, tags };
  } catch (error) {
    console.error("テキスト要約中にエラーが発生しました:", error);
    return { 
      summary: "要約の生成中にエラーが発生しました。", 
      tags: ["エラー"] 
    };
  }
}
