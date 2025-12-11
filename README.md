# Care AI - 介護サポートAI

介護者をサポートするAIアシスタントSaaSアプリケーション

## 📋 プロジェクト概要

Care AIは、介護現場で働く方々を支援するためのAIチャットアプリケーションです。ケアプラン、医師指示書、緊急時対応マニュアルなどのPDF資料を登録し、OpenAI File Search機能を使って必要な情報を即座に引き出すことができます。

### 主な特徴

- **AIチャット**: OpenAI GPT-4o/4o-miniを使用した自然な会話
- **File Search機能**: 登録資料からの自動検索・引用
- **ファイル管理**: カテゴリ別のPDF資料管理
- **家族単位データ分離**: メタデータによる安全なデータ管理
- **2つのAIモード**:
  - 通常会話モード（File Search OFF）- 軽量・低コスト
  - 資料参照モード（File Search ON）- 精度重視

## 🚀 開発状況

### ✅ 実装済み（フロントエンド）

- 認証画面（ログイン/サインアップ）
- ダッシュボード（統計表示、クイックアクション）
- AIチャット画面（会話履歴、メッセージ表示）
- ファイル管理画面（アップロード、カテゴリ分類）
- 設定画面（プロフィール、通知、AI設定）
- レスポンシブデザイン

### 🔄 今後の実装予定（バックエンド統合）

- Supabase認証統合
- OpenAI API統合（Responses API）
- File Search機能の実装
- Supabase Storageへのファイルアップロード
- Vector Storeへのファイル登録
- 日報/レポート自動生成
- 多職種アカウント連携

## 🛠 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **UI**: Radix UI + Tailwind CSS 4
- **状態管理**: Zustand
- **アニメーション**: Framer Motion
- **通知**: Sonner
- **Markdown**: react-markdown

### バックエンド（予定）
- **認証・DB**: Supabase (Auth, Database, Storage)
- **AI**: OpenAI API (GPT-4o, GPT-4o-mini)
- **ファイル検索**: OpenAI Vector Store + File Search

## 📦 セットアップ

### 必要要件

- Node.js 18以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 環境変数（今後必要）

プロジェクトルートに `.env.local` ファイルを作成:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## 📁 プロジェクト構成

```
care-ai-webapp/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 認証画面グループ
│   │   ├── login/           # ログイン
│   │   └── signup/          # サインアップ
│   ├── (dashboard)/         # ダッシュボードグループ
│   │   ├── chat/            # チャット画面
│   │   ├── files/           # ファイル管理
│   │   ├── settings/        # 設定
│   │   └── page.tsx         # ホーム画面
│   ├── globals.css          # グローバルスタイル
│   └── layout.tsx           # ルートレイアウト
├── components/              # Reactコンポーネント
│   ├── ui/                  # 基本UIコンポーネント
│   ├── chat/                # チャット関連
│   ├── files/               # ファイル管理関連
│   └── layout/              # レイアウト関連
├── lib/                     # ユーティリティ
│   ├── types.ts             # 型定義
│   ├── utils.ts             # ヘルパー関数
│   ├── store.ts             # Zustandストア
│   └── dummy-data.ts        # ダミーデータ
└── docs/                    # ドキュメント
    └── care-ai-overview.md  # プロジェクト概要
```

## 🎯 使用方法

### 現在（ダミーデータ版）

1. **ログイン**: 任意のメールアドレスとパスワードでログイン可能
2. **チャット**: メッセージを送信すると1.5秒後にダミーAI応答
3. **ファイル管理**: PDFファイルをアップロード（2秒後に完了）
4. **設定**: 各種設定の変更が可能

### API統合後

1. Supabaseアカウントでログイン
2. PDF資料をアップロード（ケアプラン、医師指示書等）
3. File Search ONでAIに質問
4. 資料を参照した回答を取得

## 🔐 セキュリティ

- Row Level Security（RLS）によるデータ分離
- family_idによる家族単位のデータ管理
- メタデータによる資料の適切な分類・検索

### 監査ログ（実装予定）

**重要**: 介護SaaSとしてのコンプライアンス要件を満たすため、監査ログ機能を実装予定

- **対象テーブル**:
  - `organizations` - 事業所情報
  - `care_persons` - 被介護者情報（個人情報）
  - `organization_members` - 事業所メンバー関係
  - `family_members` - 家族メンバー関係
- **記録内容**: 誰が・いつ・何を変更したか（INSERT/UPDATE/DELETE）
- **用途**:
  - 法的コンプライアンス（GDPR、個人情報保護法）
  - セキュリティインシデント対応
  - トラブルシューティング
- **実装方法**: PostgreSQLトリガーによる自動記録
- **保持期間**: 2年間（法的要件に応じて調整）



## 🤝 コントリビューション


## 📄 ライセンス


## 🙏 謝辞

- [Next.js](https://nextjs.org)
- [OpenAI](https://openai.com)
- [Supabase](https://supabase.com)
- [Radix UI](https://www.radix-ui.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**開発開始日**: 2025年12月5日
**現在のステータス**: フロントエンド実装完了 ✅
