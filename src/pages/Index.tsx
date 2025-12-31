import { useState, useCallback } from 'react';
import { FileText, Upload, Link2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FileUploader, FileWithStatus } from '@/components/FileUploader';
import { TextInput } from '@/components/TextInput';
import { UploadOptionsPanel } from '@/components/UploadOptions';
import { AdvancedOptionsPanel } from '@/components/AdvancedOptions';
import { ShareResult } from '@/components/ShareResult';
import { UploadProgress } from '@/components/UploadProgress';
import { SubscriptionInput, SubscriptionResult } from '@/components/SubscriptionConverter';
import { 
  AnimatedGradientBg, 
  FlowingLines, 
  FeatureMarquee, 
  TypewriterTitle,
  AnimatedStats,
  GradientBorderCard,
  FloatingTips
} from '@/components/DynamicEffects';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile, uploadText, createSubscriptionLink } from '@/lib/api';
import { UploadOptions, SubscriptionInfo } from '@/lib/types';

const heroTitles = ['私有文件分享', '安全云剪贴板', '订阅链接转换'];
const tips = [
  '支持拖拽上传多个文件',
  '阅后即焚让分享更安全',
  '设置过期时间自动清理',
  '批量上传一键分享',
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'subscription'>('file');
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [textContent, setTextContent] = useState('');
  const [options, setOptions] = useState<UploadOptions>({});
  const [uploading, setUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(-1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<number | undefined>();
  const [remainingTime, setRemainingTime] = useState<number | undefined>();
  const [shareUrls, setShareUrls] = useState<{ shareUrl: string; rawUrl?: string }[]>([]);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const canUpload = activeTab === 'file' 
    ? files.length > 0
    : activeTab === 'text' 
    ? textContent.trim().length > 0 
    : false;

  // 新增：处理文件选择，自动过滤图片和视频
  const handleFilesSelect = (newFiles: FileWithStatus[]) => {
    const validFiles: FileWithStatus[] = [];
    let hasMedia = false;

    newFiles.forEach(f => {
      // 检查 MIME 类型
      if (f.file.type.startsWith('image/') || f.file.type.startsWith('video/')) {
        hasMedia = true;
      } else {
        validFiles.push(f);
      }
    });

    if (hasMedia) {
      toast({
        title: '不支持的文件类型',
        description: '图片和视频文件已被自动移除，仅支持普通文件上传。',
        variant: 'destructive',
      });
    }

    setFiles(validFiles);
  };

  const handleUpload = async () => {
    if (!canUpload) return;

    // 二次检查：防止上传开始前混入媒体文件
    const hasInvalidFiles = files.some(f => f.file.type.startsWith('image/') || f.file.type.startsWith('video/'));
    if (hasInvalidFiles) {
        toast({
            title: '上传被拒绝',
            description: '检测到列表中包含不支持的图片或视频文件。',
            variant: 'destructive',
        });
        // 自动清理
        setFiles(prev => prev.filter(f => !f.file.type.startsWith('image/') && !f.file.type.startsWith('video/')));
        return;
    }

    setUploading(true);
    setUploadProgress(0);
    setShareUrls([]);

    try {
      if (activeTab === 'file') {
        const updatedFiles = [...files];
        const results: { shareUrl: string; rawUrl?: string }[] = [];
        
        for (let i = 0; i < updatedFiles.length; i++) {
          setCurrentUploadIndex(i);
          updatedFiles[i].status = 'uploading';
          setFiles([...updatedFiles]);

          const result = await uploadFile(updatedFiles[i].file, options, (progress, speed, remaining) => {
            updatedFiles[i].progress = progress;
            setFiles([...updatedFiles]);
            setUploadProgress(progress);
            setUploadSpeed(speed);
            setRemainingTime(remaining);
          });

          if (result.success && result.shareUrl) {
            updatedFiles[i].status = 'success';
            updatedFiles[i].shareUrl = result.shareUrl;
            results.push({ shareUrl: result.shareUrl, rawUrl: result.rawUrl });
          } else {
            updatedFiles[i].status = 'error';
            updatedFiles[i].error = result.error;
          }
          
          setFiles([...updatedFiles]);
        }

        setShareUrls(results);
        const successCount = results.length;
        
        if (successCount > 0) {
          toast({
            title: '上传成功',
            description: files.length > 1 
              ? `成功上传 ${successCount}/${files.length} 个文件` 
              : '分享链接已生成',
          });
        }
      } else if (activeTab === 'text') {
        const result = await uploadText(textContent, options);

        if (result.success && result.shareUrl) {
          setShareUrls([{ shareUrl: result.shareUrl, rawUrl: result.rawUrl }]);

          toast({
            title: '上传成功',
            description: '分享链接已生成',
          });
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      }
    } catch (error) {
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setCurrentUploadIndex(-1);
      setUploadProgress(0);
      setUploadSpeed(undefined);
      setRemainingTime(undefined);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setTextContent('');
    setOptions({});
    setShareUrls([]);
    setSubscriptionUrl(null);
  };

  const handleSubscriptionGenerate = async (content: string, subscriptionInfo?: SubscriptionInfo) => {
    setUploading(true);
    try {
      const result = await createSubscriptionLink(content, subscriptionInfo, options);
      if (result.success && result.shareUrl) {
        setSubscriptionUrl(result.shareUrl);

        toast({
          title: '转换成功',
          description: '短链接已生成',
        });
      } else {
        throw new Error(result.error || 'Conversion failed');
      }
    } catch (error) {
      toast({
        title: '转换失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  if (shareUrls.length > 0 || subscriptionUrl) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <AnimatedGradientBg />
        <FlowingLines />
        
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center relative z-10">
          <div className="w-full max-w-lg animate-fade-in">
            {shareUrls.length > 0 ? (
              <ShareResult 
                shareUrl={shareUrls[0].shareUrl} 
                rawUrl={shareUrls[0].rawUrl} 
                allUrls={shareUrls.length > 1 ? shareUrls : undefined}
                onReset={handleReset} 
              />
            ) : (
              <SubscriptionResult shortUrl={subscriptionUrl!} onReset={handleReset} />
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* 动态背景 */}
      <AnimatedGradientBg />
      <FlowingLines className="hidden sm:block" />
      
      <Header />
      <main className="flex-1 container px-4 sm:px-8 py-6 sm:py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 sm:space-y-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight">
              <TypewriterTitle texts={heroTitles} className="gradient-text" />
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed px-4">
              基于边缘计算的现代文件分享服务
              <span className="hidden sm:inline">，支持阅后即焚、自动过期、批量上传</span>
            </p>
            
            {/* 动态统计 - 移动端隐藏 */}
            <AnimatedStats className="pt-4 hidden sm:flex" />
          </div>

          {/* 特性滚动展示 */}
          <FeatureMarquee />

          {/* Upload Area */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 order-1">
              <GradientBorderCard>
                <div className="p-4 sm:p-6 space-y-4">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                    <TabsList className="grid w-full grid-cols-3 h-11 sm:h-10">
                      <TabsTrigger value="file" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm touch-manipulation">
                        <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>文件</span>
                      </TabsTrigger>
                      <TabsTrigger value="text" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm touch-manipulation">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>剪贴板</span>
                      </TabsTrigger>
                      <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm touch-manipulation">
                        <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">订阅</span>
                        <span className="xs:hidden">转链</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="mt-4 animate-fade-in">
                      <FileUploader
                        files={files}
                        // 修改这里：使用新的处理函数来过滤非法文件
                        onFilesSelect={handleFilesSelect}
                        onRemove={handleRemoveFile}
                        disabled={uploading}
                      />
                    </TabsContent>

                    <TabsContent value="text" className="mt-4 animate-fade-in">
                      <TextInput
                        value={textContent}
                        onChange={setTextContent}
                        disabled={uploading}
                      />
                    </TabsContent>

                    <TabsContent value="subscription" className="mt-4 animate-fade-in">
                      <SubscriptionInput
                        onGenerate={handleSubscriptionGenerate}
                        disabled={uploading}
                        subscriptionInfo={options.subscriptionInfo}
                      />
                    </TabsContent>
                  </Tabs>

                  {/* Upload Progress */}
                  {uploading && activeTab === 'file' && currentUploadIndex >= 0 && files[currentUploadIndex] && (
                    <UploadProgress
                      filename={files[currentUploadIndex].file.name}
                      size={files[currentUploadIndex].file.size}
                      progress={uploadProgress}
                      status="uploading"
                      speed={uploadSpeed}
                      remainingTime={remainingTime}
                    />
                  )}

                  {/* Upload Button */}
                  {activeTab !== 'subscription' && (
                    <Button
                      onClick={handleUpload}
                      disabled={!canUpload || uploading}
                      className="w-full h-12 sm:h-14 text-base sm:text-lg group relative overflow-hidden touch-manipulation active:scale-[0.98] transition-transform"
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        {uploading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            上传中...
                          </span>
                        ) : (
                          <>
                            <Upload className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-1 group-active:scale-90" />
                            开始分享
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </Button>
                  )}
                </div>
              </GradientBorderCard>
            </div>

            {/* Options Panel - 移动端显示在下方 */}
            <div className="lg:col-span-1 space-y-4 order-2">
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <UploadOptionsPanel
                  options={options}
                  onChange={setOptions}
                  disabled={uploading}
                />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <AdvancedOptionsPanel
                  options={options}
                  onChange={setOptions}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* 浮动提示 - 移动端隐藏 */}
          <FloatingTips tips={tips} className="pt-4 hidden sm:block" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
