import { Upload, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/lib/api';

interface UploadProgressProps {
  filename: string;
  size: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  speed?: number; // bytes per second
  remainingTime?: number; // seconds
}

export function UploadProgress({
  filename,
  size,
  progress,
  status,
  error,
  speed,
  remainingTime,
}: UploadProgressProps) {
  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} 分钟`;
    return `${Math.ceil(seconds / 3600)} 小时`;
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          status === 'success' 
            ? 'bg-success/10' 
            : status === 'error' 
            ? 'bg-destructive/10' 
            : 'bg-primary/10'
        }`}>
          {status === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : status === 'error' ? (
            <XCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Upload className="h-5 w-5 text-primary animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{filename}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(size)}</span>
            {status === 'uploading' && speed && (
              <>
                <span>·</span>
                <span>{formatSpeed(speed)}</span>
              </>
            )}
            {status === 'uploading' && remainingTime && (
              <>
                <span>·</span>
                <span>剩余 {formatTime(remainingTime)}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-sm font-medium ${
            status === 'success' 
              ? 'text-success' 
              : status === 'error' 
              ? 'text-destructive' 
              : 'text-primary'
          }`}>
            {status === 'success' 
              ? '完成' 
              : status === 'error' 
              ? '失败' 
              : `${Math.round(progress)}%`}
          </span>
        </div>
      </div>

      {status === 'uploading' && (
        <Progress value={progress} className="h-2" />
      )}

      {status === 'error' && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
