'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, PrimaryRole, Gender } from '@/lib/supabase/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // ユーザー情報取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);

      if (user) {
        // プロフィール取得
        supabase
          .from('app_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              // プロフィールがない場合は基本情報のみ
              setProfile({
                user_id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
                primary_role: null,
                phone: null,
                email: user.email,
                is_super_admin: false,
                families: [],
                organizations: [],
              });
            } else {
              // プロフィールがある場合
              setProfile({
                user_id: data.user_id,
                full_name: data.full_name,
                primary_role: data.primary_role,
                phone: data.phone,
                gender: data.gender,
                email: user.email,
                is_super_admin: data.primary_role === 'super_admin',
                families: [],
                organizations: [],
              });
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ログイン
  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // サインアップ
  const signUp = async (email: string, password: string, fullName: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('app_profiles').insert({
        user_id: data.user.id,
        full_name: fullName,
        primary_role: 'family',
      });
    }
    return data;
  };

  // Googleログイン
  const signInWithGoogle = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return data;
  };

  // ログアウト
  const signOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // プロフィール更新
  const updateProfile = async (updates: {
    full_name?: string;
    phone?: string;
    gender?: Gender;
    primary_role?: PrimaryRole;
  }) => {
    if (!user) throw new Error('ユーザーがログインしていません');
    const supabase = createClient();
    const { error } = await supabase
      .from('app_profiles')
      .update(updates)
      .eq('user_id', user.id);
    if (error) throw error;

    // プロフィールを再取得
    const { data } = await supabase
      .from('app_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile({
        user_id: data.user_id,
        full_name: data.full_name,
        primary_role: data.primary_role,
        phone: data.phone,
        email: user.email,
        is_super_admin: data.primary_role === 'super_admin',
        families: [],
        organizations: [],
      });
    }
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    refetchProfile: () => {
      if (user) {
        const supabase = createClient();
        supabase
          .from('app_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile({
                user_id: data.user_id,
                full_name: data.full_name,
                primary_role: data.primary_role,
                phone: data.phone,
                gender: data.gender,
                email: user.email,
                is_super_admin: data.primary_role === 'super_admin',
                families: [],
                organizations: [],
              });
            }
          });
      }
    },
  };
}
