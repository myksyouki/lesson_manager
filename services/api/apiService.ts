import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuth } from 'firebase/auth';

/**
 * API通信を行うためのサービスクラス
 */
class ApiService {
  private api: AxiosInstance;
  private functionsBaseUrl: string;

  constructor() {
    // Firebase Functions のベースURL
    // 本番環境では実際のURLに置き換える
    this.functionsBaseUrl = 'https://asia-northeast1-lesson-manager-app.cloudfunctions.net';
    
    this.api = axios.create({
      baseURL: this.functionsBaseUrl,
      timeout: 30000, // 30秒
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // リクエストインターセプター（認証トークンの追加など）
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          return config;
        } catch (error) {
          console.error('APIリクエストの準備中にエラーが発生しました:', error);
          return config;
        }
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター（エラーハンドリングなど）
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // エラーログ
        console.error('APIリクエストでエラーが発生しました:', error);
        
        // エラーレスポンスの整形
        const errorResponse = {
          status: error.response?.status || 500,
          message: error.response?.data?.error || 'サーバーエラーが発生しました',
          data: error.response?.data || null,
        };
        
        return Promise.reject(errorResponse);
      }
    );
  }

  /**
   * GETリクエストを送信
   * @param url エンドポイントURL
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url, config);
    return response.data;
  }

  /**
   * POSTリクエストを送信
   * @param url エンドポイントURL
   * @param data リクエストボディ
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data, config);
    return response.data;
  }

  /**
   * PUTリクエストを送信
   * @param url エンドポイントURL
   * @param data リクエストボディ
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data, config);
    return response.data;
  }

  /**
   * DELETEリクエストを送信
   * @param url エンドポイントURL
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url, config);
    return response.data;
  }
}

// シングルトンインスタンスをエクスポート
export const apiService = new ApiService();
