import { Outlet, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

// استيراد مكونات MUI الأساسية
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import LogoutIcon from "@mui/icons-material/Logout"; // أيقونة تسجيل الخروج
// If using Dropdown:

// استيراد خدمة المصادقة ونوع المستخدم
import { FileText, Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { Toaster } from "../ui/sonner";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { t } from "i18next";

const RootLayout: React.FC = () => {
  const { t } = useTranslation(["navigation", "common", "login", "register"]); // Load necessary namespaces
  const { isLoading, user, handleLogout } = useAuth();
  const { can, hasRole } = useAuthorization();

  // --- Loading State ---
  // Display loader ONLY during the initial check
  // Show global loader only during the initial check
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  // --- Render Layout ---
  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-950">
      <Toaster richColors position="bottom-center" theme="system" />
      {/* Example Header using shadcn Buttons */}
      <header className="sticky top-0 z-40 w-full border-b bg-background dark:bg-gray-900 dark:border-gray-700">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          {/* App Title/Logo */}
          <RouterLink to="/" className="font-bold text-lg">
            {t("common:appName")}
          </RouterLink>

          {/* Navigation */}
          <nav className="flex items-center space-x-1 md:space-x-2 lg:space-x-4">
            {user ? (
              <>
                {/* Always show Dashboard maybe? */}
                <Button variant="ghost" asChild>
                  <RouterLink to="/dashboard">
                    {t("navigation:dashboard")}
                  </RouterLink>
                </Button>

                {can("view-clients") && (
                  <Button variant="ghost" asChild>
                    <RouterLink to="/clients">
                      {t("navigation:clients")}
                    </RouterLink>
                  </Button>
                )}
                {can("view-suppliers") && (
                  <Button variant="ghost" asChild>
                    <RouterLink to="/suppliers">
                      {t("navigation:suppliers")}
                    </RouterLink>
                  </Button>
                )}
                {can("view-products") && (
                  <Button variant="ghost" asChild>
                    <RouterLink to="/products">
                      {t("navigation:products")}
                    </RouterLink>
                  </Button>
                )}
                {can("view-purchases") && (
                  <Button variant="ghost" asChild>
                    <RouterLink to="/purchases">
                      {t("navigation:purchases")}
                    </RouterLink>
                  </Button>
                )}
                {can("view-sales") && (
                  <Button variant="ghost" asChild>
                    <RouterLink to="/sales">{t("navigation:sales")}</RouterLink>
                  </Button>
                )}

                {/* Example Dropdown for Reports (Needs DropdownMenu component) */}
                {can("view-reports") && (
                  // Replace with DropdownMenu if implemented
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                      >
                        <FileText className="me-2 h-4 w-4" />
                        {t("navigation:reports")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        {t("navigation:availableReports")}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <RouterLink to="/reports/sales">
                          {t("reports:salesReportTitle")}
                        </RouterLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        
                        <RouterLink to="/reports/purchases">
                          {t("reports:purchasesReportTitle")}
                        </RouterLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        
                        <RouterLink to="/reports/inventory">
                          {t("reports:reportInventoryTitle")}
                        </RouterLink>
                     
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        
                        <RouterLink to="/reports/profit-loss">
                          {t("reports:profitLossReportTitle")}
                        </RouterLink>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                 
                  </DropdownMenu>
                )}

                {/* --- Admin Links --- */}
                {hasRole("admin") && (
                  <Button variant="ghost" asChild>
                    <RouterLink to="/admin/users">
                      {t("navigation:users")}
                    </RouterLink>
                  </Button>
                  // Add link for /admin/roles later if needed
                )}
                {/* --- End Admin Links --- */}

                {/* Profile/Logout */}
                <Button variant="ghost" asChild>
                  <RouterLink to="/profile">
                    {t("navigation:profile")}
                  </RouterLink>
                </Button>

                <Button variant="outline" size="sm" onClick={handleLogout}>
                  {t("navigation:logout")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <RouterLink to="/login">{t("navigation:login")}</RouterLink>
                </Button>
                <Button variant="default" asChild>
                  <RouterLink to="/register">
                    {t("navigation:register")}
                  </RouterLink>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 py-6 md:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground dark:bg-gray-800">
        © {new Date().getFullYear()} {t("common:appName")}
      </footer>
    </div>
  );
};

export default RootLayout;
