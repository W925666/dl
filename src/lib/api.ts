import { UploadOptions, UploadResponse, DownloadResponse, FileMetadata, SubscriptionInfo, ShareHistory, BatchUploadResult } from './types';

// API 基础路径 - 始终使用相对路径
const API_BASE = '/api';

// 模拟模式 - 只在本地开发时启用
const MOCK_MODE = !import.meta.env.PROD;

// 生成随机 ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// 模拟存储
function getMockStorage(): Record<string, unknown> {
  const data = localStorage.getItem('mock_files');
  return data ? JSON.parse(data) : {};
}

function setMockStorage(data: Record<string, unknown>): void {
  localStorage.setItem('mock_files', JSON.stringify(data));
}

// 上传进度回调类型
export type UploadProgressCallback = (progress: number, speed?: number, remainingTime?: number) => void;

export async function uploadFile(
  file: File,
  options: UploadOptions = {},
  onProgress?: UploadProgressCallback
): Promise<UploadResponse> {
  // 模拟模式
  if (MOCK_MODE) {
    const id = options.customSlug || generateId();
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      // 模拟进度
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 100) {
          onProgress?.(progress, 1024 * 1024, (100 - progress) / 10);
        }
        if (progress >= 100) {
          clearInterval(progressInterval);
        }
      }, 100);

      reader.onload = () => {
        const storage = getMockStorage();
        
        // 检查自定义短链接是否已存在
        if (options.customSlug && storage[options.customSlug]) {
          clearInterval(progressInterval);
          resolve({
            success: false,
            error: '自定义短链接已被使用',
          });
          return;
        }

        storage[id] = {
          type: 'file',
          name: file.name,
          size: file.size,
          mimeType: file.type,
          content: reader.result,
          expiresAt: options.expiresIn ? Date.now() + options.expiresIn * 1000 : null,
          maxDownloads: options.maxDownloads || null,
          downloads: 0,
          createdAt: new Date().toISOString(),
          customSlug: options.customSlug,
          burnAfterRead: options.burnAfterRead,
          subscriptionInfo: options.subscriptionInfo,
          accessLogs: [],
        };
        setMockStorage(storage);
        
        resolve({
          success: true,
          id,
          shareUrl: `${window.location.origin}/s/${id}`,
          rawUrl: `${window.location.origin}/raw/${id}`,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'file');
  
  if (options.expiresIn) {
    formData.append('expiresIn', options.expiresIn.toString());
  }
  if (options.maxDownloads) {
    formData.append('maxDownloads', options.maxDownloads.toString());
  }
  if (options.customSlug) {
    formData.append('customSlug', options.customSlug);
  }
  if (options.burnAfterRead) {
    formData.append('burnAfterRead', 'true');
  }
  if (options.subscriptionInfo) {
    formData.append('subscriptionInfo', JSON.stringify(options.subscriptionInfo));
  }

  try {
    // 使用 XMLHttpRequest 来获取上传进度
    if (onProgress) {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const startTime = Date.now();
        let lastLoaded = 0;
        let lastTime = startTime;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            const loadedDiff = e.loaded - lastLoaded;
            const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
            const remaining = e.total - e.loaded;
            const remainingTime = speed > 0 ? remaining / speed : 0;

            onProgress(progress, speed, remainingTime);

            lastLoaded = e.loaded;
            lastTime = now;
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                success: true,
                id: data.id,
                shareUrl: `${window.location.origin}/s/${data.id}`,
                rawUrl: `${window.location.origin}/raw/${data.id}`,
              });
            } else {
              resolve({ success: false, error: data.error || 'Upload failed' });
            }
          } catch {
            resolve({ success: false, error: 'Upload failed' });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({ success: false, error: 'Network error' });
        });

        xhr.open('POST', `${API_BASE}/upload`);
        xhr.send(formData);
      });
    }

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json() as { id?: string; error?: string };
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Upload failed' };
    }

    return {
      success: true,
      id: data.id,
      shareUrl: `${window.location.origin}/s/${data.id}`,
      rawUrl: `${window.location.origin}/raw/${data.id}`,
    };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

// 批量上传
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {},
  onFileProgress?: (fileIndex: number, progress: number) => void
): Promise<BatchUploadResult> {
  const results: BatchUploadResult['files'] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadFile(file, options, (progress) => {
      onFileProgress?.(i, progress);
    });
    
    results.push({
      name: file.name,
      id: result.id,
      shareUrl: result.shareUrl,
      error: result.error,
    });
  }

  const successCount = results.filter(r => r.id).length;
  
  return {
    success: successCount > 0,
    files: results,
  };
}

