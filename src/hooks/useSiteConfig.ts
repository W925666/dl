import { useState, useEffect } from 'react';

export interface SiteConfig {
  siteName: string;
  telegramBot: string;
  footerText: string;
}

const defaultConfig: SiteConfig = {
  siteName: 'CloudShare',
  telegramBot: '',
  footerText: '基于 Cloudflare 构建的私有文件分享服务',
};

let cachedConfig: SiteConfig | null = null;

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(cachedConfig || defaultConfig);
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) return;

    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json() as SiteConfig;
          cachedConfig = data;
          setConfig(data);
          // 动态更新页面标题
          document.title = `${data.siteName} - 私有文件分享`;
        }
      } catch (error) {
        console.error('Failed to fetch site config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}
