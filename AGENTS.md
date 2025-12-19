# Repository Guidelines

## プロジェクト構成とモジュール配置
- `app/`: Next.js App Router のエントリ。`(auth)`, `(dashboard)`, `(admin)` が認証画面・メイン画面・管理画面を担当します。
- `components/`: 再利用可能な UI / 機能コンポーネント（`ui/`, `layout/`, `chat/`, `files/`, `auth/`）。
- `lib/`: 共通ロジック（Zustand ストア用 `store.ts`、`supabase/*` クライアントと型、`types.ts`）。
- `hooks/`: `useAuth` などのカスタムフック。
- `public/`・`docs/`: 静的ファイルとドキュメント（DB 構成は `docs/supabase-db-structures.md` を参照）。
- ルート相対 import には `@/` エイリアスを使用してください。

## ビルド・テスト・開発コマンド
- `npm run dev`: 開発サーバー起動（ホットリロード付き）。
- `npm run build`: 本番ビルドを作成。
- `npm start`: 本番ビルドを起動（事前に `npm run build` 必須）。
- `npm run lint`: ESLint（Next.js + TypeScript）を実行。警告は PR 前に解消してください。

## コーディングスタイルと命名規約
- 言語: TypeScript + React（App Router）。コンポーネントは PascalCase、フックは `useXxx` で命名し `hooks/` に配置します。
- スタイル: Tailwind CSS ユーティリティを使用し、条件付きクラスには既存の `cn` / `clsx` ヘルパーを利用します。
- パス: 相対パスより `@/components/...`, `@/lib/...` などのエイリアスを優先します。
- UI テキストは原則日本語で記述し、コメント・変数名は英語でも構いません。

## テスト方針
- 現時点で公式なテストランナーは未整備のため、以下で品質を担保します。
  - Lint 実行（`npm run lint`）。
  - `npm run dev` で認証、ダッシュボード、ファイル周りなど主要フローを手動確認。
- 新たに自動テストを導入する場合は、対象コード近く（`__tests__/` や `*.test.tsx`）に配置し、実行方法を `docs/` に追記してください。

## コミット / Pull Request ガイドライン
- コミット: 「何をしたか」が分かる短いメッセージを推奨（例: `add admin dashboard metrics`）。英語・日本語どちらでも構いませんが PR 内で統一してください。
- PR: 変更概要、UI 変更がある場合はスクリーンショット or GIF、関連 Issue へのリンクを含めてください。
- 1 PR のスコープは小さく保ち、無関係なリファクタと機能追加を混在させないでください。

## セキュリティと設定の注意点
- `.env*` や秘密情報はコミット禁止です。必要な環境変数は `.env.local`（Supabase 用 URL / キー、将来の `OPENAI_API_KEY` など）に定義します。
- `family_id` / `organization_id` によるデータ分離を厳守し、`lib/supabase/*` と `docs/supabase-db-structures.md` のパターンに従って実装してください。
- より詳細なアーキテクチャやエージェント向け情報は `CLAUDE.md` と `GEMINI.md` を参照してください。
