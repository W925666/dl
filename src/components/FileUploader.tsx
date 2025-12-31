import { useState, useCallback, useRef, useId } from 'react';
import { 
  Upload, File, X, CheckCircle2, AlertCircle, Loader2,
  FileText, FileCode, FileArchive, Settings, Database, Binary, FileAudio, FileVideo, FileImage
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export interface FileWithStatus {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  shareUrl?: string;
  error?: string;
}

interface FileUploaderProps {
  onFilesSelect: (files: FileWithStatus[]) => void;
  files: FileWithStatus[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

let fileIdCounter = 0;

// --- 图标逻辑：根据文件类型显示更直观的图标 ---
function getFileIcon(mimeType: string, filename: string) {
  // 1. 优先处理媒体类型（虽然会被拦截，但为了逻辑完整）
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;

  // 2. 处理无后缀文件
  if (!filename.includes('.')) return Binary;

  // 3. 处理常见后缀
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FileArchive;
  if (['dat', 'mmdb', 'db', 'csv', 'sql', 'mdb'].includes(ext)) return Database;
  if (['json', 'yaml', 'yml', 'toml', 'xml', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'go', 'java', 'c', 'cpp'].includes(ext)) return FileCode;
  if (['conf', 'config', 'ini', 'prop', 'properties', 'ovpn', 'cfg', 'pref', 'plist'].includes(ext)) return Settings;
  
  // 4. 默认文本
  return FileText;
}

function getFileColor(mimeType: string, filename: string) {
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) return 'text-red-500';
  
  if (!filename.includes('.')) return 'text-gray-500';

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['dat', 'mmdb', 'db'].includes(ext)) return 'text-blue-500';
  if (['yaml', 'yml'].includes(ext)) return 'text-purple-500';
  if (['json', 'js', 'ts'].includes(ext)) return 'text-green-500';
  if (['conf', 'ovpn', 'ini'].includes(ext)) return 'text-orange-500';
  if (['zip', 'rar'].includes(ext)) return 'text-yellow-600';
  
  return 'text-primary';
}

export function FileUploader({ onFilesSelect, files, onRemove, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { toast } = useToast();

  // --- 核心校验逻辑：只限制媒体文件，其他全放行 ---
  const isFileAllowed = (file: File): boolean => {
    // 拦截图片
    if (file.type.startsWith('image/')) return false;
    // 拦截视频
    if (file.type.startsWith('video/')) return false;
    // 拦截音频
    if (file.type.startsWith('audio/')) return false;

    // 其他所有文件（包括无后缀、二进制、压缩包、文档等）全部允许
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const validFiles: FileWithStatus[] = [];
    let hasInvalidFile = false;

    rawFiles.forEach(file => {
      if (isFileAllowed(file)) {
        validFiles.push({
          file,
          id: `file-${++fileIdCounter}`,
          status: 'pending',
          progress: 0,
        });
      } else {
        hasInvalidFile = true;
      }
    });

    if (hasInvalidFile) {
      toast({
        title: "不支持的文件类型",
        description: "禁止上传图片、视频或音频文件。其他文件类型均支持。",
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      onFilesSelect([...files, ...validFiles]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }, [files, onFilesSelect, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (inputFiles && inputFiles.length > 0) {
      validateAndAddFiles(inputFiles);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success animate-scale-in" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive animate-scale-in" />;
      default:
        return null;
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    onFilesSelect([]);
  };

  const removeOne = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(id);
  };

  return (
    <div className="space-y-4">
      {/* 保持原生 label 结构，兼容 iOS Safari */}
      <label
        htmlFor={inputId} 
        className={`upload-zone relative transition-all duration-300 min-h-[180px] sm:min-h-[280px] block ${isDragging ? 'dragging ring-2 ring-primary ring-offset-2' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          // 保持透明但存在 (width: 1px)
          style={{ 
            position: 'absolute',
            width: '1px', 
            height: '1px', 
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
            opacity: 0
          }}
          onChange={handleChange}
          disabled={disabled}
          multiple
          // --- 关键修改：移除 accept 属性 ---
          // 不设置 accept，浏览器默认允许选择“所有文件”。
          // 这是兼容无后缀文件 (Dler Cloud 2) 和各种冷门格式的最佳方案。
          // 我们在 JS 中 validateAndAddFiles 里进行后置拦截。
        />
        
        <div className={`flex flex-col items-center gap-4 sm:gap-5 p-6 sm:p-10 transition-transform duration-300 ${isDragging ? 'scale-105' : ''}`}>
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-primary/20 scale-110' : ''}`}>
            <Upload className={`h-8 w-8 sm:h-10 sm:w-10 text-primary transition-transform duration-300 ${isDragging ? 'animate-bounce' : ''}`} />
          </div>
          <div className="text-center">
            <p className="text-lg sm:text-xl font-medium">
              {isDragging ? (
                <span className="text-primary animate-pulse">松开上传文件</span>
              ) : (
                <>
                  <span className="hidden sm:inline">拖拽文件到此处或</span>
                  <span className="text-primary">点击选择文件</span>
                </>
              )}
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              支持任意文件类型 (含无后缀文件)<br/>
              <span className="text-destructive/80">禁止上传图片和视频</span>
            </p>
          </div>
        </div>
      </label>

      {files.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="font-medium">已选择 {files.length} 个文件</span>
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {formatFileSize(files.reduce((acc, f) => acc + f.file.size, 0))}
              </span>
              {files.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-9 px-4 text-sm text-destructive hover:text-destructive active:scale-95 transition-transform touch-manipulation z-10 relative"
                >
                  清空全部
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-52 sm:max-h-64 overflow-y-auto overscroll-contain -mx-1 px-1">
            {files.map((fileItem, index) => {
              const FileIcon = getFileIcon(fileItem.file.type, fileItem.file.name);
              const fileColor = getFileColor(fileItem.file.type, fileItem.file.name);
              
              return (
                <div
                  key={fileItem.id}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50 hover:bg-muted active:bg-muted/80 transition-colors animate-fade-in touch-manipulation"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-background flex items-center justify-center ${fileColor}`}>
                    <FileIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate text-sm sm:text-base">{fileItem.file.name}</p>
                      {getStatusIcon(fileItem.status)}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {formatFileSize(fileItem.file.size)}
                      {fileItem.error && <span className="text-destructive ml-2">{fileItem.error}</span>}
                    </p>
                    {fileItem.status === 'uploading' && (
                      <Progress value={fileItem.progress} className="h-1.5 mt-2" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => removeOne(e, fileItem.id)}
                    disabled={fileItem.status === 'uploading' || disabled}
                    className="flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11 hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all touch-manipulation rounded-xl z-10 relative"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
