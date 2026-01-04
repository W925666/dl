import { useState, useRef, useEffect } from 'react';
import { Check, Copy, QrCode, ExternalLink, FileText, Home, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QRCode from 'react-qr-code';

interface ShareResultProps {
  shareUrl: string;
  rawUrl?: string;
  allUrls?: { shareUrl: string; rawUrl?: string }[];
  onReset: () => void;
}

// 成功动画组件
function SuccessAnimation() {
  return (
    <div className="relative w-20 h-20">
      {/* 外圈动画 */}
      <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" />
      {/* 中圈 */}
      <div className="absolute inset-2 rounded-full bg-success/30 animate-pulse" />
      {/* 内圈和图标 */}
      <div className="absolute inset-0 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
        <Check className="h-10 w-10 text-success" />
      </div>
      {/* 星星装饰 */}
      <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-success animate-bounce" style={{ animationDelay: '0.2s' }} />
      <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-success animate-bounce" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}

export function ShareResult({ shareUrl, rawUrl, allUrls, onReset }: ShareResultProps) {
  const [copied, setCopied] = useState<'share' | 'raw' | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'raw'>('raw');
  const [showAllUrls, setShowAllUrls] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentUrl = activeTab === 'raw' && rawUrl ? rawUrl : shareUrl;
  const hasMultipleFiles = allUrls && allUrls.length > 1;

  // 自动选中链接文本
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // 复制到剪贴板的通用函数（兼容非安全上下文）
  const copyToClipboard = async (text: string): Promise<boolean> => {
    // 优先使用 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // 继续尝试备用方案
      }
    }
    
    // 备用方案：使用 execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  };

  // 点击输入框自动复制
  const handleInputClick = async (url: string, type: 'share' | 'raw') => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(type);
      toast({
        title: '已复制到剪贴板',
        description: '链接已自动复制',
      });
      setTimeout(() => setCopied(null), 2000);
    } else {
      // 如果复制失败，选中文本让用户手动复制
      inputRef.current?.select();
      toast({
        title: '请手动复制',
        description: '已选中链接，请按 Ctrl+C 复制',
      });
    }
  };

  const handleCopy = async (type: 'share' | 'raw', url?: string) => {
    const targetUrl = url || (type === 'raw' && rawUrl ? rawUrl : shareUrl);
    const success = await copyToClipboard(targetUrl);
    if (success) {
      setCopied(type);
      toast({
        title: '复制成功',
        description: type === 'raw' ? '原始内容链接已复制' : '分享页面链接已复制',
      });
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast({
        title: '复制失败',
        description: '请手动选择链接并复制',
        variant: 'destructive',
      });
    }
  };

  const handleCopyAll = async () => {
    if (!allUrls) return;
    const urls = allUrls.map(u => activeTab === 'raw' && u.rawUrl ? u.rawUrl : u.shareUrl).join('\n');
    const success = await copyToClipboard(urls);
    if (success) {
      toast({
        title: '复制成功',
        description: `已复制 ${allUrls.length} 个链接`,
      });
    } else {
      toast({
        title: '复制失败',
        description: '请手动复制链接',
        variant: 'destructive',
      });
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + C 复制当前链接
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !window.getSelection()?.toString()) {
        handleCopy(activeTab);
      }
      // Ctrl/Cmd + Q 切换二维码
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setShowQR(prev => !prev);
      }
      // Ctrl/Cmd + O 打开链接
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        window.open(currentUrl, '_blank');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, currentUrl]);

  return (
    <div className="glass-card p-5 sm:p-8 space-y-5 sm:space-y-6 animate-slide-up">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <SuccessAnimation />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold animate-fade-in" style={{ animationDelay: '0.3s' }}>
            上传成功!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {hasMultipleFiles ? `已上传 ${allUrls.length} 个文件` : '点击链接可自动复制'}
          </p>
        </div>
      </div>

      <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
        {rawUrl ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'share' | 'raw')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="raw" className="flex items-center gap-2 h-10 text-sm sm:text-base touch-manipulation">
                <FileText className="h-4 w-4" />
                原始内容
              </TabsTrigger>
              <TabsTrigger value="share" className="flex items-center gap-2 h-10 text-sm sm:text-base touch-manipulation">
                <ExternalLink className="h-4 w-4" />
                分享页面
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="raw" className="space-y-4 mt-4">
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                点击链接直接显示文件原始内容
              </p>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={rawUrl}
                  readOnly
                  className={`font-mono text-sm h-12 cursor-pointer transition-all ${copied === 'raw' ? 'ring-2 ring-success' : ''}`}
                  onFocus={handleInputFocus}
                  onClick={() => handleInputClick(rawUrl, 'raw')}
                />
                <Button 
                  onClick={() => handleCopy('raw')} 
                  variant="outline" 
                  size="icon"
                  className={`h-12 w-12 transition-all touch-manipulation active:scale-90 ${copied === 'raw' ? 'bg-success/10 border-success' : ''}`}
                >
                  {copied === 'raw' ? (
                    <Check className="h-5 w-5 text-success animate-scale-in" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="share" className="space-y-4 mt-4">
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                带有文件信息的分享页面，需要点击下载
              </p>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className={`font-mono text-sm h-12 cursor-pointer transition-all ${copied === 'share' ? 'ring-2 ring-success' : ''}`}
                  onFocus={handleInputFocus}
                  onClick={() => handleInputClick(shareUrl, 'share')}
                />
                <Button 
                  onClick={() => handleCopy('share')} 
                  variant="outline" 
                  size="icon"
                  className={`h-12 w-12 transition-all touch-manipulation active:scale-90 ${copied === 'share' ? 'bg-success/10 border-success' : ''}`}
                >
                  {copied === 'share' ? (
                    <Check className="h-5 w-5 text-success animate-scale-in" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className={`font-mono text-sm h-12 cursor-pointer transition-all ${copied === 'share' ? 'ring-2 ring-success' : ''}`}
              onFocus={handleInputFocus}
              onClick={() => handleInputClick(shareUrl, 'share')}
            />
            <Button 
              onClick={() => handleCopy('share')} 
              variant="outline" 
              size="icon"
              className={`h-12 w-12 transition-all touch-manipulation active:scale-90 ${copied === 'share' ? 'bg-success/10 border-success' : ''}`}
            >
              {copied === 'share' ? (
                <Check className="h-5 w-5 text-success animate-scale-in" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Multiple files list */}
      {hasMultipleFiles && (
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Button
            variant="ghost"
            className="w-full justify-between h-12 touch-manipulation"
            onClick={() => setShowAllUrls(!showAllUrls)}
          >
            <span>查看所有链接 ({allUrls.length})</span>
            {showAllUrls ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
          
          {showAllUrls && (
            <div className="space-y-2 max-h-48 overflow-y-auto animate-fade-in overscroll-contain">
              {allUrls.map((item, index) => (
                <div key={index} className="flex gap-2 items-center animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <Input
                    value={activeTab === 'raw' && item.rawUrl ? item.rawUrl : item.shareUrl}
                    readOnly
                    className="font-mono text-xs flex-1 cursor-pointer h-10"
                    onClick={() => handleInputClick(activeTab === 'raw' && item.rawUrl ? item.rawUrl : item.shareUrl, activeTab)}
                  />
                  <Button
                    onClick={() => handleCopy(activeTab, activeTab === 'raw' && item.rawUrl ? item.rawUrl : item.shareUrl)}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 touch-manipulation active:scale-90 transition-transform"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={handleCopyAll} variant="secondary" className="w-full mt-2 h-11 touch-manipulation">
                <Copy className="mr-2 h-4 w-4" />
                复制全部链接
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '0.7s' }}>
        <Button 
          onClick={() => handleCopy(activeTab)} 
          className={`h-12 transition-all touch-manipulation active:scale-[0.98] ${copied === activeTab ? 'bg-success hover:bg-success/90' : ''}`}
        >
          {copied === activeTab ? (
            <>
              <Check className="mr-2 h-5 w-5 animate-scale-in" />
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
          {showQR ? '隐藏' : '扫码下载'}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open(currentUrl, '_blank')}
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          打开链接
        </Button>
      </div>

      {showQR && (
        <div className="flex flex-col items-center gap-4 p-5 sm:p-6 bg-background rounded-xl animate-scale-in">
          <div className="p-4 bg-white rounded-lg">
            <QRCode value={currentUrl} size={180} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            使用手机扫描二维码即可直接下载
          </p>
        </div>
      )}

      {/* 快捷键提示 - 移动端隐藏 */}
      <div className="hidden sm:block text-xs text-muted-foreground text-center space-x-4 animate-fade-in" style={{ animationDelay: '0.8s' }}>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+C</kbd> 复制</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+Q</kbd> 二维码</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+O</kbd> 打开</span>
      </div>

      <div className="pt-4 border-t border-border grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.9s' }}>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/'} 
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          <Home className="mr-2 h-5 w-5" />
          返回主页
        </Button>
        <Button 
          variant="ghost" 
          onClick={onReset} 
          className="h-12 touch-manipulation active:scale-[0.98] transition-transform"
        >
          继续分享
        </Button>
      </div>
    </div>
  );
}
