import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  RefreshCw,
  Download,
  GitBranch,
  GitCommit,
  Calendar,
  Code,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  Terminal,
  Monitor,
  Smartphone,
  Layers,
} from "lucide-react";

// Services
import systemService, {
  SystemVersion,
  UpdateCheck,
  BackendUpdateResult,
  FrontendUpdateResult,
  CombinedUpdateResult,
  FrontendInstructions,
  UpdateProgress,
} from "@/services/systemService";

const SystemPage: React.FC = () => {
  const { t } = useTranslation(["system", "common"]);
  const [version, setVersion] = useState<SystemVersion | null>(null);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheck | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(true);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateType, setUpdateType] = useState<'backend' | 'frontend' | 'both'>('backend');
  const [updateResult, setUpdateResult] = useState<BackendUpdateResult | FrontendUpdateResult | CombinedUpdateResult | null>(null);
  const [frontendInstructions, setFrontendInstructions] = useState<FrontendInstructions | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showFrontendDialog, setShowFrontendDialog] = useState(false);
  const [showUpdateProgressDialog, setShowUpdateProgressDialog] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Load system version on component mount
  useEffect(() => {
    loadVersion();
  }, []);

  const loadVersion = async () => {
    try {
      setIsLoadingVersion(true);
      const data = await systemService.getVersion();
      setVersion(data);
    } catch (error) {
      console.error("Failed to load system version:", error);
      toast.error("Failed to load system version information");
    } finally {
      setIsLoadingVersion(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      setIsCheckingUpdates(true);
      const data = await systemService.checkForUpdates();
      setUpdateCheck(data);
      
      const totalUpdates = (data.backend_commit_count || 0) + (data.frontend_commit_count || 0);
      if (data.has_updates) {
        toast.success(`Found ${totalUpdates} new commit(s) available!`);
      } else {
        toast.info("System is up to date");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      toast.error("Failed to check for updates");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const performUpdate = async () => {
    try {
      setIsUpdating(true);
      setShowUpdateProgressDialog(true);
      setUpdateProgress([]);
      setCurrentProgress(0);

      let result: BackendUpdateResult | FrontendUpdateResult | CombinedUpdateResult;

      switch (updateType) {
        case 'backend':
          result = await systemService.updateBackend();
          break;
        case 'frontend':
          result = await systemService.updateFrontend();
          break;
        case 'both':
          result = await systemService.updateBoth();
          break;
        default:
          throw new Error('Invalid update type');
      }

      setUpdateResult(result);
      setShowUpdateProgressDialog(false);
      setShowUpdateDialog(true);
      
      // Check if update was successful
      const isSuccess = 'data' in result && 
        (result.data.success || 
         ('overall_success' in result.data && result.data.overall_success));
      
      if (isSuccess) {
        toast.success(`${updateType.charAt(0).toUpperCase() + updateType.slice(1)} updated successfully!`);
        // Reload version info after update
        await loadVersion();
      } else {
        toast.error(`${updateType.charAt(0).toUpperCase() + updateType.slice(1)} update completed with errors`);
      }
    } catch (error) {
      console.error(`Failed to update ${updateType}:`, error);
      toast.error(`Failed to update ${updateType}`);
      setShowUpdateProgressDialog(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const getFrontendInstructions = async () => {
    try {
      const instructions = await systemService.getFrontendInstructions();
      setFrontendInstructions(instructions);
      setShowFrontendDialog(true);
    } catch (error) {
      console.error("Failed to get frontend instructions:", error);
      toast.error("Failed to get frontend update instructions");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateHash = (hash: string) => {
    return hash.length > 8 ? hash.substring(0, 8) + "..." : hash;
  };

  const getUpdateStatusText = () => {
    if (!updateCheck) return "Unknown";
    
    const backendUpdates = updateCheck.backend_has_updates;
    const frontendUpdates = updateCheck.frontend_has_updates;
    
    if (backendUpdates && frontendUpdates) return "Both Available";
    if (backendUpdates) return "Backend Available";
    if (frontendUpdates) return "Frontend Available";
    return "Up to Date";
  };

  const getUpdateStatusVariant = () => {
    if (!updateCheck) return "default";
    
    const hasUpdates = updateCheck.backend_has_updates || updateCheck.frontend_has_updates;
    return hasUpdates ? "destructive" : "default";
  };

  if (isLoadingVersion) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center mb-6 gap-2">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center mb-6 gap-2">
        <Server className="h-7 w-7 text-primary" />
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          System Management
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Version Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Current System Version
            </CardTitle>
            <CardDescription>
              Information about the current system installation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Commit Hash</label>
                <div className="flex items-center gap-2 mt-1">
                  <GitCommit className="h-4 w-4 text-gray-400" />
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {version?.current_commit ? truncateHash(version.current_commit) : 'Unknown'}
                  </code>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Branch</label>
                <div className="flex items-center gap-2 mt-1">
                  <GitBranch className="h-4 w-4 text-gray-400" />
                  <Badge variant="outline">{version?.current_branch || 'Unknown'}</Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Laravel Version</label>
                <div className="flex items-center gap-2 mt-1">
                  <Server className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{version?.laravel_version || 'Unknown'}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">PHP Version</label>
                <div className="flex items-center gap-2 mt-1">
                  <Code className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{version?.php_version || 'Unknown'}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-500">Last Commit Date</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {version?.last_commit_date ? formatDate(version.last_commit_date) : 'Unknown'}
                </span>
              </div>
            </div>

            {version?.has_uncommitted_changes && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Uncommitted Changes</AlertTitle>
                <AlertDescription>
                  There are uncommitted changes in the repository. Consider committing or stashing them before updating.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={loadVersion}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={checkForUpdates}
                disabled={isCheckingUpdates}
                size="sm"
                className="flex-1"
              >
                {isCheckingUpdates ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Check for Updates
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Update Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Update Status
            </CardTitle>
            <CardDescription>
              Check for and install system updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {updateCheck ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Update Status</span>
                  <Badge variant={getUpdateStatusVariant()}>
                    {getUpdateStatusText()}
                  </Badge>
                </div>

                {/* Backend Updates */}
                {updateCheck.backend_has_updates && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Backend Updates</span>
                      <Badge variant="secondary" className="text-xs">
                        {updateCheck.backend_commit_count} commits
                      </Badge>
                    </div>
                    {updateCheck.backend_latest_commit_info && (
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <div><strong>Latest:</strong> {updateCheck.backend_latest_commit_info.message}</div>
                        <div><strong>Author:</strong> {updateCheck.backend_latest_commit_info.author}</div>
                        <div><strong>Date:</strong> {formatDate(updateCheck.backend_latest_commit_info.date)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Frontend Updates */}
                {updateCheck.frontend_has_updates && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">Frontend Updates</span>
                      <Badge variant="secondary" className="text-xs">
                        {updateCheck.frontend_commit_count} commits
                      </Badge>
                    </div>
                    {updateCheck.frontend_latest_commit_info && (
                      <div className="text-xs text-green-700 dark:text-green-300">
                        <div><strong>Latest:</strong> {updateCheck.frontend_latest_commit_info.message}</div>
                        <div><strong>Author:</strong> {updateCheck.frontend_latest_commit_info.author}</div>
                        <div><strong>Date:</strong> {formatDate(updateCheck.frontend_latest_commit_info.date)}</div>
                      </div>
                    )}
                  </div>
                )}

                {(updateCheck.backend_has_updates || updateCheck.frontend_has_updates) && (
                  <>
                    <Separator />

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Select Update Type:</label>
                        <Select value={updateType} onValueChange={(value: 'backend' | 'frontend' | 'both') => setUpdateType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {updateCheck.backend_has_updates && (
                              <SelectItem value="backend">
                                <div className="flex items-center gap-2">
                                  <Server className="h-4 w-4" />
                                  Backend Only
                                </div>
                              </SelectItem>
                            )}
                            {updateCheck.frontend_has_updates && (
                              <SelectItem value="frontend">
                                <div className="flex items-center gap-2">
                                  <Monitor className="h-4 w-4" />
                                  Frontend Only
                                </div>
                              </SelectItem>
                            )}
                            {(updateCheck.backend_has_updates && updateCheck.frontend_has_updates) && (
                              <SelectItem value="both">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4" />
                                  Both Backend & Frontend
                                </div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={performUpdate}
                        disabled={isUpdating}
                        className="w-full"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Update {updateType.charAt(0).toUpperCase() + updateType.slice(1)}
                      </Button>
                      
                      <Button
                        onClick={getFrontendInstructions}
                        variant="outline"
                        className="w-full"
                      >
                        <Terminal className="h-4 w-4 mr-2" />
                        Manual Frontend Instructions
                      </Button>
                    </div>
                  </>
                )}

                <div className="text-xs text-gray-500">
                  Last checked: {formatDate(updateCheck.checked_at)}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Check for Updates" to see if updates are available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Progress Dialog */}
      <Dialog open={showUpdateProgressDialog} onOpenChange={setShowUpdateProgressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Updating {updateType.charAt(0).toUpperCase() + updateType.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Please wait while the system is being updated...
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Progress value={currentProgress} className="w-full" />
            <div className="text-sm text-center">
              {currentProgress}% Complete
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {updateProgress.map((progress, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {progress.status === 'pending' && <div className="h-2 w-2 rounded-full bg-gray-300" />}
                  {progress.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {progress.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-600" />}
                  {progress.status === 'error' && <XCircle className="h-3 w-3 text-red-600" />}
                  <span className={progress.status === 'error' ? 'text-red-600' : ''}>
                    {progress.step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Result Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {updateResult && 'data' in updateResult && 
               (updateResult.data.success || 
                ('overall_success' in updateResult.data && updateResult.data.overall_success)) ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {updateType.charAt(0).toUpperCase() + updateType.slice(1)} Update Result
            </DialogTitle>
            <DialogDescription>
              {updateResult?.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {updateResult && 'data' in updateResult && (
              <>
                {/* Backend Results */}
                {updateType === 'backend' || updateType === 'both' ? (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Backend Steps:
                    </h4>
                    <div className="space-y-1">
                      {('backend' in updateResult.data ? updateResult.data.backend.steps : updateResult.data.steps).map((step, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          • {step}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Frontend Results */}
                {updateType === 'frontend' || updateType === 'both' ? (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Frontend Steps:
                    </h4>
                    <div className="space-y-1">
                      {('frontend' in updateResult.data ? updateResult.data.frontend.steps : updateResult.data.steps).map((step, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          • {step}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Errors */}
                {('backend' in updateResult.data ? updateResult.data.backend.errors : updateResult.data.errors).length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Errors Encountered</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1">
                        {('backend' in updateResult.data ? updateResult.data.backend.errors : updateResult.data.errors).map((error, index) => (
                          <div key={index} className="text-sm">• {error}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-xs text-gray-500">
                  Updated at: {('backend' in updateResult.data ? updateResult.data.backend.updated_at : updateResult.data.updated_at) ? 
                    formatDate('backend' in updateResult.data ? updateResult.data.backend.updated_at : updateResult.data.updated_at) : ''}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Frontend Instructions Dialog */}
      <Dialog open={showFrontendDialog} onOpenChange={setShowFrontendDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Frontend Update Instructions
            </DialogTitle>
            <DialogDescription>
              {frontendInstructions?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Frontend Directory:</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1">
                  {frontendInstructions?.frontend_path}
                </code>
                <Button
                  onClick={() => copyToClipboard(frontendInstructions?.frontend_path || '')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Commands to run:</label>
              <div className="space-y-2">
                {frontendInstructions?.commands.map((command, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1">
                      {command}
                    </code>
                    <Button
                      onClick={() => copyToClipboard(command)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Make sure to run these commands in the frontend directory. The build process may take several minutes.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemPage; 