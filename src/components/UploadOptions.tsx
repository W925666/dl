import { useState } from 'react';
import { Clock, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadOptions as UploadOptionsType } from '@/lib/types';
import { SubscriptionInfoForm } from './SubscriptionInfoForm';

interface UploadOptionsProps {
  options: UploadOptionsType;
  onChange: (options: UploadOptionsType) => void;
  disabled?: boolean;
}

const EXPIRE_OPTIONS = [
  { value: '1', label: '1 小时' },
  { value: '6', label: '6 小时' },
  { value: '24', label: '1 天' },
  { value: '72', label: '3 天' },
  { value: '168', label: '7 天' },
  { value: '720', label: '30 天' },
  { value: '0', label: '永不过期' },
];

export function UploadOptionsPanel({ options, onChange, disabled }: UploadOptionsProps) {
  const [expireEnabled, setExpireEnabled] = useState(!!options.expiresIn);
  const [downloadLimitEnabled, setDownloadLimitEnabled] = useState(!!options.maxDownloads);

  const handleExpireToggle = (enabled: boolean) => {
    setExpireEnabled(enabled);
    if (!enabled) {
      onChange({ ...options, expiresIn: undefined });
    } else {
      onChange({ ...options, expiresIn: 24 });
    }
  };

  const handleDownloadLimitToggle = (enabled: boolean) => {
    setDownloadLimitEnabled(enabled);
    if (!enabled) {
      onChange({ ...options, maxDownloads: undefined });
    } else {
      onChange({ ...options, maxDownloads: 10 });
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h3 className="font-semibold text-base sm:text-lg">分享设置</h3>

      {/* Expiration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between min-h-[48px]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="expire-toggle" className="text-sm sm:text-base cursor-pointer">自动过期</Label>
          </div>
          <Switch
            id="expire-toggle"
            checked={expireEnabled}
            onCheckedChange={handleExpireToggle}
            disabled={disabled}
            className="touch-manipulation"
          />
        </div>
        {expireEnabled && (
          <Select
            value={options.expiresIn?.toString() || '24'}
            onValueChange={(value) => onChange({ ...options, expiresIn: parseInt(value) || undefined })}
            disabled={disabled}
          >
            <SelectTrigger className="animate-fade-in h-12 text-base">
              <SelectValue placeholder="选择过期时间" />
            </SelectTrigger>
            <SelectContent>
              {EXPIRE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="h-12 text-base">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Download Limit */}
      <div className="space-y-3">
        <div className="flex items-center justify-between min-h-[48px]">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="download-limit-toggle" className="text-sm sm:text-base cursor-pointer">下载次数限制</Label>
          </div>
          <Switch
            id="download-limit-toggle"
            checked={downloadLimitEnabled}
            onCheckedChange={handleDownloadLimitToggle}
            disabled={disabled}
            className="touch-manipulation"
          />
        </div>
        {downloadLimitEnabled && (
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            max="1000"
            placeholder="最大下载次数"
            value={options.maxDownloads || ''}
            onChange={(e) => onChange({ ...options, maxDownloads: parseInt(e.target.value) || undefined })}
            disabled={disabled}
            className="animate-fade-in h-12 text-base"
          />
        )}
      </div>

      {/* Subscription Info */}
      <div className="border-t border-border pt-4">
        <SubscriptionInfoForm
          value={options.subscriptionInfo || {}}
          onChange={(info) => {
            // 检查是否有任何有效值
            const hasValidValue = Object.values(info).some(v => v !== undefined && v !== '');
            onChange({ ...options, subscriptionInfo: hasValidValue ? info : undefined });
          }}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
