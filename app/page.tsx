import { redirect } from 'next/navigation';

export default function Home() {
  // デフォルトでダッシュボードにリダイレクト
  // 本番環境では認証状態を確認してログイン画面か
  // ダッシュボードにリダイレクトする
  redirect('/dashboard');
}
