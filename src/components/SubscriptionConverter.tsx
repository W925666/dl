import { useState } from 'react';
import { Link2, Copy, Check, QrCode, ExternalLink, Share2, Home, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import QRCode from 'react-qr-code';
import { SubscriptionInfo } from '@/lib/types';

interface SubscriptionInputProps {
  onGenerate: (content: string, subscriptionInfo?: SubscriptionInfo) => void;
  disabled?: boolean;
  subscriptionInfo?: SubscriptionInfo;
}

// 验证订阅链接是否有效
async function validateSubscriptionUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
    });
    return { valid: true };
  } catch (error) {
    return { valid: false, error: '无法连接到订阅链接，请检查链接是否正确' };
  }
}

export function SubscriptionInput({ onGenerate, disabled, subscriptionInfo }: SubscriptionInputProps) {
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !isValidUrl(url.trim())) return;

    setIsValidating(true);
    
    const validation = await validateSubscriptionUrl(url.trim());
    
    if (!validation.valid) {
      toast({
        title: '订阅链接无效',
        description: validation.error,
        variant: 'destructive',
      });
      setIsValidating(false);
      return;
    }

    // 检查是否有实际的非空订阅信息值
    const hasValidInfo = subscriptionInfo && Object.values(subscriptionInfo).some(v => v !== undefined && v !== '');
    const info = hasValidInfo ? subscriptionInfo : undefined;
    
    console.log('Submitting subscription with info:', info); // 调试日志
    
    onGenerate(url.trim(), info);
    setIsValidating(false);
  };

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm sm:text-base font-medium">订阅链接</span>
          </div>
          <Input
            type="url"
            placeholder="https://example.com/subscribe?token=xxx"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled || isValidating}
            className="font-mono text-sm sm:text-base h-12"
          />
          <p className="text-xs sm:text-sm text-muted-foreground">
            支持 Clash、V2Ray、Shadowsocks、Trojan 及所有节点协议的机场订阅链接
          </p>
        </div>

        <Button
          type="submit"
          disabled={!url.trim() || !isValidUrl(url.trim()) || disabled || isValidating}
          className="w-full h-12 sm:h-14 text-base touch-manipulation active:scale-[0.98] transition-transform"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              验证中...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-5 w-5" />
              生成短链接
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

interface SubscriptionResultProps {
  shortUrl: string;
  onReset: () => void;
}

export function SubscriptionResult({ shortUrl, onReset }: SubscriptionResultProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      toast({
        title: '复制成功',
        description: '短链接已复制到剪贴板',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: '复制失败',
        description: '请手动复制链接',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '订阅链接',
          text: '我的订阅短链接',
          url: shortUrl,
        });
      } catch {
        // 用户取消分享
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="glass-card p-5 sm:p-8 space-y-5 sm:space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 sm:h-10 sm:w-10 text-success" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">短链接已生成</h2>
        <p className="text-sm sm:text-base text-muted-foreground">可直接在客户端中使用</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={shortUrl}
          readOnly
          className="font-mono text-sm h-12"
        />
        <Button 
          onClick={handleCopy} 
          variant="outline" 
          size="icon"
          className="h-12 w-12 touch-manipulation active:scale-90 transition-transform"
        >
          {copied ? (
            <Check className="h-5 w-5 text-success" />
          ) : (
            <Copy className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button 
          onClick={handleCopy} 
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-5 w-5" />
              已复制
            </>
          ) : (
            <>
              <Copy className="mr-2 h-5 w-5" />
              复制链接
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowQR(!showQR)}
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <QrCode className="mr-2 h-5 w-5" />
          {showQR ? '隐藏' : '显示'}二维码
        </Button>
        <Button
          variant="outline"
          onClick={handleShare}
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <Share2 className="mr-2 h-5 w-5" />
          分享
        </Button>
      </div>

      <Button
        variant="outline"
        onClick={() => window.open(shortUrl, '_blank')}
        className="w-full h-12 touch-manipulation active:scale-[0.98] transition-transform"
      >
        <ExternalLink className="mr-2 h-5 w-5" />
        打开链接
      </Button>

      {showQR && (
        <div className="flex justify-center p-6 bg-background rounded-xl animate-fade-in">
          <div className="p-4 bg-white rounded-lg">
            <QRCode value={shortUrl} size={180} />
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-border grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/'} 
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <Home className="mr-2 h-5 w-5" />
          返回主页
        </Button>
        <Button 
          variant="outline" 
          onClick={onReset} 
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          转换新链接
        </Button>
      </div>
    </div>
  );
}
