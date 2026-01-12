import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PurchaseReportErrorStateProps {
  error: string;
  onRetry?: () => void;
}

const PurchaseReportErrorState: React.FC<PurchaseReportErrorStateProps> = ({
  error,
  onRetry,
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 mb-6">
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <p>{error}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mr-auto border-red-200 hover:bg-red-100 text-red-700"
        >
          <RefreshCw className="h-4 w-4 ml-2" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};

export default PurchaseReportErrorState;
