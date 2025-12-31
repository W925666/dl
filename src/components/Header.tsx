import { Share2, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useSiteConfig } from '@/hooks/useSiteConfig';

export function Header() {
  const { config } = useSiteConfig();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg safe-area-inset">
      <div className="container px-4 sm:px-8 flex h-14 sm:h-16 items-center justify-between">
        <a href="/" className="flex items-center gap-2 sm:gap-3 group touch-manipulation active:scale-95 transition-transform">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:shadow-primary/25 transition-shadow duration-300">
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight group-hover:text-primary transition-colors">{config.siteName}</span>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
