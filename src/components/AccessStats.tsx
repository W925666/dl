import { BarChart3, Globe, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessLog } from '@/lib/types';
import { formatDate } from '@/lib/api';

// 国家代码到中文名称的映射
const countryNameMap: Record<string, string> = {
  'CN': '中国',
  'US': '美国',
  'JP': '日本',
  'KR': '韩国',
  'HK': '香港',
  'TW': '台湾',
  'SG': '新加坡',
  'GB': '英国',
  'DE': '德国',
  'FR': '法国',
  'AU': '澳大利亚',
  'CA': '加拿大',
  'RU': '俄罗斯',
  'IN': '印度',
  'BR': '巴西',
  'NL': '荷兰',
  'IT': '意大利',
  'ES': '西班牙',
  'TH': '泰国',
  'VN': '越南',
  'MY': '马来西亚',
  'ID': '印度尼西亚',
  'PH': '菲律宾',
  'Unknown': '未知',
};

// 将国家代码转换为中文名称
function getCountryName(country: string | undefined): string {
  if (!country) return '未知';
  return countryNameMap[country] || country;
}

// 隐藏IP地址中间部分
function maskIP(ip: string): string {
  if (!ip) return '';
  
  // IPv4 格式: xxx.xxx.xxx.xxx
  if (ip.includes('.') && !ip.includes(':')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.***.***${parts[3]}`;
    }
  }
  
  // IPv6 格式或其他: 只显示前后部分
  if (ip.length > 8) {
    return `${ip.slice(0, 4)}****${ip.slice(-4)}`;
  }
  
  return ip;
}

interface AccessStatsProps {
  downloadCount: number;
  accessLogs?: AccessLog[];
}

export function AccessStats({ downloadCount, accessLogs = [] }: AccessStatsProps) {
  // 统计不同地区的访问（使用中文名称）
  const regionStats = accessLogs.reduce((acc, log) => {
    const region = getCountryName(log.country);
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedRegions = Object.entries(regionStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 最近访问记录
  const recentLogs = accessLogs.slice(-5).reverse();

  return (
    <div className="space-y-4">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{downloadCount}</p>
                <p className="text-sm text-muted-foreground">总访问次数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(regionStats).length}</p>
                <p className="text-sm text-muted-foreground">访问地区</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 地区分布 */}
      {sortedRegions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              访问地区分布
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedRegions.map(([region, count]) => (
              <div key={region} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{region}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${(count / downloadCount) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 最近访问记录 */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              最近访问
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
          {recentLogs.map((log, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
              >
                <div className="space-y-1">
                  <p className="font-mono text-xs">{maskIP(log.ip)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCountryName(log.country)}
                    {log.city && ` · ${log.city}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.timestamp)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
