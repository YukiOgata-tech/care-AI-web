'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Trash2,
  Search,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyPermissions, type FamilyRole } from '@/hooks/useFamilyPermissions';
import { FileUpload } from '@/components/files/file-upload';
import { toast } from 'sonner';
import { getCategoryLabel } from '@/lib/utils';
import { DocumentCategory } from '@/lib/types';

interface FamilyFile {
  id: string;
  family_id: string;
  uploaded_by: string;
  category: string | null;
  original_name: string;
  supabase_path: string;
  created_at: string;
  index_status: string;
  uploader_name: string | null;
}

interface FamilyInfo {
  id: string;
  label: string;
  service_status: string;
}

const categories: (DocumentCategory | 'all')[] = [
  'all',
  'emergency',
  'medication',
  'care_plan',
  'doctor_order',
  'manual',
  'other',
];

export default function FamilyFilesPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const familyId = params.id as string;
  const permissions = useFamilyPermissions(familyId);

  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [files, setFiles] = useState<FamilyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [userRole, setUserRole] = useState<FamilyRole | null>(null);

  const supabase = createClient();

  // ローカルでロールベースの権限を計算
  const canUploadFiles = userRole && ['family', 'care_staff', 'care_manager'].includes(userRole);
  const canDeleteFiles = userRole && ['family', 'care_manager'].includes(userRole);
  const canManageFiles = canUploadFiles || canDeleteFiles;

  // デバッグ用: 権限情報をログ出力
  useEffect(() => {
    console.log('🔍 Family Permissions Debug:', {
      familyId,
      userRole,
      'Hook permissions': {
        role: permissions.role,
        canUploadFiles: permissions.canUploadFiles,
        canDeleteFiles: permissions.canDeleteFiles,
        canManageFiles: permissions.canUploadFiles || permissions.canDeleteFiles,
      },
      'Local permissions': {
        canUploadFiles,
        canDeleteFiles,
        canManageFiles,
      },
      profileUserId: profile?.user_id,
    });
  }, [permissions, familyId, profile, userRole, canUploadFiles, canDeleteFiles, canManageFiles]);

  useEffect(() => {
    if (profile && familyId) {
      checkAccessAndFetch();
    }
  }, [profile, familyId]);

  const checkAccessAndFetch = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // 家族メンバーであることを確認
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('role')
        .eq('family_id', familyId)
        .eq('user_id', profile.user_id)
        .single();

      if (memberError || !memberData) {
        toast.error('この家族のファイルにアクセスする権限がありません');
        router.replace('/files');
        return;
      }

      // ユーザーのロールを保存
      setUserRole(memberData.role as FamilyRole);
      console.log('✅ User role set:', memberData.role);

      // 家族情報取得
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, label, service_status')
        .eq('id', familyId)
        .single();

      if (familyError) throw familyError;
      setFamily(familyData);

      // ファイル一覧取得
      await fetchFiles();
    } catch (error: any) {
      console.error('データ取得エラー:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const { data: filesData, error: filesError } = await supabase
        .from('family_files')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      // アップロード者の名前を取得
      const filesWithUploader = await Promise.all(
        (filesData || []).map(async (file) => {
          const { data: profileData } = await supabase
            .from('app_profiles')
            .select('full_name')
            .eq('user_id', file.uploaded_by)
            .single();

          return {
            ...file,
            uploader_name: profileData?.full_name || null,
          };
        })
      );

      setFiles(filesWithUploader);
    } catch (error: any) {
      console.error('ファイル取得エラー:', error);
    }
  };

  const handleUpload = async (file: File, category: string) => {
    if (!profile || !family) {
      throw new Error('認証情報または家族情報が見つかりません');
    }

    try {
      // SHA256ハッシュを計算
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // 重複チェック
      const { data: existingFile } = await supabase
        .from('family_files')
        .select('id, original_name')
        .eq('family_id', familyId)
        .eq('content_sha256', hashHex)
        .single();

      if (existingFile) {
        toast.error(`同じファイル「${existingFile.original_name}」が既にアップロードされています`);
        throw new Error('Duplicate file');
      }

      // Supabase Storageにアップロード
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `families/${familyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('family-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // family_filesテーブルに記録
      const { data: insertedFile, error: insertError } = await supabase
        .from('family_files')
        .insert({
          family_id: familyId,
          uploaded_by: profile.user_id,
          category: category,
          original_name: file.name,
          supabase_path: filePath,
          content_sha256: hashHex,
          index_status: 'queued',
        })
        .select()
        .single();

      if (insertError || !insertedFile) {
        // テーブル挿入失敗時はStorageからも削除
        await supabase.storage.from('family-files').remove([filePath]);
        throw insertError;
      }

      toast.success('ファイルをアップロードしました。AI検索用にインデックス作成中...');

      // Vector Storeにアップロード（非同期）
      try {
        const response = await fetch('/api/files/upload-to-vector-store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId: insertedFile.id }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Vector Store upload failed');
        }

        const result = await response.json();
        console.log('Vector Store upload result:', result);
        toast.success('ファイルのインデックス作成が完了しました');
      } catch (vectorError: any) {
        console.error('Vector Store upload error:', vectorError);
        toast.error('AI検索用のインデックス作成に失敗しました。後ほど自動的に再試行されます。');
      }

      await fetchFiles();
    } catch (error: any) {
      console.error('アップロードエラー:', error);
      if (error.message !== 'Duplicate file') {
        toast.error('ファイルのアップロードに失敗しました');
      }
      throw error;
    }
  };

  const handleDownload = async (file: FamilyFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('family-files')
        .download(file.supabase_path);

      if (error) throw error;

      // ダウンロード
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('ファイルをダウンロードしました');
    } catch (error: any) {
      console.error('ダウンロードエラー:', error);
      toast.error('ファイルのダウンロードに失敗しました');
    }
  };

  const handleDelete = async (file: FamilyFile) => {
    if (!confirm(`「${file.original_name}」を削除してもよろしいですか？`)) return;

    try {
      // Storageから削除
      const { error: storageError } = await supabase.storage
        .from('family-files')
        .remove([file.supabase_path]);

      if (storageError) throw storageError;

      // テーブルから削除
      const { error: deleteError } = await supabase
        .from('family_files')
        .delete()
        .eq('id', file.id);

      if (deleteError) throw deleteError;

      toast.success('ファイルを削除しました');
      await fetchFiles();
    } catch (error: any) {
      console.error('削除エラー:', error);
      toast.error('ファイルの削除に失敗しました');
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.original_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryCount = (category: DocumentCategory | 'all') => {
    if (category === 'all') return files.length;
    return files.filter((f) => f.category === category).length;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-600">検索可能</Badge>;
      case 'queued':
        return <Badge variant="secondary">処理待ち</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">処理中</Badge>;
      case 'failed':
        return <Badge variant="destructive">失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">家族が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{family.label} - ファイル管理</h1>
            </div>
            <p className="text-muted-foreground">
              {files.length}件のファイルが登録されています
            </p>
          </div>
          {canManageFiles && <FileUpload onUpload={handleUpload} />}
        </div>
      </div>

      {/* 権限警告 */}
      {!canManageFiles && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                閲覧のみ可能
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                ファイルのアップロードと削除はできません
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ファイル名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs by Category */}
      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="gap-2">
              {category === 'all' ? 'すべて' : getCategoryLabel(category)}
              <Badge variant="secondary" className="ml-1">
                {getCategoryCount(category)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            {filteredFiles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {searchQuery
                      ? '検索結果が見つかりませんでした'
                      : 'このカテゴリにはまだファイルがありません'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredFiles.map((file) => (
                  <Card key={file.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-lg">{file.original_name}</CardTitle>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                            {file.category && (
                              <Badge variant="outline">
                                {getCategoryLabel(file.category as DocumentCategory)}
                              </Badge>
                            )}
                            {getStatusBadge(file.index_status)}
                            <span>•</span>
                            <span>アップロード: {file.uploader_name || '不明'}</span>
                            <span>•</span>
                            <span>{new Date(file.created_at).toLocaleDateString('ja-JP')}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canDeleteFiles && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(file)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
