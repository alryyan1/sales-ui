// src/components/layouts/UserMenu.tsx
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { User } from "@/services/authService";
import { adminNavItems, reportNavItems } from "./navItems";

interface UserMenuProps {
  user: User;
}

// Report routes that only make sense when expiry-date tracking is enabled.
const EXPIRY_ONLY_ROUTES = [
  "/reports/moved-expired-products",
  "/reports/low-stock-products",
];

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const { handleLogout } = useAuth();
  const { t } = useTranslation("navigation");
  const { t: tSidebar } = useTranslation("sidebar");
  const { t: tCommon } = useTranslation("common");
  const { getSetting } = useSettings();

  const displayName = user.name || user.username || tCommon("userAccount");

  const hasNavAccess = (route: string): boolean => {
    if (user.username === "superadmin" || user.allowed_navs === null) {
      return true;
    }
    return user.allowed_navs?.includes(route) ?? false;
  };

  const hideExpiryDate = getSetting("hide_expiry_date", false);
  const reports = reportNavItems.filter((item) => {
    if (hideExpiryDate && EXPIRY_ONLY_ROUTES.includes(item.to)) return false;
    return hasNavAccess(item.to);
  });
  const adminItems = adminNavItems.filter((item) => hasNavAccess(item.to));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={tCommon("userAccount")}
          className="flex h-9 max-w-[220px] items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserCircle className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{displayName}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {user.name || user.username}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <RouterLink to="/admin/settings">
            <SettingsIcon />
            {t("settings")}
          </RouterLink>
        </DropdownMenuItem>
        {reports.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <BarChart3 className="me-2 size-4 text-muted-foreground" />
              {t("reports")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[70vh] overflow-y-auto">
              {reports.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <RouterLink to={item.to}>{tSidebar(item.label)}</RouterLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {adminItems.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ShieldCheck className="me-2 size-4 text-muted-foreground" />
              {t("admin")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[70vh] overflow-y-auto">
              {adminItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <RouterLink to={item.to}>{tSidebar(item.label)}</RouterLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => handleLogout()}>
          <LogOut />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
