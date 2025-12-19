// ユーザー型
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  familyId: string;
  role: 'caregiver' | 'family' | 'care_manager' | 'admin';
  createdAt: Date;
}

// メッセージ型
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileSearchUsed?: boolean;
  sources?: DocumentSource[];
}

// 会話型
export interface Conversation {
  id: string;
  familyId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  fileSearchEnabled: boolean;
}

// ドキュメント/ファイル型
export interface Document {
  id: string;
  familyId: string;
  fileName: string;
  category: DocumentCategory;
  uploadedAt: Date;
  fileSize: number;
  supabaseUrl?: string;
  openaiFileId?: string;
  status: 'uploading' | 'ready' | 'error';
}

// ドキュメントカテゴリ
export type DocumentCategory =
  | 'emergency'      // 緊急時対応
  | 'medication'     // 薬剤情報
  | 'care_plan'      // ケアプラン
  | 'doctor_order'   // 医師指示書
  | 'manual'         // マニュアル
  | 'other';         // その他

// ドキュメントソース（AI回答で引用された資料）
export interface DocumentSource {
  documentId: string;
  fileName: string;
  excerpt: string;
  page?: number;
}

// 通知型
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

// ダッシュボード統計
export interface DashboardStats {
  totalConversations: number;
  totalDocuments: number;
  documentsThisWeek: number;
  conversationsThisWeek: number;
}

// 設定型
export interface UserSettings {
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    weeklyReport: boolean;
  };
  ai: {
    defaultModel: 'gpt-4o' | 'gpt-4o-mini';
    fileSearchDefault: boolean;
    responseLength: 'concise' | 'normal' | 'detailed';
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    language: 'ja' | 'en';
  };
}

// AI設定モード
export type AIMode = 'normal' | 'file-search';
