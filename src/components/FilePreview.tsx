import { useState, useEffect } from 'react';
import { FileText, Image, Video, FileCode, File, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FilePreviewProps {
  url: string;
  filename: string;
  mimeType: string;
  content?: string | Blob;
}

export function FilePreview({ url, filename, mimeType, content }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    if (content instanceof Blob) {
      const objectUrl = URL.createObjectURL(content);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof content === 'string') {
      setPreviewUrl(url);
      // 检查是否是 base64 图片
      if (content.startsWith('data:')) {
        setPreviewUrl(content);
      } else if (isTextType(mimeType)) {
        setTextContent(content);
      }
    } else {
      setPreviewUrl(url);
    }
  }, [content, url, mimeType]);

  const isImageType = (type: string) => type.startsWith('image/');
  const isVideoType = (type: string) => type.startsWith('video/');
  const isPdfType = (type: string) => type === 'application/pdf';
  const isTextType = (type: string) => 
    type.startsWith('text/') || 
    type === 'application/json' ||
    type === 'application/xml' ||
    type === 'application/javascript';
  const isCodeType = (type: string) =>
    type.includes('javascript') ||
    type.includes('typescript') ||
    type.includes('json') ||
    type.includes('xml') ||
    type.includes('html') ||
    type.includes('css') ||
    type.includes('yaml') ||
    type.includes('yml');

  const getFileIcon = () => {
    if (isImageType(mimeType)) return <Image className="h-6 w-6" />;
    if (isVideoType(mimeType)) return <Video className="h-6 w-6" />;
    if (isCodeType(mimeType)) return <FileCode className="h-6 w-6" />;
    if (isTextType(mimeType)) return <FileText className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  const canPreview = isImageType(mimeType) || isVideoType(mimeType) || isPdfType(mimeType) || isTextType(mimeType);

  if (!canPreview) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            {getFileIcon()}
          </div>
          <p className="text-muted-foreground">该文件类型不支持预览</p>
          <p className="text-sm text-muted-foreground">{filename}</p>
        </div>
      </div>
    );
  }

  const renderPreview = (fullscreen = false) => {
    const containerClass = fullscreen 
      ? "w-full h-full max-h-[80vh]" 
      : "w-full max-h-60 overflow-hidden rounded-lg";

    if (isImageType(mimeType)) {
      return (
        <div className={containerClass}>
          <img 
            src={previewUrl} 
            alt={filename} 
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    if (isVideoType(mimeType)) {
      return (
        <div className={containerClass}>
          <video 
            src={previewUrl} 
            controls 
            className="w-full h-full"
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      );
    }

    if (isPdfType(mimeType)) {
      return (
        <div className={fullscreen ? "w-full h-[80vh]" : "w-full h-60"}>
          <iframe 
            src={previewUrl} 
            className="w-full h-full rounded-lg border border-border"
            title={filename}
          />
        </div>
      );
    }

    if (isTextType(mimeType)) {
      const displayContent = textContent || (typeof content === 'string' ? content : '');
      return (
        <div className={`p-4 bg-muted rounded-lg ${fullscreen ? 'max-h-[80vh]' : 'max-h-60'} overflow-auto`}>
          <pre className="font-mono text-sm whitespace-pre-wrap break-all">
            {displayContent}
          </pre>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-2">
      <div className="relative group">
        {renderPreview()}
        {(isImageType(mimeType) || isPdfType(mimeType)) && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon()}
              {filename}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {renderPreview(true)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
