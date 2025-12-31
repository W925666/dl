import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, File, FileText, Clock, AlertCircle, Eye, Flame } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FilePreview } from '@/components/FilePreview';
import { AccessStats } from '@/components/AccessStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { getFileMetadata, downloadFile, formatFileSize, formatDate } from '@/lib/api';
import { FileMetadata } from '@/lib/types';

export default function Share() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [blobContent, setBlobContent] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'stats'>('preview');

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    loadMetadata();
  }, [id]);

  const loadMetadata = async () => {
    setLoading(true);
    setError(null);

    const result = await getFileMetadata(id!);

    if (!result.success) {
      setError(result.error || '无法加载文件信息');
      setLoading(false);
      return;
    }

    setMetadata(result.metadata!);
    setLoading(false);

    // Auto-load text content or previewable content
    if (result.metadata?.type === 'text' || canPreview(result.metadata?.mimeType)) {
      loadContent();
    }
  };

  const canPreview = (mimeType?: string) => {
    if (!mimeType) return false;
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('video/') || 
           mimeType === 'application/pdf' ||
           mimeType.startsWith('text/') ||
           mimeType === 'application/json';
  };

  const loadContent = async () => {
    const result = await downloadFile(id!);

    if (result.success) {
      if (typeof result.data === 'string') {
        setTextContent(result.data);
      } else if (result.data instanceof Blob) {
        setBlobContent(result.data);
      }
    }
  };

  const handleDownload = async () => {
    if (!metadata) return;

    setDownloading(true);

    try {
      const result = await downloadFile(id!);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data instanceof Blob) {
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = metadata.filename || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: '下载成功',
          description: '文件已开始下载',
        });
      } else if (typeof result.data === 'string') {
        // Text content - create text file
        const blob = new Blob([result.data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = metadata.filename || 'clipboard.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: '下载成功',
          description: '内容已保存为文本文件',
        });
      }
    } catch (err) {
      toast({
        title: '下载失败',
        description: err instanceof Error ? err.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = async () => {
    if (!textContent) return;

    try {
      await navigator.clipboard.writeText(textContent);
      toast({
        title: '复制成功',
        description: '内容已复制到剪贴板',
      });
    } catch {
      toast({
        title: '复制失败',
        description: '请手动复制内容',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>无法访问</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} className="w-full">
                返回首页
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const showPreview = canPreview(metadata?.mimeType) || metadata?.type === 'text';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  {metadata?.type === 'text' ? (
                    <FileText className="h-6 w-6 text-primary" />
                  ) : (
                    <File className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">
                    {metadata?.type === 'text' ? '在线剪贴板' : metadata?.filename}
                  </CardTitle>
                  {metadata?.size && (
                    <CardDescription>{formatFileSize(metadata.size)}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Info */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>上传于 {metadata && formatDate(metadata.createdAt)}</span>
                </div>
                {metadata?.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>过期于 {formatDate(metadata.expiresAt)}</span>
                  </div>
                )}
                {metadata?.maxDownloads && (
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>
                      已下载 {metadata.downloadCount} / {metadata.maxDownloads} 次
                    </span>
                  </div>
                )}
                {metadata?.burnAfterRead && (
                  <div className="flex items-center gap-2 text-destructive">
                    <Flame className="h-4 w-4" />
                    <span>阅后即焚 - 访问后自动销毁</span>
                  </div>
                )}
              </div>

              {/* Tabs for Preview and Stats */}
              {(showPreview || (metadata?.accessLogs && metadata.accessLogs.length > 0)) && (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      预览
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      统计
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="mt-4">
                    {showPreview && (
                      <FilePreview
                        url={`/raw/${id}`}
                        filename={metadata?.filename || ''}
                        mimeType={metadata?.mimeType || 'text/plain'}
                        content={textContent || blobContent || undefined}
                      />
                    )}

                    {/* Text Content Preview */}
                    {metadata?.type === 'text' && textContent && !showPreview && (
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="font-mono text-sm whitespace-pre-wrap break-all max-h-60 overflow-auto">
                          {textContent}
                        </pre>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="stats" className="mt-4">
                    <AccessStats
                      downloadCount={metadata?.downloadCount || 0}
                      accessLogs={metadata?.accessLogs}
                    />
                  </TabsContent>
                </Tabs>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {metadata?.type === 'text' ? (
                  <>
                    <Button onClick={handleCopyText} className="flex-1">
                      复制内容
                    </Button>
                    <Button variant="outline" onClick={handleDownload} disabled={downloading} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      下载文本
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleDownload} disabled={downloading} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    {downloading ? '下载中...' : '下载文件'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
