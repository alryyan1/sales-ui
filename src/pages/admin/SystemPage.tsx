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
} from "lucide-react";

// Services
import systemService, {
  SystemVersion,
  UpdateCheck,
  BackendUpdateResult,
  FrontendInstructions,
} from "@/services/systemService";

const SystemPage: React.FC = () => {
  const { t } = useTranslation(["system", "common"]);
  const [version, setVersion] = useState<SystemVersion | null>(null);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheck | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(true);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isUpdatingBackend, setIsUpdatingBackend] = useState(false);
  const [updateResult, setUpdateResult] = useState<BackendUpdateResult | null>(null);
  const [frontendInstructions, setFrontendInstructions] = useState<FrontendInstructions | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showFrontendDialog, setShowFrontendDialog] = useState(false);

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
      
      if (data.has_updates) {
        toast.success(`Found ${data.commit_count} new commit(s) available!`);
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

  const updateBackend = async () => {
    try {
      setIsUpdatingBackend(true);
      const result = await systemService.updateBackend();
      setUpdateResult(result);
      setShowUpdateDialog(true);
      
      if (result.data.success) {
        toast.success("Backend updated successfully!");
        // Reload version info after update
        await loadVersion();
      } else {
        toast.error("Backend update completed with errors");
      }
    } catch (error) {
      console.error("Failed to update backend:", error);
      toast.error("Failed to update backend");
    } finally {
      setIsUpdatingBackend(false);
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
                  <Badge variant={updateCheck.has_updates ? "destructive" : "default"}>
                    {updateCheck.has_updates ? "Updates Available" : "Up to Date"}
                  </Badge>
                </div>

                {updateCheck.has_updates && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>New commits:</span>
                        <span className="font-medium">{updateCheck.commit_count}</span>
                      </div>
                      
                      {updateCheck.latest_commit_info && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="text-sm font-medium mb-1">Latest Commit</div>
                          <div className="text-xs space-y-1">
                            <div><strong>Message:</strong> {updateCheck.latest_commit_info.message}</div>
                            <div><strong>Author:</strong> {updateCheck.latest_commit_info.author}</div>
                            <div><strong>Date:</strong> {formatDate(updateCheck.latest_commit_info.date)}</div>
                            <div><strong>Hash:</strong> {truncateHash(updateCheck.latest_commit_info.hash)}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Button
                        onClick={updateBackend}
                        disabled={isUpdatingBackend}
                        className="w-full"
                      >
                        {isUpdatingBackend ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Update Backend
                      </Button>
                      
                      <Button
                        onClick={getFrontendInstructions}
                        variant="outline"
                        className="w-full"
                      >
                        <Terminal className="h-4 w-4 mr-2" />
                        Frontend Update Instructions
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

      {/* Update Result Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {updateResult?.data.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Backend Update Result
            </DialogTitle>
            <DialogDescription>
              {updateResult?.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Steps Completed:</h4>
              <div className="space-y-1">
                {updateResult?.data.steps.map((step, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    • {step}
                  </div>
                ))}
              </div>
            </div>

            {updateResult?.data.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errors Encountered</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1">
                    {updateResult.data.errors.map((error, index) => (
                      <div key={index} className="text-sm">• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-gray-500">
              Updated at: {updateResult?.data.updated_at ? formatDate(updateResult.data.updated_at) : ''}
            </div>
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