export async function uploadText(
  text: string,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  // 模拟模式
  if (MOCK_MODE) {
    const id = options.customSlug || generateId();
    const storage = getMockStorage();
    
    // 检查自定义短链接是否已存在
    if (options.customSlug && storage[options.customSlug]) {
      return {
        success: false,
        error: '自定义短链接已被使用',
      };
    }

    storage[id] = {
      type: 'text',
      content: text,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn * 1000 : null,
      maxDownloads: options.maxDownloads || null,
      downloads: 0,
      createdAt: new Date().toISOString(),
      customSlug: options.customSlug,
      burnAfterRead: options.burnAfterRead,
      subscriptionInfo: options.subscriptionInfo,
      accessLogs: [],
    };
    setMockStorage(storage);
    
    return {
      success: true,
      id,
      shareUrl: `${window.location.origin}/s/${id}`,
      rawUrl: `${window.location.origin}/raw/${id}`,
    };
  }

  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: text,
        expiresIn: options.expiresIn,
        maxDownloads: options.maxDownloads,
        customSlug: options.customSlug,
        burnAfterRead: options.burnAfterRead,
        subscriptionInfo: options.subscriptionInfo,
      }),
    });

    const data = await response.json() as { id?: string; error?: string };
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Upload failed' };
    }

    return {
      success: true,
      id: data.id,
      shareUrl: `${window.location.origin}/s/${data.id}`,
      rawUrl: `${window.location.origin}/raw/${data.id}`,
    };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function createSubscriptionLink(
  content: string,
  subscriptionInfo?: SubscriptionInfo,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  console.log('createSubscriptionLink called with:', { content: content.substring(0, 50), subscriptionInfo, options });
  
  // 模拟模式
  if (MOCK_MODE) {
    const id = options.customSlug || generateId();
    const storage = getMockStorage();
    
    // 检查自定义短链接是否已存在
    if (options.customSlug && storage[options.customSlug]) {
      return {
        success: false,
        error: '自定义短链接已被使用',
      };
    }
    
    storage[id] = {
      type: 'subscription',
      content,
      subscriptionInfo,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn * 3600 * 1000 : null,
      maxDownloads: options.maxDownloads || null,
      burnAfterRead: options.burnAfterRead,
      createdAt: new Date().toISOString(),
      accessLogs: [],
      downloads: 0,
    };
    setMockStorage(storage);
    
    return {
      success: true,
      id,
      shareUrl: `${window.location.origin}/sub/${id}`,
    };
  }

  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'subscription',
        content,
        subscriptionInfo,
        expiresIn: options.expiresIn,
        maxDownloads: options.maxDownloads,
        customSlug: options.customSlug,
        burnAfterRead: options.burnAfterRead,
      }),
    });

    const data = await response.json() as { id?: string; error?: string };
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create short link' };
    }

    return {
      success: true,
      id: data.id,
      shareUrl: `${window.location.origin}/sub/${data.id}`,
    };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

interface MockFileData {
  type: string;
  name?: string;
  size?: number;
  mimeType?: string;
  content: string;
  expiresAt?: number | null;
  maxDownloads?: number | null;
  downloads: number;
  createdAt: string;
  sourceType?: string;
  burnAfterRead?: boolean;
  accessLogs?: Array<{
    timestamp: string;
    ip: string;
    userAgent: string;
    country?: string;
    city?: string;
  }>;
}

export async function getFileMetadata(id: string): Promise<{ success: boolean; metadata?: FileMetadata; error?: string }> {
  // 模拟模式
  if (MOCK_MODE) {
    const storage = getMockStorage();
    const file = storage[id] as MockFileData | undefined;
    
    if (!file) {
      return { success: false, error: '文件不存在或已过期' };
    }
    
    if (file.expiresAt && Date.now() > file.expiresAt) {
      return { success: false, error: '文件已过期' };
    }
    
    return {
      success: true,
      metadata: {
        id,
        type: file.type as 'file' | 'text' | 'subscription',
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
        expiresAt: file.expiresAt ? new Date(file.expiresAt).toISOString() : undefined,
        downloadCount: file.downloads,
        maxDownloads: file.maxDownloads ?? undefined,
        burnAfterRead: file.burnAfterRead,
        accessLogs: file.accessLogs,
      },
    };
  }

  try {
    const response = await fetch(`${API_BASE}/file/${id}/metadata`);
    const data = await response.json() as FileMetadata & { error?: string };

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get file info' };
    }

    return { success: true, metadata: data };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function downloadFile(
  id: string
): Promise<DownloadResponse> {
  // 模拟模式
  if (MOCK_MODE) {
    const storage = getMockStorage();
    const file = storage[id] as MockFileData | undefined;
    
    if (!file) {
      return { success: false, error: '文件不存在或已过期' };
    }
    
    if (file.expiresAt && Date.now() > file.expiresAt) {
      return { success: false, error: '文件已过期' };
    }
    
    if (file.maxDownloads && file.downloads >= file.maxDownloads) {
      return { success: false, error: '下载次数已达上限' };
    }
    
    // 更新下载次数和访问日志
    file.downloads += 1;
    file.accessLogs = file.accessLogs || [];
    file.accessLogs.push({
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1',
      userAgent: navigator.userAgent,
    });
    
    // 阅后即焚：访问后删除文件
    if (file.burnAfterRead) {
      delete storage[id];
    }
    setMockStorage(storage);
    
    if (file.type === 'text' || file.type === 'subscription') {
      return { success: true, data: file.content };
    }
    
    // 文件类型 - 返回 base64 数据
    return { success: true, data: file.content };
  }

  try {
    const response = await fetch(`${API_BASE}/file/${id}`);

    if (!response.ok) {
      const data = await response.json() as { error?: string };
      return { success: false, error: data.error || 'Download failed' };
    }

    const contentType = response.headers.get('Content-Type');
    const isText = contentType?.includes('text/plain') || contentType?.includes('application/json');

    if (isText) {
      const text = await response.text();
      return { success: true, data: text };
    }

    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 创建分享历史记录
export function createShareHistoryItem(
  id: string,
  type: 'file' | 'text' | 'subscription',
  name: string,
  shareUrl: string,
  rawUrl?: string,
  expiresAt?: string
): ShareHistory {
  return {
    id,
    type,
    name,
    shareUrl,
    rawUrl,
    createdAt: new Date().toISOString(),
    expiresAt,
  };
}
