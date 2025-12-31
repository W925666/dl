export type ContentType = 'file' | 'text' | 'subscription';

export interface SubscriptionInfo {
  name?: string;
  expire?: string; // 到期时间，如 "2025-12-31"
  upload?: string; // 上传流量，如 "10GB"
  download?: string; // 下载流量，如 "100GB"
  total?: string; // 总流量，如 "200GB"
}

export interface UploadOptions {
  expiresIn?: number; // in hours
  maxDownloads?: number;
  subscriptionInfo?: SubscriptionInfo;
  customSlug?: string; // 自定义短链接后缀
  burnAfterRead?: boolean; // 阅后即焚
}

export interface AccessLog {
  timestamp: string;
  ip: string;
  userAgent: string;
  country?: string;
  city?: string;
}

export interface FileMetadata {
  id: string;
  type: ContentType;
  filename?: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
  expiresAt?: string;
  downloadCount: number;
  maxDownloads?: number;
  originalUrl?: string; // For subscription links
  customSlug?: string;
  burnAfterRead?: boolean;
  accessLogs?: AccessLog[];
}

export interface UploadResponse {
  success: boolean;
  id?: string;
  shareUrl?: string;
  rawUrl?: string;
  error?: string;
}

export interface DownloadResponse {
  success: boolean;
  data?: Blob | string;
  metadata?: FileMetadata;
  error?: string;
}

export interface ShareHistory {
  id: string;
  type: ContentType;
  name: string;
  shareUrl: string;
  rawUrl?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface BatchUploadResult {
  success: boolean;
  files: {
    name: string;
    id?: string;
    shareUrl?: string;
    error?: string;
  }[];
  collectionUrl?: string;
}
