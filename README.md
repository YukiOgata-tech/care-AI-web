# Care AI - 介護サポートAI

介護者をサポートするAIアシスタントSaaSアプリケーション

## ?? プロジェクト概要

Care AIは、介護現場で働く方々を支援するためのAIチャットアプリケーションです。ケアプラン、医師指示書、緊急時対応マニュアルなどのPDF資料を登録し、OpenAI File Search機能を使って必要な情報を即座に引き出すことができます。

### 主な特徴

- **AIチャット**: OpenAI GPT-4o-mini / GPT-5.1-miniを使用した自然な会話と資料参照
- **File Search機能**: 登録資料からの自動検索・引用
- **ファイル管理**: カテゴリ別のPDF資料管理
- **家族単位データ分離**: メタデータによる安全なデータ管理
- **2つのAIモード**:
  - 通常会話モード（File Search OFF）- 軽量・低コスト
  - 資料参照モード（File Search ON）- 精度重視

## ?? 開発状況

### 実装済み

- Supabase認証・RLS付きデータベース
- 家族単位のAIチャット（会話履歴・論理削除・メッセージ分類）
- File Search連携（PDFアップロード〜Vector Store登録）
- ダッシュボード／ファイル管理／設定画面
- レスポンシブデザイン
- 中期ログ要約用Cloud Run Jobコード（`jobs/conversation-summary-job`、本番未デプロイ）

### 今後の実装予定

- 日報/レポート自動生成の本番運用
- 多職種アカウント連携
- 監査ログ機能の拡充と運用設計
- 中期ログ要約ジョブの本番デプロイとスケジューリング

## ?? 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **UI**: Radix UI + Tailwind CSS 4
- **状態管理**: Zustand
- **アニメーション**: Framer Motion
- **通知**: Sonner
- **Markdown**: react-markdown

### バックエンド
- **認証・DB**: Supabase (Auth, Database, Storage, RLS)
- **AI**: OpenAI API (GPT-4o-mini, GPT-5.1-mini / Responses API)
- **ファイル検索**: OpenAI Vector Store + File Search（familyごとのVector Store紐付け）

## ?? セットアップ

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
- 開発サーバー起動は、こちら側で行うので実行しなくていいです。

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 環境変数

プロジェクトルートに `.env.local` ファイルを作成:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## ?? プロジェクト構成

```
care-ai-webapp/
├── app/                      # Next.js App Router
│   ├── api/                  # APIルート（chat, files など）
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
│   ├── supabase/            # Supabaseクライアント・RLS関連
│   ├── types.ts             # 型定義
│   ├── utils.ts             # ヘルパー関数
│   ├── store.ts             # Zustandストア
│   └── dummy-data.ts        # ダミーデータ（移行前の一部画面で使用）
├── jobs/                    # 中期ログ要約用Cloud Run Jobコード（本番未デプロイ）
│   └── conversation-summary-job/  # 会話サマリ生成ジョブ
└── docs/                    # ドキュメント
    ├── care-ai-overview.md  # プロジェクト概要
    ├── chat_spec.md         # チャット仕様・LLM連携
    ├── CURRENT_DB_SCHEMA.md # 現在のDBスキーマ
    └── ...                  # その他セットアップ/設計ドキュメント
```

## ?? 使用方法

### 現在の挙動

1. Supabaseアカウントでログイン（メール+パスワード）
2. 所属している家族を選択し、`/chat/[family_id]` でチャット画面を開く
3. メッセージを送信すると、会話履歴とともにOpenAI APIで応答が生成され、DBに保存されます
4. 「File Search」トグルONかつその家族にVector Storeがある場合は、GPT-5.1-mini + File Searchで回答
5. トグルOFFまたはVector Store無しの場合は、GPT-4o-miniのみで回答

### ファイル管理

1. `ファイル管理` 画面からPDF資料（ケアプラン、医師指示書等）をアップロード
2. Supabase Storageに保存され、別API経由でOpenAI Vector Storeに登録
3. familyごとの`openai_vector_store_id`と紐付き、チャット時にFile Searchとして利用されます

## ?? セキュリティ

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



## ?? コントリビューション


## ?? ライセンス


## ?? 謝辞

- [Next.js](https://nextjs.org)
- [OpenAI](https://openai.com)
- [Supabase](https://supabase.com)
- [Radix UI](https://www.radix-ui.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**開発開始日**: 2025年12月5日
**現在のステータス**: AIチャット／File Search／Supabase連携実装済み（中期ログ用Cloud Run Jobは未デプロイ）

