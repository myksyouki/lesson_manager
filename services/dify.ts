import Constants from 'expo-constants';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DifyResponse {
  message: string;
  conversation_id: string;
}

export class DifyService {
  private static readonly API_ENDPOINT = Constants.expoConfig?.extra?.difyApiEndpoint as string;
  private static readonly SERVICE_TOKEN = Constants.expoConfig?.extra?.difyServiceToken as string;

  static async sendMessage(message: string, conversationId?: string): Promise<DifyResponse> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.SERVICE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          conversation_id: conversationId,
          response_mode: 'blocking',
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return {
        message: data.answer,
        conversation_id: data.conversation_id,
      };
    } catch (error) {
      console.error('Dify API error:', error);
      throw error;
    }
  }

  static async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/messages?conversation_id=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${this.SERVICE_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation history');
      }

      const data = await response.json();
      return data.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
      throw error;
    }
  }
} 