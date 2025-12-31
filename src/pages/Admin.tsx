import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, File, FileText, Link2, Trash2, Eye, Download, AlertTriangle, Lock, ExternalLink, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

interface AdminRecord {
  id: string;
  type: 'file' | 'text' | 'subscription';
  filename?: string;
  size?: number;
  createdAt: string;
  expiresAt?: string;
  downloadCount: number;
  maxDownloads?: number;
  burnAfterRead?: boolean;
  contentType?: string;
  originalUrl?: string;
  hasContent?: boolean;
  subscriptionInfo?: {
    name?: string;
    upload?: string;
    download?: string;
    total?: string;
    expire?: string;
  };
  accessLogs?: Array<{
    timestamp: string;
    ip: string;
    userAgent: string;
    country?: string;
    city?: string;
  }>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'file':
      return <File className="h-4 w-4" />;
    case 'text':
      return <FileText className="h-4 w-4" />;
    case 'subscription':
      return <Link2 className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'file':
      return <Badge variant="default">文件</Badge>;
    case 'text':
      return <Badge variant="secondary">文本</Badge>;
    case 'subscription':
      return <Badge className="bg-purple-500 hover:bg-purple-600">订阅</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export default function Admin() {
  const { adminPath } = useParams<{ adminPath: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      setLoginError('请输入密码');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    
    try {
      const response = await fetch(`/api/${adminPath}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (response.ok) {
        setAuthToken(password);
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setLoginError('密码错误');
      }
    } catch (err) {
      setLoginError('登录失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchRecords = async () => {
    if (!authToken) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/${adminPath}/records`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setAuthToken('');
          setError('会话已过期，请重新登录');
        } else if (response.status === 403) {
          setError('无权访问管理页面');
        } else {
          setError('获取记录失败');
        }
        return;
      }
      const data = await response.json() as { records: AdminRecord[] };
      setRecords(data.records || []);
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    setDeleting(id);
    try {
      const response = await fetch(`/api/${adminPath}/delete/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
        toast.success('删除成功');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (record: AdminRecord) => {
    try {
      const response = await fetch(`/api/${adminPath}/download/${record.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      
      if (!response.ok) {
        toast.error('下载失败');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = record.filename || `${record.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('下载成功');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('下载失败');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}已复制`);
  };

  const viewRecordDetail = (record: AdminRecord) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  };

  useEffect(() => {
    if (isAuthenticated && adminPath) {
      fetchRecords();
    }
  }, [isAuthenticated, adminPath]);

  if (!adminPath) {
    return <Navigate to="/" replace />;
  }

  // 登录界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-6 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>管理员登录</CardTitle>
              <CardDescription>请输入管理密码访问分享记录</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="请输入管理密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="h-12"
              />
              {loginError && (
                <p className="text-sm text-destructive text-center">{loginError}</p>
              )}
              <Button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full h-12"
              >
                {loginLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                登录
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container px-4 py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              分享记录管理
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecords}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-center py-12 text-destructive">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>加载中...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无分享记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">类型</TableHead>
                      <TableHead>ID / 名称</TableHead>
                      <TableHead className="hidden md:table-cell">大小</TableHead>
                      <TableHead className="hidden sm:table-cell">创建时间</TableHead>
                      <TableHead className="hidden lg:table-cell">过期时间</TableHead>
                      <TableHead className="text-center">
                        <Download className="h-4 w-4 inline" />
                      </TableHead>
                      <TableHead className="hidden md:table-cell">状态</TableHead>
                      <TableHead className="w-[140px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => {
                      const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
                      const limitReached = record.maxDownloads && record.downloadCount >= record.maxDownloads;
                      
                      return (
                        <TableRow key={record.id} className={isExpired || limitReached ? 'opacity-50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(record.type)}
                              {getTypeBadge(record.type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">{record.id}</div>
                            {record.filename && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {record.filename}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {record.size ? formatFileSize(record.size) : '-'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {format(new Date(record.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {record.expiresAt ? (
                              <span className={isExpired ? 'text-destructive' : ''}>
                                {format(new Date(record.expiresAt), 'MM-dd HH:mm', { locale: zhCN })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">永久</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {record.downloadCount}
                            {record.maxDownloads && (
                              <span className="text-muted-foreground">/{record.maxDownloads}</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {record.burnAfterRead && (
                                <Badge variant="destructive" className="text-xs">阅后即焚</Badge>
                              )}
                              {isExpired && (
                                <Badge variant="outline" className="text-xs">已过期</Badge>
                              )}
                              {limitReached && (
                                <Badge variant="outline" className="text-xs">已达限制</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => viewRecordDetail(record)}
                                title="查看详情"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {record.hasContent && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownload(record)}
                                  title="下载源文件"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(record.id)}
                                disabled={deleting === record.id}
                                title="删除"
                              >
                                {deleting === record.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* 统计信息 */}
            {!loading && !error && records.length > 0 && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>总计: {records.length} 条记录</span>
                <span>文件: {records.filter(r => r.type === 'file').length}</span>
                <span>文本: {records.filter(r => r.type === 'text').length}</span>
                <span>订阅: {records.filter(r => r.type === 'subscription').length}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecord && getTypeIcon(selectedRecord.type)}
              记录详情
            </DialogTitle>
            <DialogDescription>
              ID: {selectedRecord?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">类型:</span>
                  <span className="ml-2">{getTypeBadge(selectedRecord.type)}</span>
                </div>
                {selectedRecord.filename && (
                  <div>
                    <span className="text-muted-foreground">文件名:</span>
                    <span className="ml-2">{selectedRecord.filename}</span>
                  </div>
                )}
                {selectedRecord.size && (
                  <div>
                    <span className="text-muted-foreground">大小:</span>
                    <span className="ml-2">{formatFileSize(selectedRecord.size)}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">访问次数:</span>
                  <span className="ml-2">{selectedRecord.downloadCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">创建时间:</span>
                  <span className="ml-2">{format(new Date(selectedRecord.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}</span>
                </div>
                {selectedRecord.expiresAt && (
                  <div>
                    <span className="text-muted-foreground">过期时间:</span>
                    <span className="ml-2">{format(new Date(selectedRecord.expiresAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}</span>
                  </div>
                )}
              </div>

              {/* 订阅原始链接 */}
              {selectedRecord.type === 'subscription' && selectedRecord.originalUrl && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    原始订阅链接
                  </h4>
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
                    <code className="flex-1 text-xs break-all">{selectedRecord.originalUrl}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(selectedRecord.originalUrl!, '原始链接')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => window.open(selectedRecord.originalUrl!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* 订阅自定义信息 */}
              {selectedRecord.subscriptionInfo && (
                <div className="space-y-2">
                  <h4 className="font-medium">订阅自定义信息</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted p-3 rounded-md">
                    {selectedRecord.subscriptionInfo.name && (
                      <div>
                        <span className="text-muted-foreground">名称:</span>
                        <span className="ml-2">{selectedRecord.subscriptionInfo.name}</span>
                      </div>
                    )}
                    {selectedRecord.subscriptionInfo.upload && (
                      <div>
                        <span className="text-muted-foreground">上传:</span>
                        <span className="ml-2">{selectedRecord.subscriptionInfo.upload}</span>
                      </div>
                    )}
                    {selectedRecord.subscriptionInfo.download && (
                      <div>
                        <span className="text-muted-foreground">下载:</span>
                        <span className="ml-2">{selectedRecord.subscriptionInfo.download}</span>
                      </div>
                    )}
                    {selectedRecord.subscriptionInfo.total && (
                      <div>
                        <span className="text-muted-foreground">总量:</span>
                        <span className="ml-2">{selectedRecord.subscriptionInfo.total}</span>
                      </div>
                    )}
                    {selectedRecord.subscriptionInfo.expire && (
                      <div>
                        <span className="text-muted-foreground">到期:</span>
                        <span className="ml-2">{selectedRecord.subscriptionInfo.expire}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 访问日志 */}
              {selectedRecord.accessLogs && selectedRecord.accessLogs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">访问日志 (最近 {selectedRecord.accessLogs.length} 条)</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedRecord.accessLogs.slice(-10).reverse().map((log, index) => (
                      <div key={index} className="text-xs bg-muted p-2 rounded-md flex flex-wrap gap-x-4 gap-y-1">
                        <span>{format(new Date(log.timestamp), 'MM-dd HH:mm:ss')}</span>
                        <span className="font-mono">{log.ip}</span>
                        {log.country && <span>{log.country}{log.city && ` · ${log.city}`}</span>}
                        <span className="text-muted-foreground truncate max-w-[200px]">{log.userAgent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedRecord.hasContent && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedRecord)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载源文件
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedRecord.id);
                    setShowDetailDialog(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除记录
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}