// src/components/layouts/TopAppBar.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  DollarSign,
  FileWarning,
  Loader2,
  Menu as MenuIcon,
  Search,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { DRAWER_WIDTH } from "./types";
import UserMenu from "./UserMenu";
import { KeyboardShortcutsDialog } from "../common/KeyboardShortcutsDialog";
import { DueRemindersDialog } from "../pos/DueRemindersDialog";
import saleReminderService, { DueReminder } from "@/services/saleReminderService";
import packageService, { Package } from "@/services/packageService";
import { db } from "@/firebase";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { formatNumber } from "@/constants";

const COLLAPSED_DRAWER_WIDTH = 72;

interface TopAppBarProps {
  onDrawerToggle: () => void;
  isSidebarCollapsed: boolean;
}

const TopAppBar: React.FC<TopAppBarProps> = ({ onDrawerToggle, isSidebarCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getSetting, updateSettings } = useSettings();
  const { hasPermission } = useAuthorization();
  const canEditDollarRate = hasPermission("تعديل سعر الدولار");
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = React.useState(false);

  const isPosPage = location.pathname === "/sales/pos-blank";

  // USD to SDG factor
  const usdFactor = getSetting("usd_to_sdg_factor", 1) as number;
  const [localFactor, setLocalFactor] = React.useState(String(usdFactor));
  const [factorPopoverOpen, setFactorPopoverOpen] = React.useState(false);
  const [isUpdatingFactor, setIsUpdatingFactor] = React.useState(false);

  // Package search (POS page only)
  const [packageOptions, setPackageOptions] = React.useState<Package[]>([]);
  const [packageSearchLoading, setPackageSearchLoading] = React.useState(false);
  const [packageInputValue, setPackageInputValue] = React.useState("");
  const [isAddingPackage, setIsAddingPackage] = React.useState(false);
  const [packagePopoverOpen, setPackagePopoverOpen] = React.useState(false);

  const [expiryCounts, setExpiryCounts] = React.useState({
    nearExpiringCount: 0,
    expiredCount: 0,
  });
  const [dueReminders, setDueReminders] = React.useState<DueReminder[]>([]);
  const [remindersDialogOpen, setRemindersDialogOpen] = React.useState(false);
  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;
  const [firebaseConnected, setFirebaseConnected] = React.useState(false);

  React.useEffect(() => {
    saleReminderService
      .getDueReminders()
      .then((list) => setDueReminders(list))
      .catch(() => {
        /* silent fail */
      });
  }, []);

  // Search packages
  React.useEffect(() => {
    const term = packageInputValue.trim();
    if (!term) {
      setPackageOptions([]);
      setPackagePopoverOpen(false);
      return;
    }
    setPackagePopoverOpen(true);
    const t = setTimeout(() => {
      setPackageSearchLoading(true);
      packageService
        .getPackages()
        .then((list) => {
          const filtered = list.filter((p) =>
            p.name.toLowerCase().includes(term.toLowerCase())
          );
          setPackageOptions(filtered);
        })
        .catch(() => setPackageOptions([]))
        .finally(() => setPackageSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [packageInputValue]);

  // Listen for addition status from POS page
  React.useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsAddingPackage(customEvent.detail.isAdding);
      if (customEvent.detail.success) {
        setPackageInputValue("");
        setPackagePopoverOpen(false);
      }
    };
    window.addEventListener("package-addition-status", handleStatus);
    return () => window.removeEventListener("package-addition-status", handleStatus);
  }, []);

  React.useEffect(() => {
    setLocalFactor(String(usdFactor));
  }, [usdFactor]);

  const handleSaveFactor = async () => {
    const val = parseFloat(localFactor);
    if (isNaN(val) || val <= 0) {
      toast.error("يجب إدخال قيمة صحيحة موجبة");
      return;
    }
    try {
      setIsUpdatingFactor(true);
      await updateSettings({ usd_to_sdg_factor: val });
      setFactorPopoverOpen(false);
      toast.success("تم حفظ سعر الصرف بنجاح");
    } catch (err) {
      console.error("Failed to update factor:", err);
      toast.error("فشل حفظ سعر الصرف");
    } finally {
      setIsUpdatingFactor(false);
    }
  };

  React.useEffect(() => {
    const q = query(collection(db, "pharmacies", firebaseCollectionName, "shifts"), limit(1));
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        setFirebaseConnected(!snapshot.metadata.fromCache);
      },
      () => {
        setFirebaseConnected(false);
      }
    );
    return () => unsubscribe();
  }, [firebaseCollectionName]);

  React.useEffect(() => {
    const handleUpdateCounts = (e: Event) => {
      const customEvent = e as CustomEvent;
      setExpiryCounts(customEvent.detail);
    };
    window.addEventListener("update-expiry-counts", handleUpdateCounts);
    return () => window.removeEventListener("update-expiry-counts", handleUpdateCounts);
  }, []);

  const handleSelectPackage = (pkg: Package) => {
    window.dispatchEvent(new CustomEvent("add-package-to-sale", { detail: pkg }));
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 flex h-16 w-full items-center gap-2 border-b border-border/10 bg-background/80 px-4 backdrop-blur-md transition-[width,margin] duration-300 ease-out sm:w-[var(--appbar-w)] sm:mr-[var(--appbar-mr)]"
        style={
          {
            "--appbar-w": `calc(100% - ${isSidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px)`,
            "--appbar-mr": `${isSidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px`,
          } as React.CSSProperties
        }
      >
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="فتح القائمة"
          onClick={onDrawerToggle}
        >
          <MenuIcon />
        </Button>

        {/* Page-specific actions */}
        <div className="flex flex-1 items-center gap-2">
          {isPosPage && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => window.dispatchEvent(new CustomEvent("open-top-selling-dialog"))}
            >
              <TrendingUp className="size-4" />
              الأكثر مبيعاً
            </Button>
          )}

          {isPosPage && (
            <>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                  aria-label="منتجات قاربت على الانتهاء"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("open-near-expiring-dialog"))
                  }
                >
                  <FileWarning className="size-[18px]" />
                </Button>
                {expiryCounts.nearExpiringCount > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                    {expiryCounts.nearExpiringCount}
                  </span>
                )}
              </div>

              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-9",
                    expiryCounts.expiredCount === 0
                      ? "text-blue-500 hover:bg-blue-500/10"
                      : "text-destructive hover:bg-destructive/10"
                  )}
                  aria-label="منتجات منتهية الصلاحية"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-expired-dialog"))}
                >
                  <AlertTriangle className="size-[18px]" />
                </Button>
                {expiryCounts.expiredCount > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                    {expiryCounts.expiredCount}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Package search */}
          {isPosPage && (
            <Popover open={packagePopoverOpen} onOpenChange={setPackagePopoverOpen}>
              <PopoverAnchor asChild>
                <div className="relative w-80">
                  <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={packageInputValue}
                    onChange={(e) => setPackageInputValue(e.target.value)}
                    onFocus={() => packageInputValue.trim() && setPackagePopoverOpen(true)}
                    placeholder="ابحث عن مجموعة"
                    className="h-9 bg-background/50 ps-8 pe-8"
                  />
                  {(packageSearchLoading || isAddingPackage) && (
                    <Loader2 className="absolute end-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
              </PopoverAnchor>
              <PopoverContent
                align="start"
                className="w-80 p-1"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                {packageOptions.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {packageSearchLoading ? "جاري البحث..." : "لا توجد مجموعات مطابقة"}
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {packageOptions.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => handleSelectPackage(pkg)}
                        className="flex w-full items-center rounded-sm px-2 py-1.5 text-start text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {pkg.name}
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* USD conversion factor */}
          <Popover open={factorPopoverOpen} onOpenChange={setFactorPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={!canEditDollarRate}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-md border border-border/50 px-2.5 text-xs font-semibold",
                      canEditDollarRate
                        ? "cursor-pointer hover:bg-primary/10"
                        : "cursor-default"
                    )}
                  >
                    <DollarSign className="size-3.5" />
                    {usdFactor.toFixed(2)}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>{formatNumber(usdFactor)} SDG = 1 USD</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-3">
                <p className="text-sm font-semibold">تحديث سعر الصرف USD</p>
                <div className="space-y-1.5">
                  <Label htmlFor="usd-factor">سعر الصرف</Label>
                  <Input
                    id="usd-factor"
                    type="number"
                    step={0.01}
                    min={0}
                    value={localFactor}
                    onChange={(e) => setLocalFactor(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFactorPopoverOpen(false)}
                    disabled={isUpdatingFactor}
                  >
                    إلغاء
                  </Button>
                  <Button size="sm" onClick={handleSaveFactor} disabled={isUpdatingFactor}>
                    {isUpdatingFactor && <Loader2 className="size-3.5 animate-spin" />}
                    حفظ
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Firebase connection indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-2.5 rounded-full transition-colors",
                    firebaseConnected
                      ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.25)]"
                      : "bg-muted-foreground/40"
                  )}
                />
                <span
                  className={cn(
                    "text-[0.7rem] font-semibold tracking-wide",
                    firebaseConnected ? "text-green-500" : "text-muted-foreground"
                  )}
                >
                  {firebaseCollectionName}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{`pharmacies/${firebaseCollectionName}/shifts`}</TooltipContent>
          </Tooltip>

          {/* Warehouse */}
          {user?.warehouse && (
            <Badge
              variant="secondary"
              className="h-7 cursor-pointer gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() =>
                user.warehouse && navigate(`/admin/warehouses/${user.warehouse.id}/products`)
              }
            >
              <Warehouse className="size-3.5" />
              {user.warehouse.name}
            </Badge>
          )}

          {/* Due reminders */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-9",
                    dueReminders.length > 0 &&
                      "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                  )}
                  aria-label="تذكيرات الدفع"
                  onClick={() => setRemindersDialogOpen(true)}
                >
                  <Bell
                    className="size-[18px]"
                    fill={dueReminders.length > 0 ? "currentColor" : "none"}
                  />
                </Button>
                {dueReminders.length > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                    {Math.min(dueReminders.length, 99)}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>تذكيرات الدفع</TooltipContent>
          </Tooltip>

          {user && <UserMenu user={user} />}
        </div>
      </header>

      <DueRemindersDialog
        open={remindersDialogOpen}
        reminders={dueReminders}
        onDismiss={(id) => setDueReminders((prev) => prev.filter((r) => r.id !== id))}
        onClose={() => setRemindersDialogOpen(false)}
      />

      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />
    </>
  );
};

export default TopAppBar;
