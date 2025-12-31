import { useSiteConfig } from '@/hooks/useSiteConfig';

export function Footer() {
  const { config } = useSiteConfig();
  
  // 处理 TG 用户名，支持 @username 或 https://t.me/username 格式
  const getTelegramLink = () => {
    if (!config.telegramBot) return null;
    if (config.telegramBot.startsWith('http')) {
      return config.telegramBot;
    }
    // 如果是 @username 格式，转换为链接
    const username = config.telegramBot.replace('@', '');
    return `https://t.me/${username}`;
  };

  const getTelegramDisplay = () => {
    if (!config.telegramBot) return '';
    // 如果是链接格式，提取用户名显示
    if (config.telegramBot.startsWith('http')) {
      const match = config.telegramBot.match(/t\.me\/(.+)/);
      return match ? `@${match[1]}` : config.telegramBot;
    }
    // 如果已经是 @username 格式，直接显示
    return config.telegramBot.startsWith('@') ? config.telegramBot : `@${config.telegramBot}`;
  };
  
  return (
    <footer className="border-t border-border/40 py-6 mt-auto">
      <div className="container flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-muted-foreground">
          {config.footerText}
        </p>
        {config.telegramBot && (
          <a 
            href={getTelegramLink()!} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            有需要请联系 TG: {getTelegramDisplay()}
          </a>
        )}
      </div>
    </footer>
  );
}
