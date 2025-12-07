import { createBrowserClient } from '@supabase/ssr';

/**
 * クライアントサイド用Supabaseクライアント
 * ブラウザで実行されるコンポーネントで使用
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
