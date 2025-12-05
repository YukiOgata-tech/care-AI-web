import { create } from 'zustand';
import {
  User,
  Conversation,
  Message,
  Document,
  Notification,
  UserSettings,
} from './types';
import {
  dummyUser,
  dummyConversations,
  dummyDocuments,
  dummyNotifications,
  dummySettings,
  generateDummyAIResponse,
} from './dummy-data';

// ユーザー関連のストア
interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: dummyUser, // 開発用にダミーユーザーをセット
  isAuthenticated: true, // 開発用にtrueに設定
  login: async (email: string, password: string) => {
    // ダミーログイン処理
    await new Promise((resolve) => setTimeout(resolve, 1000));
    set({ user: dummyUser, isAuthenticated: true });
  },
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
  setUser: (user: User) => {
    set({ user });
  },
}));

// 会話関連のストア
interface ConversationStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  setCurrentConversation: (id: string | null) => void;
  createConversation: () => void;
  sendMessage: (content: string, fileSearchEnabled: boolean) => Promise<void>;
  deleteConversation: (id: string) => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: dummyConversations,
  currentConversation: null,
  isLoading: false,

  setCurrentConversation: (id: string | null) => {
    if (id === null) {
      set({ currentConversation: null });
      return;
    }
    const conversation = get().conversations.find((c) => c.id === id);
    set({ currentConversation: conversation || null });
  },

  createConversation: () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: '新しい会話',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileSearchEnabled: true,
    };
    set({
      conversations: [newConversation, ...get().conversations],
      currentConversation: newConversation,
    });
  },

  sendMessage: async (content: string, fileSearchEnabled: boolean) => {
    const current = get().currentConversation;
    if (!current) {
      // 新しい会話を作成
      get().createConversation();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const currentConv = get().currentConversation;
    if (!currentConv) return;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const updatedMessages = [...currentConv.messages, userMessage];

    set({
      currentConversation: {
        ...currentConv,
        messages: updatedMessages,
        title: currentConv.messages.length === 0 ? content.slice(0, 30) : currentConv.title,
      },
      isLoading: true,
    });

    // ダミーAI応答を生成（遅延をシミュレート）
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const aiMessage: Message = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: generateDummyAIResponse(content),
      timestamp: new Date(),
      fileSearchUsed: fileSearchEnabled,
    };

    const finalMessages = [...updatedMessages, aiMessage];
    const updatedConv = {
      ...currentConv,
      messages: finalMessages,
      updatedAt: new Date(),
      title: currentConv.messages.length === 0 ? content.slice(0, 30) : currentConv.title,
    };

    // conversationsリストも更新
    const updatedConversations = get().conversations.map((c) =>
      c.id === currentConv.id ? updatedConv : c
    );

    set({
      currentConversation: updatedConv,
      conversations: updatedConversations,
      isLoading: false,
    });
  },

  deleteConversation: (id: string) => {
    const filtered = get().conversations.filter((c) => c.id !== id);
    set({
      conversations: filtered,
      currentConversation:
        get().currentConversation?.id === id ? null : get().currentConversation,
    });
  },
}));

// ドキュメント関連のストア
interface DocumentStore {
  documents: Document[];
  uploadDocument: (file: File, category: string) => Promise<void>;
  deleteDocument: (id: string) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: dummyDocuments,

  uploadDocument: async (file: File, category: string) => {
    // ダミーアップロード処理
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      familyId: 'family-1',
      fileName: file.name,
      category: category as any,
      uploadedAt: new Date(),
      fileSize: file.size,
      status: 'uploading',
    };

    set({ documents: [newDoc, ...get().documents] });

    // アップロードをシミュレート
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const updatedDocs = get().documents.map((d) =>
      d.id === newDoc.id ? { ...d, status: 'ready' as const } : d
    );

    set({ documents: updatedDocs });
  },

  deleteDocument: (id: string) => {
    const filtered = get().documents.filter((d) => d.id !== id);
    set({ documents: filtered });
  },
}));

// 通知関連のストア
interface NotificationStore {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: dummyNotifications,

  markAsRead: (id: string) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    set({ notifications: updated });
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

// 設定関連のストア
interface SettingsStore {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: dummySettings,

  updateSettings: (updates: Partial<UserSettings>) => {
    set({
      settings: {
        ...get().settings,
        ...updates,
      },
    });
  },
}));

// UI状態のストア
interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  sidebarOpen: true,

  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen });
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },
}));
