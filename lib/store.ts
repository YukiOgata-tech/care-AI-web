import { create } from 'zustand';
import {
  User,
  Conversation,
  Message,
  Document,
  Notification,
  UserSettings,
} from './types';

// ユーザー関連のストア
interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email: string, password: string) => {
    // 実際のログイン処理はuseAuthフックで実装されています
    await new Promise((resolve) => setTimeout(resolve, 1000));
    set({ isAuthenticated: true });
  },
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },
}));

// 会話関連のストア
interface ConversationStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  currentFamilyId: string | null;
  setCurrentConversation: (id: string | null) => void;
  setCurrentFamily: (familyId: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  updateConversationTitle: (id: string, title: string) => void;
  sendMessage: (content: string, fileSearchEnabled: boolean) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
  isLoading: false,
  currentFamilyId: null,

  setCurrentFamily: (familyId: string | null) => {
    set({
      currentFamilyId: familyId,
      currentConversation: null,
    });
  },

  setCurrentConversation: (id: string | null) => {
    if (id === null) {
      set({ currentConversation: null });
      return;
    }
    const conversation = get().conversations.find((c) => c.id === id);
    set({ currentConversation: conversation || null });
  },

  setConversations: (conversations: Conversation[]) => {
    set({
      conversations,
      currentConversation: conversations[0] ?? null,
    });
  },

  updateConversationTitle: (id: string, title: string) => {
    const updated = get().conversations.map((conv) =>
      conv.id === id ? { ...conv, title } : conv
    );
    const current = get().currentConversation;
    set({
      conversations: updated,
      currentConversation:
        current && current.id === id ? { ...current, title } : current,
    });
  },

  sendMessage: async (content: string, fileSearchEnabled: boolean) => {
    const familyId = get().currentFamilyId;

    if (!familyId) {
      console.warn('家族が選択されていないため、メッセージを送信できません。');
      return;
    }

    let currentConv = get().currentConversation;

    // 新規会話の場合はローカルに会話を作成（IDは一時的）
    if (!currentConv) {
      const tempConversation: Conversation = {
        id: `temp-${Date.now()}`,
        familyId,
        title: content.slice(0, 30) || '新しい会話',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileSearchEnabled,
      };
      const conversations = get().conversations;
      set({
        conversations: [tempConversation, ...conversations],
        currentConversation: tempConversation,
      });
      currentConv = tempConversation;
    }

    if (!currentConv) return;

    // ユーザーメッセージをローカルに追加
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
        title:
          currentConv.messages.length === 0
            ? content.slice(0, 30)
            : currentConv.title,
      },
      isLoading: true,
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
          message: content,
          fileSearchEnabled,
          conversationId: currentConv.id,
          clientMessageId: userMessage.id,
        }),
      });

      if (!response.ok) {
        console.error('Chat API error:', await response.text());
        set({ isLoading: false });
        return;
      }

      const data: { reply: string; conversationId?: string; title?: string } =
        await response.json();

      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        fileSearchUsed: fileSearchEnabled,
      };

      const latestConv = get().currentConversation;
      if (!latestConv) {
        set({ isLoading: false });
        return;
      }

      const finalMessages = [...latestConv.messages, aiMessage];
      const resolvedId = data.conversationId || latestConv.id;
      const resolvedTitle =
        data.title ||
        latestConv.title ||
        (content.slice(0, 30) || '新しい会話');

      const updatedConv = {
        ...latestConv,
        id: resolvedId,
        title: resolvedTitle,
        messages: finalMessages,
        updatedAt: new Date(),
      };

      const updatedConversations = get().conversations.map((c) =>
        c.id === latestConv.id ? updatedConv : c
      );

      set({
        currentConversation: updatedConv,
        conversations: updatedConversations,
        isLoading: false,
      });
    } catch (error) {
      console.error('チャット送信中にエラーが発生しました:', error);
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id: string) => {
    const familyId = get().currentFamilyId;

    try {
      if (familyId) {
        const res = await fetch(
          `/api/chat?conversationId=${encodeURIComponent(
            id
          )}&familyId=${encodeURIComponent(familyId)}`,
          {
            method: 'DELETE',
          }
        );

        if (!res.ok) {
          console.error('Chat delete API error:', await res.text());
        }
      }
    } catch (error) {
      console.error('チャット削除中にエラーが発生しました:', error);
    }

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
  documents: [],

  uploadDocument: async (file: File, category: string) => {
    // TODO: Supabase Storageへのアップロードと、OpenAI Vector Storeへの登録を実装
    // 1. Supabase Storageにアップロード
    // 2. OpenAI Vector Storeにコピー
    // 3. family_filesテーブルに両方のパスを記録

    console.log('ファイルアップロードは未実装です:', file.name, category);
    throw new Error('ファイルアップロード機能は現在実装中です。Supabase StorageとOpenAI APIの統合が必要です。');
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
  notifications: [],

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

// デフォルト設定
const defaultSettings: UserSettings = {
  userId: '',
  notifications: {
    email: true,
    push: true,
    weeklyReport: false,
  },
  ai: {
    defaultModel: 'gpt-4o-mini',
    fileSearchDefault: true,
    responseLength: 'normal',
  },
  display: {
    theme: 'light',
    language: 'ja',
  },
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,

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
