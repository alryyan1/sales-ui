import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { 
  Download, 
  Trash2, 
  Database, 
  HardDrive, 
  Calendar, 
  FileText,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import backupService, { Backup, BackupStatistics } from '../../services/backupService';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';

const BackupPage: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ show: boolean; backup: Backup | null }>({
    show: false,
    backup: null,
  });

  const [createForm, setCreateForm] = useState({
    description: '',
    include_data: true,
    include_structure: true,
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [backupsData, statsData] = await Promise.all([
        backupService.getBackups(),
        backupService.getStatistics(),
      ]);
      setBackups(backupsData.backups);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading backup data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات النسخ الاحتياطية',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await backupService.createBackup(createForm);
      toast({
        title: 'نجح',
        description: 'تم إنشاء النسخة الاحتياطية بنجاح',
      });
      setShowCreateDialog(false);
      setCreateForm({ description: '', include_data: true, include_structure: true });
      loadData();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء النسخة الاحتياطية',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      const blob = await backupService.downloadBackup(backup.filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'نجح',
        description: 'تم بدء تحميل النسخة الاحتياطية',
      });
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل النسخة الاحتياطية',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteDialog.backup) return;

    try {
      await backupService.deleteBackup(deleteDialog.backup.filename);
      toast({
        title: 'نجح',
        description: 'تم حذف النسخة الاحتياطية بنجاح',
      });
      setDeleteDialog({ show: false, backup: null });
      loadData();
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف النسخة الاحتياطية',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ar });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">النسخ الاحتياطية</h1>
          <p className="text-muted-foreground">إدارة نسخ قاعدة البيانات الاحتياطية</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          إنشاء نسخة احتياطية
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي النسخ</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_backups}</div>
              <p className="text-xs text-muted-foreground">نسخة احتياطية</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الحجم الإجمالي</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_size_formatted}</div>
              <p className="text-xs text-muted-foreground">إجمالي المساحة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">آخر نسخة</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.last_backup ? formatDate(statistics.last_backup) : 'لا يوجد'}
              </div>
              <p className="text-xs text-muted-foreground">آخر نسخة احتياطية</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">هذا الشهر</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.backups_this_month}</div>
              <p className="text-xs text-muted-foreground">نسخة احتياطية</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>النسخ الاحتياطية المتاحة</CardTitle>
          <CardDescription>
            قائمة بجميع النسخ الاحتياطية المحفوظة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد نسخ احتياطية</h3>
              <p className="text-muted-foreground mb-4">
                قم بإنشاء أول نسخة احتياطية لحماية بياناتك
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                إنشاء نسخة احتياطية
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.filename} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="flex-shrink-0">
                      <Database className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{backup.filename}</h3>
                      <p className="text-sm text-muted-foreground">{backup.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {backup.size_formatted}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {formatDate(backup.created_at)}
                        </Badge>
                        {backup.include_data && (
                          <Badge variant="secondary" className="text-xs">
                            بيانات
                          </Badge>
                        )}
                        {backup.include_structure && (
                          <Badge variant="secondary" className="text-xs">
                            هيكل
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadBackup(backup)}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      تحميل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog({ show: true, backup })}
                      className="flex items-center gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">إنشاء نسخة احتياطية</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Input
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="وصف النسخة الاحتياطية"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="include_data"
                    checked={createForm.include_data}
                    onCheckedChange={(checked) => 
                      setCreateForm({ ...createForm, include_data: checked as boolean })
                    }
                  />
                  <Label htmlFor="include_data">تضمين البيانات</Label>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="include_structure"
                    checked={createForm.include_structure}
                    onCheckedChange={(checked) => 
                      setCreateForm({ ...createForm, include_structure: checked as boolean })
                    }
                  />
                  <Label htmlFor="include_structure">تضمين هيكل الجداول</Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleCreateBackup}
                  disabled={creating || (!createForm.include_data && !createForm.include_structure)}
                >
                  {creating ? 'جاري الإنشاء...' : 'إنشاء'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.show}
        onOpenChange={(open) => setDeleteDialog({ show: open, backup: null })}
        title="حذف النسخة الاحتياطية"
        description={`هل أنت متأكد من حذف النسخة الاحتياطية "${deleteDialog.backup?.filename}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleDeleteBackup}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="destructive"
      />
    </div>
  );
};

export default BackupPage; 