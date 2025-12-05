import {
  User,
  Message,
  Conversation,
  Document,
  Notification,
  DashboardStats,
  UserSettings,
} from './types';

// ダミーユーザー
export const dummyUser: User = {
  id: 'user-1',
  email: 'tanaka@example.com',
  name: '田中 花子',
  avatar: undefined,
  familyId: 'family-1',
  role: 'caregiver',
  createdAt: new Date('2024-01-15'),
};

// ダミーメッセージ
export const dummyMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'こんにちは。介護サポートAIです。何かお困りのことはありますか？',
    timestamp: new Date('2024-12-05T10:00:00'),
    fileSearchUsed: false,
  },
  {
    id: 'msg-2',
    role: 'user',
    content: '父の血圧が少し高いのですが、どう対応すればいいですか？',
    timestamp: new Date('2024-12-05T10:01:30'),
  },
  {
    id: 'msg-3',
    role: 'assistant',
    content: `血圧が高い場合、まずは落ち着いて対応することが大切です。以下の点を確認してください：

1. **安静にする**: まずは座っていただき、深呼吸をしてリラックスしてもらいましょう。

2. **再度測定**: 5〜10分後にもう一度血圧を測定してください。一時的に高くなっている可能性もあります。

3. **医師の指示を確認**: 医師指示書に血圧が高い場合の対応が記載されていないか確認してください。

4. **緊急連絡が必要な場合**:
   - 収縮期血圧が180mmHg以上
   - 頭痛、めまい、吐き気などの症状がある
   - 意識がもうろうとしている

これらの症状がある場合は、すぐに医師またはかかりつけ医に連絡してください。`,
    timestamp: new Date('2024-12-05T10:02:00'),
    fileSearchUsed: true,
    sources: [
      {
        documentId: 'doc-1',
        fileName: '緊急時対応マニュアル.pdf',
        excerpt: '血圧が180/110mmHgを超える場合は医師に連絡...',
        page: 5,
      },
    ],
  },
];

// ダミー会話履歴
export const dummyConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: '血圧管理について',
    messages: dummyMessages,
    createdAt: new Date('2024-12-05T10:00:00'),
    updatedAt: new Date('2024-12-05T10:02:00'),
    fileSearchEnabled: true,
  },
  {
    id: 'conv-2',
    title: '服薬の時間について',
    messages: [
      {
        id: 'msg-10',
        role: 'user',
        content: '朝の薬を飲み忘れた場合、どうすればいいですか？',
        timestamp: new Date('2024-12-04T14:30:00'),
      },
      {
        id: 'msg-11',
        role: 'assistant',
        content: '飲み忘れに気づいた時間によって対応が異なります。次の服薬時間まで4時間以上ある場合は、気づいた時点で服用してください。それより短い場合は、次の服薬時間まで待つことをお勧めします。',
        timestamp: new Date('2024-12-04T14:30:30'),
        fileSearchUsed: true,
      },
    ],
    createdAt: new Date('2024-12-04T14:30:00'),
    updatedAt: new Date('2024-12-04T14:30:30'),
    fileSearchEnabled: true,
  },
  {
    id: 'conv-3',
    title: '食事の注意点',
    messages: [
      {
        id: 'msg-20',
        role: 'user',
        content: '塩分制限のある食事について教えてください',
        timestamp: new Date('2024-12-03T09:15:00'),
      },
      {
        id: 'msg-21',
        role: 'assistant',
        content: '塩分制限食では、1日の塩分摂取量を6g以下に抑えることが推奨されています。調味料は減塩タイプを使用し、加工食品は控えめにしましょう。',
        timestamp: new Date('2024-12-03T09:15:30'),
        fileSearchUsed: false,
      },
    ],
    createdAt: new Date('2024-12-03T09:15:00'),
    updatedAt: new Date('2024-12-03T09:15:30'),
    fileSearchEnabled: false,
  },
];

// ダミードキュメント
export const dummyDocuments: Document[] = [
  {
    id: 'doc-1',
    familyId: 'family-1',
    fileName: '緊急時対応マニュアル.pdf',
    category: 'emergency',
    uploadedAt: new Date('2024-11-20'),
    fileSize: 2456789,
    status: 'ready',
  },
  {
    id: 'doc-2',
    familyId: 'family-1',
    fileName: '服薬指示書_2024年12月.pdf',
    category: 'medication',
    uploadedAt: new Date('2024-12-01'),
    fileSize: 1234567,
    status: 'ready',
  },
  {
    id: 'doc-3',
    familyId: 'family-1',
    fileName: 'ケアプラン_田中太郎様.pdf',
    category: 'care_plan',
    uploadedAt: new Date('2024-11-15'),
    fileSize: 3456789,
    status: 'ready',
  },
  {
    id: 'doc-4',
    familyId: 'family-1',
    fileName: '医師指示書_2024年11月.pdf',
    category: 'doctor_order',
    uploadedAt: new Date('2024-11-10'),
    fileSize: 987654,
    status: 'ready',
  },
  {
    id: 'doc-5',
    familyId: 'family-1',
    fileName: '介護保険サービス利用ガイド.pdf',
    category: 'manual',
    uploadedAt: new Date('2024-11-05'),
    fileSize: 4567890,
    status: 'ready',
  },
];

// ダミー通知
export const dummyNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: '新しいドキュメントがアップロードされました',
    message: '「服薬指示書_2024年12月.pdf」が追加されました',
    type: 'info',
    read: false,
    createdAt: new Date('2024-12-05T08:00:00'),
  },
  {
    id: 'notif-2',
    title: 'ケアプランの更新',
    message: 'ケアプランが更新されました。ご確認ください。',
    type: 'warning',
    read: true,
    createdAt: new Date('2024-12-03T15:30:00'),
  },
  {
    id: 'notif-3',
    title: 'システムメンテナンス',
    message: '12月10日23:00〜24:00にメンテナンスを実施します',
    type: 'info',
    read: true,
    createdAt: new Date('2024-12-01T10:00:00'),
  },
];

// ダミー統計データ
export const dummyStats: DashboardStats = {
  totalConversations: 24,
  totalDocuments: 12,
  documentsThisWeek: 2,
  conversationsThisWeek: 5,
};

// ダミー設定
export const dummySettings: UserSettings = {
  userId: 'user-1',
  notifications: {
    email: true,
    push: true,
    weeklyReport: true,
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

// ダミーAI応答生成関数
export const generateDummyAIResponse = (userMessage: string): string => {
  const responses = [
    'ご質問ありがとうございます。その件について詳しくご説明いたします。',
    'なるほど、それは重要なポイントですね。以下のように対応することをお勧めします。',
    'ご心配なお気持ち、よく分かります。まずは落ち着いて以下の手順で対応してみましょう。',
    '大切なご質問ですね。医師指示書に基づいて、このような場合の対応をお伝えします。',
    'その症状については、注意深く観察する必要があります。以下の点を確認してください。',
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};
