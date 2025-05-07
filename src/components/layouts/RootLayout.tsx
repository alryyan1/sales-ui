// src/components/layouts/RootLayout.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Outlet,
  Link as RouterLink,
  useNavigate,
  useLocation,
  useOutletContext,
} from "react-router-dom";
import { useTranslation } from "react-i18next";

// استيراد مكونات MUI الأساسية
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton"; // اختياري: لاستخدام أيقونة لتسجيل الخروج مثلاً
import MenuIcon from "@mui/icons-material/Menu"; // مثال لأيقونة قائمة (للتطوير المستقبلي)
import LogoutIcon from "@mui/icons-material/Logout"; // أيقونة تسجيل الخروج
// If using Dropdown:
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// استيراد خدمة المصادقة ونوع المستخدم
import authService, { User } from "../../services/authService";
import { FileText } from "lucide-react";

// --- تعريف نوع السياق الذي سيتم تمريره عبر Outlet ---
// هذا يساعد المكونات الفرعية في الحصول على الأنواع الصحيحة عند استخدام useOutletContext
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  handleLoginSuccess: (user: User) => void;
  handleRegisterSuccess: (user: User) => void;
};

// --- Hook مخصص للوصول السهل إلى سياق المصادقة من المكونات الفرعية ---
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useOutletContext<AuthContextType>();
}
// -------------------------------------------------------------
// src/components/layouts/RootLayout.tsx

// ... useAuth hook (no change needed) ...

const RootLayout: React.FC = () => {
  const { t } = useTranslation(["navigation", "common", "login", "register"]); // Load necessary namespaces
  const [user, setUser] = useState<User | null>(null);
  // isLoading now represents checking if the token (if any) is valid
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  // location is not strictly needed in handlers anymore if token is global
  // const location = useLocation();

  // --- Check Auth Status (Token Verification) ---
  const checkAuthStatus = useCallback(async () => {
    console.log("RootLayout: Checking authentication status (token)...");
    setIsLoading(true); // Start loading indicator
    try {
      const currentUser = await authService.getCurrentUser(); // Checks token & verifies with API
      setUser(currentUser); // currentUser will be null if token invalid or missing
      console.log("RootLayout: User status updated", currentUser);
    } catch (error) {
      // Should not happen if getCurrentUser returns null on error, but handle just in case
      console.error("RootLayout: Error during auth check", error);
      setUser(null);
    } finally {
      console.log("RootLayout: Finished auth check (token).");
      setIsLoading(false); // Finish loading
    }
  }, []); // No dependencies, runs once or when manually called

  useEffect(() => {
    checkAuthStatus(); // Check on initial mount
  }, [checkAuthStatus]);

  // --- Logout Handler ---
  const handleLogout = async () => {
    console.log("RootLayout: Logging out...");
    await authService.logout(); // Service handles token removal & API call
    setUser(null); // Clear user state
    navigate("/login"); // Redirect to login
    console.log("RootLayout: Logout complete.");
  };

  // --- Login/Register Success Handlers ---
  // These now primarily just update the user state, token is stored by service
  const handleLoginSuccess = (loggedInUser: User) => {
    console.log("RootLayout: Login successful", loggedInUser);
    setUser(loggedInUser);
    // Redirect to dashboard (or intended destination if you pass it)
    navigate("/dashboard", { replace: true });
  };

  const handleRegisterSuccess = (registeredUser: User) => {
    console.log("RootLayout: Registration successful", registeredUser);
    setUser(registeredUser);
    navigate("/dashboard", { replace: true });
  };

  // --- Loading State ---
  // Display loader ONLY during the initial check
  if (isLoading && user === null) {
    // Avoid full screen loader on simple navigation if user is already known
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // --- Render Layout ---
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* ... (App Title) ... */}
            <Typography component={RouterLink} to="/" /* ... sx props ... */>
              {t("common:appName")}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {user ? ( // Check user state
                <>
                  {/* Welcome message, Dashboard, Clients links */}
                  <Typography
                    sx={{ display: { xs: "none", sm: "block" }, mr: 1 }}
                  >
                    {t("navigation:welcome", { name: user.name })}
                  </Typography>
                  <Button
                    component={RouterLink}
                    to="/dashboard"
                    color="inherit"
                  >
                    {t("navigation:dashboard")}
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/purchases"
                    color="inherit"
                  >
                    {" "}
                    {/* <-- Add Link */}
                    {t("navigation:purchases")} {/* Make sure key exists */}
                  </Button>
                  <Button component={RouterLink} to="/sales" color="inherit">
                    {" "}
                    {/* <-- Add Link */}
                    {t("navigation:sales")} {/* Make sure key exists */}
                  </Button>
                  <Button component={RouterLink} to="/clients" color="inherit">
                    {t("navigation:clients")}
                  </Button>
                  <Button component={RouterLink} to="/products" color="inherit">
                    {t("navigation:products")}
                  </Button>
                  {/* --- Reports Link/Menu --- */}
                  {/* Option 1: Direct Link (if only one report for now) */}
               

                  {/* Option 2: Dropdown Menu (using shadcn example) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                      >
                        <FileText className="me-2 h-4 w-4" />{" "}
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
                      <DropdownMenuItem >
                        {" "}
                        <RouterLink to="/reports/purchases">
                          {t("reports:purchasesReportTitle")}
                        </RouterLink>
                    
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* --- End Reports Link/Menu --- */}

                  <Button
                    component={RouterLink}
                    to="/suppliers"
                    color="inherit"
                  >
                    {" "}
                    {/* <-- Add Link */}
                    {t("navigation:suppliers")}{" "}
                    {/* Make sure key exists in navigation.json */}
                  </Button>
                  {/* Logout Button */}

                  <Button
                    color="inherit"
                    onClick={handleLogout}
                    startIcon={<LogoutIcon />}
                  >
                    {t("navigation:logout")}
                  </Button>
                </>
              ) : (
                <>
                  {/* Login/Register Links */}
                  <Button component={RouterLink} to="/login" color="inherit">
                    {t("login:title")}
                  </Button>
                  <Button component={RouterLink} to="/register" color="inherit">
                    {t("register:title")}
                  </Button>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Container
        component="main"
        maxWidth="xl"
        sx={{ mt: 4, mb: 4, flexGrow: 1 }}
      >
        {/* Pass updated handlers and state to children */}
        <Outlet
          context={
            {
              user,
              isLoading,
              handleLoginSuccess,
              handleRegisterSuccess,
            } satisfies AuthContextType
          }
        />
      </Container>

      {/* ... (Footer) ... */}
      <Box
        component="footer"
        sx={{ bgcolor: "background.paper", p: 2, mt: "auto" }}
      >
        {/* ... (Copyright text using t('common:appName')) ... */}
      </Box>
    </Box>
  );
};

export default RootLayout;
