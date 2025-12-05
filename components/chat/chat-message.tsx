import { Message } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatDateTime } from '@/lib/utils';
import { Bot, User, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 py-4',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarFallback
          className={cn(
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
              : 'bg-gradient-to-br from-green-600 to-teal-600 text-white'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn('flex-1 space-y-2', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-3 max-w-[80%]',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground')}>
          <span>{formatDateTime(message.timestamp)}</span>
          {message.fileSearchUsed && (
            <Badge variant="outline" className="text-xs gap-1">
              <FileText className="h-3 w-3" />
              資料参照
            </Badge>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="text-xs space-y-1 max-w-[80%]">
            <p className="font-medium text-muted-foreground">参照資料:</p>
            {message.sources.map((source, idx) => (
              <div
                key={idx}
                className="rounded border bg-card p-2 text-muted-foreground"
              >
                <p className="font-medium">{source.fileName}</p>
                {source.page && <p>ページ {source.page}</p>}
                <p className="line-clamp-2 mt-1">{source.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
