import { useState } from 'react';
import { Link2, Flame } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadOptions } from '@/lib/types';

interface AdvancedOptionsProps {
  options: UploadOptions;
  onChange: (options: UploadOptions) => void;
  disabled?: boolean;
}

export function AdvancedOptionsPanel({ options, onChange, disabled }: AdvancedOptionsProps) {
  const [customSlugEnabled, setCustomSlugEnabled] = useState(!!options.customSlug);
  const [burnAfterReadEnabled, setBurnAfterReadEnabled] = useState(!!options.burnAfterRead);

  const handleCustomSlugToggle = (enabled: boolean) => {
    setCustomSlugEnabled(enabled);
    if (!enabled) {
      onChange({ ...options, customSlug: undefined });
    }
  };

  const handleBurnAfterReadToggle = (enabled: boolean) => {
    setBurnAfterReadEnabled(enabled);
    onChange({ ...options, burnAfterRead: enabled || undefined });
  };

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h3 className="font-semibold text-base sm:text-lg">高级选项</h3>

      {/* Custom Short Link */}
      <div className="space-y-3">
        <div className="flex items-center justify-between min-h-[48px]">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="custom-slug-toggle" className="text-sm sm:text-base cursor-pointer">自定义短链接</Label>
          </div>
          <Switch
            id="custom-slug-toggle"
            checked={customSlugEnabled}
            onCheckedChange={handleCustomSlugToggle}
            disabled={disabled}
            className="touch-manipulation"
          />
        </div>
        {customSlugEnabled && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/s/</span>
              <Input
                placeholder="my-file"
                value={options.customSlug || ''}
                onChange={(e) => onChange({ ...options, customSlug: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '') })}
                disabled={disabled}
                className="flex-1 h-12 text-base"
              />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              只允许字母、数字、连字符和下划线
            </p>
          </div>
        )}
      </div>

      {/* Burn After Read */}
      <div className="space-y-3">
        <div className="flex items-center justify-between min-h-[48px]">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <Label htmlFor="burn-after-read-toggle" className="text-sm sm:text-base cursor-pointer">阅后即焚</Label>
          </div>
          <Switch
            id="burn-after-read-toggle"
            checked={burnAfterReadEnabled}
            onCheckedChange={handleBurnAfterReadToggle}
            disabled={disabled}
            className="touch-manipulation"
          />
        </div>
        {burnAfterReadEnabled && (
          <div className="animate-fade-in p-3 sm:p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">
              ⚠️ 文件被访问一次后将自动销毁，无法再次下载
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
