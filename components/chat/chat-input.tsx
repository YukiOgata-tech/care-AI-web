'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string, fileSearchEnabled: boolean) => Promise<void>;
  isLoading: boolean;
}

export function ChatInput({
  onSend,
  isLoading,
  fileSearchAvailable = false,
}: ChatInputProps & { fileSearchAvailable?: boolean }) {
  const [input, setInput] = useState('');
  const [fileSearchEnabled, setFileSearchEnabled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput('');
    await onSend(content, fileSearchEnabled);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-4 space-y-3">
      {/* File Search Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="file-search"
            checked={fileSearchEnabled}
            onCheckedChange={setFileSearchEnabled}
            disabled={isLoading || !fileSearchAvailable}
          />
          <Label htmlFor="file-search" className="text-sm cursor-pointer">
            資料検索を有効にする（File Search）
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          {fileSearchEnabled ? '資料を参照して回答します' : '一般的なAI回答のみ'}
        </p>
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力... (Shift+Enterで改行)"
          className="min-h-[60px] resize-none"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="h-[60px] w-[60px]"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
}
