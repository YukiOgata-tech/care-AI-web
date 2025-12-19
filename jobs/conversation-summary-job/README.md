# Conversation Summary Job (Cloud Run Job 用)

このディレクトリには、AIチャットの「中期ログ（会話要約）」を生成するための  
Cloud Run Job 向けスクリプトが含まれています。

## 役割

- `conversations` / `conversation_messages` / `conversation_summaries` テーブルを参照
- 既存の要約以降に追加されたメッセージをまとめて OpenAI に渡し、要約を生成
- `conversation_summaries` に `status = 'ready'` のレコードとして保存

## 必要な環境変数

- `SUPABASE_URL`  
- `SUPABASE_SERVICE_ROLE_KEY`（サービスロールキー）  
- `OPENAI_API_KEY`  
- `SUMMARY_CHUNK_SIZE`（任意、デフォルト: 20）

## 実行方法（ローカル）

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
OPENAI_API_KEY=... \
node jobs/conversation-summary-job/index.ts
```

## Cloud Run Job へのデプロイ例（概念）

このリポジトリをベースイメージとしてビルドし、エントリポイントに  
`node jobs/conversation-summary-job/index.js`（ビルド後のパス）を指定して Cloud Run Job を作成します。

```bash
gcloud run jobs create conversation-summary-job \
  --image gcr.io/PROJECT_ID/care-ai-webapp:latest \
  --region=asia-northeast1 \
  --set-env-vars "SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...,OPENAI_API_KEY=..."
```

スケジューラから定期実行することで、中期ログを自動更新できます。

