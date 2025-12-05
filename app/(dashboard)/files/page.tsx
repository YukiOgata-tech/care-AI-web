'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCard } from '@/components/files/file-card';
import { FileUpload } from '@/components/files/file-upload';
import { useDocumentStore } from '@/lib/store';
import { Search } from 'lucide-react';
import { getCategoryLabel } from '@/lib/utils';
import { DocumentCategory } from '@/lib/types';
import { toast } from 'sonner';

const categories: (DocumentCategory | 'all')[] = [
  'all',
  'emergency',
  'medication',
  'care_plan',
  'doctor_order',
  'manual',
  'other',
];

export default function FilesPage() {
  const documents = useDocumentStore((state) => state.documents);
  const uploadDocument = useDocumentStore((state) => state.uploadDocument);
  const deleteDocument = useDocumentStore((state) => state.deleteDocument);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.fileName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = (id: string) => {
    if (confirm('このファイルを削除してもよろしいですか？')) {
      deleteDocument(id);
      toast.success('ファイルを削除しました');
    }
  };

  const getCategoryCount = (category: DocumentCategory | 'all') => {
    if (category === 'all') return documents.length;
    return documents.filter((d) => d.category === category).length;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ファイル管理</h1>
          <p className="text-muted-foreground">
            アップロードされた資料を管理します
          </p>
        </div>
        <FileUpload onUpload={uploadDocument} />
      </div>

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
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? '検索結果が見つかりませんでした'
                    : 'このカテゴリにはまだファイルがありません'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((document) => (
                  <FileCard
                    key={document.id}
                    document={document}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
