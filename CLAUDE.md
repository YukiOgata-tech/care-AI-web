# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Care AIは介護者向けAIアシスタントSaaSアプリケーション。ケアプラン、医師指示書、緊急時対応マニュアルなどのPDF資料を登録し、OpenAI File Search機能を使って必要な情報を即座に引き出す。

**現在の開発状況**: フロントエンド実装完了、Supabase認証統合済み、OpenAI API統合は未実装

## コマンド

### 開発
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番環境実行
npm start

# Lint
npm run lint
```

### 環境変数
`.env.local`に以下を設定（Supabase統合済み、OpenAI統合は今後）:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key  # 未実装
```

## 技術スタック

- **Framework**: Next.js 16 (App Router), TypeScript
- **UI**: Radix UI + Tailwind CSS 4
- **State Management**: Zustand (クライアント状態管理)
- **Auth & DB**: Supabase (Auth, PostgreSQL, Storage)
- **AI**: OpenAI API (GPT-4o/5.1) - 予定
- **Animation**: Framer Motion

## アーキテクチャ

### データ分離の原則
**重要**: このアプリケーションは家族（family）単位と事業所（organization）単位でデータを厳密に分離する。

- すべてのデータは`family_id`または`organization_id`で分離
- Row Level Security (RLS)により不正アクセス防止
- ファイルアップロードは必ずmetadataに`family_id`を付与

### 認証フロー
1. Supabase Auth (`useAuth` hook)でユーザー認証
2. `app_profiles`テーブルからユーザープロフィール取得
3. `AuthProvider`が認証状態を管理し、未認証時は`/login`へリダイレクト
4. `super_admin`ロールは管理画面アクセス可能

### ルート構造
- `app/(auth)/*` - 認証画面（login/signup）、レイアウト独立
- `app/(dashboard)/*` - メインアプリケーション、サイドバー付きレイアウト
- `app/(admin)/*` - 管理画面、super_admin専用

### 状態管理パターン
**Zustand Stores** (`lib/store.ts`):
- `useUserStore` - ユーザー情報（ダミーデータモード継続中）
- `useConversationStore` - チャット会話
- `useDocumentStore` - ファイル管理
- `useNotificationStore` - 通知
- `useSettingsStore` - 設定
- `useUIStore` - UIステート（サイドバー開閉等）

**注意**: 現在のstoreはダミーデータモードとSupabase統合が混在。新機能追加時はSupabase直接アクセスを優先。

### Supabase統合
- `lib/supabase/client.ts` - クライアントサイド用Supabaseクライアント
- `lib/supabase/server.ts` - サーバーサイド用（SSR対応）
- `lib/supabase/middleware.ts` - 認証ミドルウェア
- `lib/supabase/types.ts` - データベーススキーマ型定義

### データベーススキーマ
**詳細は`docs/supabase-db-structures.md`を参照**

主要テーブルとリレーション:
- `organizations` → `families` → `care_persons` (事業所 → 家族 → 被介護者)
- `app_profiles` - auth.usersと1:1のプロフィール
- `family_members` - 家族への関係者紐付け（composite key: family_id + user_id）
- `organization_members` - 事業所メンバー管理
- `family_files` - ファイル管理（Supabase Storage + OpenAI File ID）

**重要**:
- チャットログ系テーブルは未実装（設計検討中）
- すべてのテーブルにはインデックス・制約・トリガーが設定済み

### AI統合方針（未実装）
**File Searchの制御**:
- 通常会話モード（File Search OFF）- 軽量・低コスト
- 資料参照モード（File Search ON）- 精度重視、資料引用
- モデルが必要と判断した時のみFile Search実行（勝手に課金されない）

**ファイルアップロードフロー**（予定）:
1. Supabase Storageにアップロード
2. OpenAI Vector Storeにもコピー
3. `family_files`に両方のパスを記録（`supabase_path` + `openai_file_id`）
4. メタデータに`family_id`と`category`を付与

## コンポーネント構成

- `components/ui/*` - Radix UIベース汎用コンポーネント
- `components/layout/*` - レイアウトコンポーネント（Header, Sidebar）
- `components/chat/*` - チャット関連UI
- `components/files/*` - ファイル管理UI
- `components/auth/*` - 認証プロバイダー

## 型定義の場所

- `lib/types.ts` - アプリケーション共通型（Message, Conversation, Document等）
- `lib/supabase/types.ts` - Supabaseデータベース型

## 開発時の注意事項

### パスエイリアス
`@/*`で`./`をエイリアス（tsconfig.json設定済み）
```typescript
import { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
```

### クライアント/サーバーコンポーネント
- 状態管理・hooks使用時は`'use client'`必須
- Supabaseアクセスは適切に`client.ts`/`server.ts`を使い分け

### ロールベースアクセス制御
- `profile?.is_super_admin`で管理者判定
- `profile?.primary_role`でユーザータイプ判定（family/staff/manager/admin/super_admin）

### データアクセスパターン
新しいデータ取得時は`useAuth`のパターンを参考に:
1. `createClient()`でSupabaseクライアント取得
2. 適切なRLSが適用されたクエリ実行
3. エラーハンドリング

### 日本語優先
- UIテキストは日本語
- コメント・変数名は英語でも可
