import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthorization } from "../../hooks/useAuthorization";
import { useAuth } from "../../context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner"; // Using 'sonner' as per the original router file

interface PermissionGuardProps {
  requiredPermission: string | string[]; // Single permission or array of OR permissions
  children?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredPermission,
  children,
}) => {
  const { hasPermission, isLoggedIn } = useAuthorization();
  const { isLoading } = useAuth();

  // 1. Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 2. Check Login Status
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // 3. Check Permissions
  if (!hasPermission(requiredPermission)) {
    // Show a discrete toast message
    // Using a ref or checking if toast is active might be better to prevent duplicates,
    // but for now, simple toast.error is standard.
    // We prevent the toast from firing too aggressive by existing navigation
    // ideally, we could just render a "Access Denied" component instead of redirecting
    // but the user seemingly likes the redirect flow.

    // toast.error("تم رفض الوصول", {
    //   description: "ليس لديك صلاحية للوصول إلى هذه المنطقة.",
    // });

    // Instead of toast + redirect loop, let's render an Access Denied Message
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-2">تم رفض الوصول</h2>
        <p>
          ليس لديك الصلاحية اللازمة (
          {Array.isArray(requiredPermission)
            ? requiredPermission.join(", ")
            : requiredPermission}
          ) لعرض هذه الصفحة.
        </p>
      </div>
    );

    // OR generic redirect to dashboard?
    // return <Navigate to="/dashboard" replace />;
  }

  // 4. Render Children (Authorized)
  return <>{children || <Outlet />}</>;
};

export default PermissionGuard;
