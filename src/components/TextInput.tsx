import { Textarea } from '@/components/ui/textarea';
import { Clipboard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextInput({ value, onChange, disabled }: TextInputProps) {
  const { toast } = useToast();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        toast({
          title: '粘贴成功',
          description: `已粘贴 ${text.length} 个字符`,
        });
      }
    } catch {
      toast({
        title: '粘贴失败',
        description: '无法读取剪贴板内容',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const characterCount = value.length;
  const lineCount = value.split('\n').length;

  return (
    <div className="glass-card p-4 sm:p-5 space-y-3">
      <div className="relative group">
        <Textarea
          placeholder="粘贴节点或订阅内容...&#10;&#10;支持格式：&#10;• 单节点：ss://、vmess://、vless://、trojan://、hysteria://、hy2:// 等&#10;• Base64编码的节点列表&#10;• Clash/V2Ray/Surge 等客户端配置"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="min-h-[200px] sm:min-h-[250px] resize-none border-0 bg-transparent focus-visible:ring-0 font-mono text-sm sm:text-base pr-14"
        />
        {/* 快捷操作按钮 - 移动端始终显示 */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePaste}
            disabled={disabled}
            className="h-10 w-10 sm:h-9 sm:w-9 bg-background/80 backdrop-blur-sm hover:bg-background active:scale-90 transition-transform touch-manipulation rounded-xl"
            title="从剪贴板粘贴"
          >
            <Clipboard className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
          {value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={disabled}
              className="h-10 w-10 sm:h-9 sm:w-9 bg-background/80 backdrop-blur-sm hover:bg-background hover:text-destructive active:scale-90 transition-transform animate-fade-in touch-manipulation rounded-xl"
              title="清空内容"
            >
              <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
        <div className="flex gap-3">
          <span>{characterCount} 字符</span>
          {characterCount > 0 && <span>{lineCount} 行</span>}
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+V</kbd>
          <span>粘贴</span>
        </div>
      </div>
    </div>
  );
}
