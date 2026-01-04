import { Tag, Clock, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SubscriptionInfo } from '@/lib/types';
import { useState, useEffect } from 'react';

interface SubscriptionInfoFormProps {
  value: SubscriptionInfo;
  onChange: (info: SubscriptionInfo) => void;
  disabled?: boolean;
}

export function SubscriptionInfoForm({ value, onChange, disabled }: SubscriptionInfoFormProps) {
  // 根据 value 是否有内容来初始化 enabled 状态
  const [enabled, setEnabled] = useState(() => {
    return value && Object.keys(value).length > 0 && Object.values(value).some(v => v);
  });

  // 当外部 value 变化时，同步 enabled 状态
  useEffect(() => {
    const hasValue = value && Object.keys(value).length > 0 && Object.values(value).some(v => v);
    if (hasValue && !enabled) {
      setEnabled(true);
    }
  }, [value]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onChange({});
    }
  };

  const handleChange = (field: keyof SubscriptionInfo, val: string) => {
    onChange({ ...value, [field]: val || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Label>自定义订阅信息</Label>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              订阅名称
            </Label>
            <Input
              placeholder="如: 我的机场"
              value={value.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={disabled}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              到期时间
            </Label>
            <Input
              type="date"
              value={value.expire || ''}
              onChange={(e) => handleChange('expire', e.target.value)}
              disabled={disabled}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                已用上传
              </Label>
              <Input
                placeholder="如: 10GB"
                value={value.upload || ''}
                onChange={(e) => handleChange('upload', e.target.value)}
                disabled={disabled}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                已用下载
              </Label>
              <Input
                placeholder="如: 50GB"
                value={value.download || ''}
                onChange={(e) => handleChange('download', e.target.value)}
                disabled={disabled}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3 w-3" />
              总流量
            </Label>
            <Input
              placeholder="如: 200GB"
              value={value.total || ''}
              onChange={(e) => handleChange('total', e.target.value)}
              disabled={disabled}
              className="text-sm"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            留空的字段将使用原订阅的默认值
          </p>
        </div>
      )}
    </div>
  );
}
