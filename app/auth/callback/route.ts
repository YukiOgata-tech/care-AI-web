import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * OAuth認証のコールバックハンドラー
 * Google認証後、ここにリダイレクトされる
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // 認証コードをセッショントークンに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // app_profilesにプロフィールが存在するか確認
      const { data: existingProfile } = await supabase
        .from('app_profiles')
        .select('user_id')
        .eq('user_id', data.user.id)
        .single();

      // プロフィールが存在しない場合は作成
      if (!existingProfile) {
        const fullName = data.user.user_metadata?.full_name ||
                        data.user.user_metadata?.name ||
                        data.user.email?.split('@')[0] ||
                        'ゲスト';

        await supabase.from('app_profiles').insert({
          user_id: data.user.id,
          full_name: fullName,
          primary_role: 'family', // デフォルトはfamily
        });
      }

      // ダッシュボードにリダイレクト（成功メッセージ付き）
      return NextResponse.redirect(`${origin}/?auth=success`);
    }
  }

  // エラー時はログイン画面にリダイレクト
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
