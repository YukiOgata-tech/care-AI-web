import { Document } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, MoreVertical, Download, Trash2, Eye } from 'lucide-react';
import {
  formatFileSize,
  formatDate,
  getCategoryColor,
  getCategoryLabel,
} from '@/lib/utils';

interface FileCardProps {
  document: Document;
  onDelete: (id: string) => void;
}

export function FileCard({ document, onDelete }: FileCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="bg-muted p-2 rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{document.fileName}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{formatFileSize(document.fileSize)}</span>
              <span>•</span>
              <span>{formatDate(document.uploadedAt)}</span>
            </div>
            <div className="mt-2">
              <Badge
                variant="outline"
                className={getCategoryColor(document.category)}
              >
                {getCategoryLabel(document.category)}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                プレビュー
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                ダウンロード
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(document.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status */}
        {document.status === 'uploading' && (
          <div className="mt-3">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse w-1/2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              アップロード中...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
