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
          .then(async ({ data, error }) => {
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
              // プロフィールがある場合、組織情報も取得
              const { data: orgMembers } = await supabase
                .from('organization_members')
                .select(`
                  organization_id,
                  role,
                  organizations (
                    name
                  )
                `)
                .eq('user_id', user.id);

              const organizations = orgMembers?.map((om: any) => ({
                organization_id: om.organization_id,
                organization_name: om.organizations?.name || '不明',
                role: om.role,
              })) || [];

              setProfile({
                user_id: data.user_id,
                full_name: data.full_name,
                primary_role: data.primary_role,
                phone: data.phone,
                gender: data.gender,
                email: user.email,
                is_super_admin: data.primary_role === 'super_admin',
                families: [],
                organizations: organizations,
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
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    userType: 'staff' | 'family' = 'family',
    invitationCode?: string
  ) => {
    const supabase = createClient();

    // 招待コードの検証（提供されている場合）
    let organizationId: string | null = null;
    let invitationRole: string | null = null;

    if (invitationCode) {
      const { data: invitation, error: invitationError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('code', invitationCode)
        .eq('is_active', true)
        .single();

      if (invitationError || !invitation) {
        throw new Error('招待コードが無効です');
      }

      // 有効期限チェック
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('招待コードの有効期限が切れています');
      }

      // 使用回数チェック
      if (invitation.used_count >= invitation.max_uses) {
        throw new Error('招待コードの使用回数が上限に達しています');
      }

      organizationId = invitation.organization_id;
      invitationRole = invitation.role;
    }

    // ユーザー作成
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;

    if (data.user) {
      // プロフィール作成
      const primaryRole: PrimaryRole = userType === 'staff' ? 'staff' : 'family';
      await supabase.from('app_profiles').insert({
        user_id: data.user.id,
        full_name: fullName,
        primary_role: primaryRole,
      });

      // 招待コードが使用された場合、組織メンバーシップを作成
      if (organizationId && invitationRole && invitationCode) {
        await supabase.from('organization_members').insert({
          organization_id: organizationId,
          user_id: data.user.id,
          role: invitationRole,
        });

        // 招待コードの使用回数を取得して更新
        const { data: currentInvitation } = await supabase
          .from('organization_invitations')
          .select('used_count')
          .eq('code', invitationCode)
          .single();

        if (currentInvitation) {
          await supabase
            .from('organization_invitations')
            .update({ used_count: currentInvitation.used_count + 1 })
            .eq('code', invitationCode);
        }
      }
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

  // 招待コードで組織に参加（既存ユーザー用）
  const joinOrganization = async (invitationCode: string) => {
    const supabase = createClient();

    if (!user) {
      throw new Error('ログインしていません');
    }

    // 招待コードの検証
    const { data: invitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('code', invitationCode)
      .eq('is_active', true)
      .single();

    if (invitationError || !invitation) {
      throw new Error('招待コードが無効です');
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('招待コードの有効期限が切れています');
    }

    // 使用回数チェック
    if (invitation.used_count >= invitation.max_uses) {
      throw new Error('招待コードの使用回数が上限に達しています');
    }

    // 既に組織に所属していないかチェック（1ユーザー=1組織）
    const { data: existingMembership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (existingMembership) {
      throw new Error('既に他の事業所に所属しています。1つの事業所のみ所属できます。');
    }

    // 組織メンバーシップを作成
    const { error: insertError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (insertError) throw insertError;

    // 招待コードの使用回数を更新
    const { data: currentInvitation } = await supabase
      .from('organization_invitations')
      .select('used_count')
      .eq('code', invitationCode)
      .single();

    if (currentInvitation) {
      await supabase
        .from('organization_invitations')
        .update({ used_count: currentInvitation.used_count + 1 })
        .eq('code', invitationCode);
    }

    // プロフィールを再取得して組織情報を反映
    const { data: updatedProfile } = await supabase
      .from('app_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (updatedProfile) {
      // 組織情報も取得
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (
            name
          )
        `)
        .eq('user_id', user.id);

      const organizations = orgMembers?.map((om: any) => ({
        organization_id: om.organization_id,
        organization_name: om.organizations?.name || '不明',
        role: om.role,
      })) || [];

      setProfile({
        user_id: updatedProfile.user_id,
        full_name: updatedProfile.full_name,
        primary_role: updatedProfile.primary_role,
        phone: updatedProfile.phone,
        gender: updatedProfile.gender,
        email: user.email,
        is_super_admin: updatedProfile.primary_role === 'super_admin',
        families: [],
        organizations: organizations,
      });
    }

    return invitation.organization_id;
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
      // 組織情報も取得
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (
            name
          )
        `)
        .eq('user_id', user.id);

      const organizations = orgMembers?.map((om: any) => ({
        organization_id: om.organization_id,
        organization_name: om.organizations?.name || '不明',
        role: om.role,
      })) || [];

      setProfile({
        user_id: data.user_id,
        full_name: data.full_name,
        primary_role: data.primary_role,
        phone: data.phone,
        email: user.email,
        is_super_admin: data.primary_role === 'super_admin',
        families: [],
        organizations: organizations,
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
    joinOrganization,
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
          .then(async ({ data }) => {
            if (data) {
              // 組織情報も取得
              const { data: orgMembers } = await supabase
                .from('organization_members')
                .select(`
                  organization_id,
                  role,
                  organizations (
                    name
                  )
                `)
                .eq('user_id', user.id);

              const organizations = orgMembers?.map((om: any) => ({
                organization_id: om.organization_id,
                organization_name: om.organizations?.name || '不明',
                role: om.role,
              })) || [];

              setProfile({
                user_id: data.user_id,
                full_name: data.full_name,
                primary_role: data.primary_role,
                phone: data.phone,
                gender: data.gender,
                email: user.email,
                is_super_admin: data.primary_role === 'super_admin',
                families: [],
                organizations: organizations,
              });
            }
          });
      }
    },
  };
}
