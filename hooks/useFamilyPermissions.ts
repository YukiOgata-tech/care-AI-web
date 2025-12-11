import { useMemo } from 'react';
import { useAuth } from './useAuth';

export type FamilyRole = 'family' | 'external_family' | 'care_staff' | 'care_manager';

export interface FamilyPermissions {
  // ロール情報
  role: FamilyRole | null;
  isFamily: boolean;
  isExternalFamily: boolean;
  isCareStaff: boolean;
  isCareManager: boolean;

  // 閲覧権限
  canViewInfo: boolean;
  canViewFiles: boolean;
  canViewCareRecords: boolean;

  // 編集権限
  canEditInfo: boolean;
  canEditCareRecords: boolean;

  // AI・チャット権限
  canUseAIChat: boolean;

  // ファイル管理権限
  canUploadFiles: boolean;
  canDeleteFiles: boolean;

  // メンバー管理権限
  canInviteMembers: boolean;
  canRemoveMembers: boolean;

  // 通知受信
  canReceiveNotifications: boolean;
}

/**
 * 家族メンバーの権限を管理するカスタムフック
 *
 * @param familyId - 家族ID
 * @returns 権限情報オブジェクト
 *
 * @example
 * const permissions = useFamilyPermissions(familyId);
 * if (permissions.canUseAIChat) {
 *   // AIチャット機能を表示
 * }
 */
export function useFamilyPermissions(familyId: string): FamilyPermissions {
  const { profile } = useAuth();

  const permissions = useMemo(() => {
    // ユーザーが家族メンバーか確認
    const familyMember = profile?.families?.find(f => f.family_id === familyId);
    const memberRole = familyMember?.role as FamilyRole | undefined;

    // 事業所メンバーとしてのアクセス権限も確認
    const isOrgOwnerOrManager = profile?.organizations?.some(
      org => ['owner', 'manager'].includes(org.role)
    );

    const isSuperAdmin = profile?.is_super_admin || false;

    // ロールがない場合のデフォルト権限（アクセス不可）
    if (!memberRole && !isOrgOwnerOrManager && !isSuperAdmin) {
      return {
        role: null,
        isFamily: false,
        isExternalFamily: false,
        isCareStaff: false,
        isCareManager: false,
        canViewInfo: false,
        canViewFiles: false,
        canViewCareRecords: false,
        canEditInfo: false,
        canEditCareRecords: false,
        canUseAIChat: false,
        canUploadFiles: false,
        canDeleteFiles: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canReceiveNotifications: false,
      };
    }

    // Super AdminまたはOrg Owner/Managerは全権限
    if (isSuperAdmin || isOrgOwnerOrManager) {
      return {
        role: memberRole || 'care_manager',
        isFamily: memberRole === 'family',
        isExternalFamily: memberRole === 'external_family',
        isCareStaff: memberRole === 'care_staff',
        isCareManager: true, // 管理者として扱う
        canViewInfo: true,
        canViewFiles: true,
        canViewCareRecords: true,
        canEditInfo: true,
        canEditCareRecords: true,
        canUseAIChat: true,
        canUploadFiles: true,
        canDeleteFiles: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canReceiveNotifications: true,
      };
    }

    // ロール別の権限設定
    const rolePermissions: Record<FamilyRole, FamilyPermissions> = {
      // 同居家族: フルアクセス
      family: {
        role: 'family',
        isFamily: true,
        isExternalFamily: false,
        isCareStaff: false,
        isCareManager: false,
        canViewInfo: true,
        canViewFiles: true,
        canViewCareRecords: true,
        canEditInfo: true,
        canEditCareRecords: true,
        canUseAIChat: true, // ✅ AIチャット可能
        canUploadFiles: true,
        canDeleteFiles: true,
        canInviteMembers: false,
        canRemoveMembers: false,
        canReceiveNotifications: true,
      },

      // 外部家族: 閲覧のみ、AIチャット不可
      external_family: {
        role: 'external_family',
        isFamily: false,
        isExternalFamily: true,
        isCareStaff: false,
        isCareManager: false,
        canViewInfo: true,
        canViewFiles: true, // 閲覧のみ
        canViewCareRecords: true,
        canEditInfo: false, // ❌ 編集不可
        canEditCareRecords: false,
        canUseAIChat: false, // ❌ AIチャット不可
        canUploadFiles: false,
        canDeleteFiles: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canReceiveNotifications: true, // 通知は受信可能
      },

      // ケアスタッフ: ケア記録管理、AIチャット可能
      care_staff: {
        role: 'care_staff',
        isFamily: false,
        isExternalFamily: false,
        isCareStaff: true,
        isCareManager: false,
        canViewInfo: true,
        canViewFiles: true,
        canViewCareRecords: true,
        canEditInfo: false, // 基本情報は編集不可
        canEditCareRecords: true, // ケア記録は編集可能
        canUseAIChat: true, // ✅ AIチャット可能
        canUploadFiles: true,
        canDeleteFiles: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canReceiveNotifications: true,
      },

      // ケアマネージャー: 全権限
      care_manager: {
        role: 'care_manager',
        isFamily: false,
        isExternalFamily: false,
        isCareStaff: false,
        isCareManager: true,
        canViewInfo: true,
        canViewFiles: true,
        canViewCareRecords: true,
        canEditInfo: true,
        canEditCareRecords: true,
        canUseAIChat: true, // ✅ AIチャット可能
        canUploadFiles: true,
        canDeleteFiles: true,
        canInviteMembers: true, // メンバー招待可能
        canRemoveMembers: true,
        canReceiveNotifications: true,
      },
    };

    return rolePermissions[memberRole!] || rolePermissions.external_family;
  }, [profile, familyId]);

  return permissions;
}

/**
 * ロール名を日本語表示用に変換
 */
export function getRoleLabel(role: FamilyRole): string {
  const labels: Record<FamilyRole, string> = {
    family: '家族（同居）',
    external_family: '外部家族',
    care_staff: 'ケアスタッフ',
    care_manager: 'ケアマネージャー',
  };
  return labels[role] || role;
}

/**
 * ロールの説明を取得
 */
export function getRoleDescription(role: FamilyRole): string {
  const descriptions: Record<FamilyRole, string> = {
    family: '同居している家族メンバー - フルアクセス',
    external_family: '同居していない家族メンバー - 閲覧のみ、AIチャット不可',
    care_staff: 'ケアスタッフ - ケア記録管理',
    care_manager: 'ケアマネージャー - 全権限、メンバー招待可能',
  };
  return descriptions[role] || '';
}

/**
 * ロールアイコンを取得
 */
export function getRoleIcon(role: FamilyRole): string {
  const icons: Record<FamilyRole, string> = {
    family: '👨‍👩‍👧‍👦',
    external_family: '🏠',
    care_staff: '👔',
    care_manager: '👨‍⚕️',
  };
  return icons[role] || '👤';
}
