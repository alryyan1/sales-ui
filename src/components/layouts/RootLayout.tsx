// src/components/layouts/RootLayout.tsx
import React from 'react';
import { Outlet, Link as RouterLink, NavLink } from 'react-router-dom'; // Use NavLink for active styling
import { useAuth } from '@/context/AuthContext';
import { PermissionName, useAuthorization } from '@/hooks/useAuthorization';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils"; // For conditional classes

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Example for User menu trigger
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Example for mobile menu
import { Toaster } from 'sonner';
import {
    LayoutDashboard, Box, Users, Building, ShoppingCart, CircleDollarSign, LogOut, UserCircle,
    ChevronDown, Menu,  // Icons
    Loader2
} from 'lucide-react';
import { ThemeToggle } from '../layout/ThemeToggle';

// --- Navigation Link Item Component (Helper for styling active links) ---
interface NavLinkItemProps {
    to: string;
    icon?: React.ElementType; // Lucide icon component
    children: React.ReactNode;
    className?: string;
    onClick?: () => void; // For closing mobile sheet
}
const NavLinkItem: React.FC<NavLinkItemProps> = ({ to, icon: Icon, children, className, onClick }) => (
     <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-800",
            isActive ? "bg-accent text-accent-foreground dark:bg-gray-700" : "text-muted-foreground dark:text-gray-400",
            className
        )}
    >
        {Icon && <Icon className="h-4 w-4" />}
        {children}
    </NavLink>
);


// --- Main RootLayout ---
const RootLayout: React.FC = () => {
    const { t } = useTranslation(['navigation', 'common', 'reports', 'users', 'roles']);
    const { user, isLoading } = useAuth(); // Only need user and isLoading here now
    const {  can } = useAuthorization(); // Get auth checks and logout from hook
    const {handleLogout} = useAuth()
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false); // State for mobile sheet

    // Show full-page loader during initial context loading
    if (isLoading) {
        return ( <div className="flex justify-center items-center h-screen dark:bg-gray-950"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div> );
    }

    // Define Navigation Items (can be moved to a separate config file)
    interface NavItem {
        to: string;
        labelKey: string;
        icon?: React.ElementType;
        permission: PermissionName | null;
    }

    const navItems: NavItem[] = [
        { to: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, permission: null }, // Always show dashboard?
        { to: "/clients", labelKey: "clients", icon: Users, permission: "view-clients" },
        { to: "/suppliers", labelKey: "suppliers", icon: Building, permission: "view-suppliers" },
        { to: "/products", labelKey: "products", icon: Box, permission: "view-products" },
        { to: "/purchases", labelKey: "purchases", icon: ShoppingCart, permission: "view-purchases" },
        { to: "/inventory/adjustments", labelKey: "adjustments", icon: ShoppingCart, permission: "adjust-stock" },
        { to: "/sales", labelKey: "sales", icon: CircleDollarSign, permission: "view-sales" },
        { to: "/sales/pos", labelKey: "pos", icon: CircleDollarSign, permission: "view-sales" },
        { to: "/sales/returns", labelKey: "salesReturns", icon: CircleDollarSign, permission: "view-returns" },
    ];

    interface ReportItem {
        to: string;
        labelKey: string;
        permission: PermissionName;
    }

    const reportItems: ReportItem[] = [
         { to: "/reports/sales", labelKey: "salesReportTitle", permission: "view-reports"},
         { to: "/reports/purchases", labelKey: "purchaseReportTitle", permission: "view-reports"},
         { to: "/reports/inventory", labelKey: "inventoryReportTitle", permission: "view-reports"},
         { to: "/reports/profit-loss", labelKey: "profitLossReportTitle", permission: "view-reports"}, // Add if implemented
         { to: "/reports/inventory-log", labelKey: "inventoryLog", permission: "view-reports"},
         { to: "/reports/near-expiry", labelKey: "nearExpiry", permission: "view-reports"},
         { to: "/reports/monthly-revenue", labelKey: "monthlyRevenue", permission: "view-reports"},
    ];

    interface AdminItem {
        to: string;
        labelKey: string;
        permission: PermissionName;
    }

    const adminItems: AdminItem[] = [
         { to: "/admin/users", labelKey: "users", permission: "manage-users"},
         { to: "/admin/roles", labelKey: "roles", permission: "manage-roles"},
         { to: "/admin/categories", labelKey: "categories", permission: "manage-categories"},
         { to: "/admin/settings", labelKey: "settings", permission: "manage-settings"},
         { to: "/admin/inventory/requisitions/request", labelKey: "inventoryRequest", permission: "view-all-stock-requisitions"},
         { to: "/admin/inventory/requisitions", labelKey: "requisitions", permission: "view-all-stock-requisitions"},
    ];

    console.log(navItems,'navItems')
    // Filter items based on permissions
    const visibleNavItems = navItems.filter(item => item.permission === null || can(item.permission));
    console.log(visibleNavItems,'visibleNavItems')
    const canViewAnyReport = reportItems.some(item => can(item.permission)); // Check if user can view *any* report
    const visibleReportItems = reportItems.filter(item => can(item.permission));
    const canManageAdmin = adminItems.some(item => can(item.permission)); // Check if user can access *any* admin function shown
    const visibleAdminItems = adminItems.filter(item => can(item.permission));


    return (
        <div className="flex flex-col min-h-screen dark:bg-gray-950">
            <Toaster richColors position="bottom-center" theme="system" />

            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b bg-background dark:bg-gray-900 dark:border-gray-700">
                <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
                    {/* Mobile Menu Trigger */}
                     <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="sm:hidden me-4">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Open main menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="sm:hidden"> {/* Changed side to right for RTL maybe? Adjust as needed */}
                            <nav className="grid gap-4 text-lg font-medium pt-6">
                                {visibleNavItems.map(item => (
                                     <NavLinkItem key={item.to} to={item.to} icon={item.icon} onClick={() => setMobileMenuOpen(false)}>
                                         {t(`navigation:${item.labelKey}`)}
                                     </NavLinkItem>
                                ))}
                                 {/* Reports Dropdown (Mobile) */}
                                {canViewAnyReport && (
                                     <div className="mt-2">
                                         <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground">{t('navigation:reports')}</h4>
                                         {visibleReportItems.map(item => (
                                              <NavLinkItem key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="ps-6">
                                                  {t(`reports:${item.labelKey}`)}
                                              </NavLinkItem>
                                         ))}
                                     </div>
                                )}
                                {/* Admin Dropdown (Mobile) */}
                                {canManageAdmin && (
                                    <div className="mt-2">
                                        <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground">{t('navigation:admin')}</h4>
                                        {visibleAdminItems.map(item => (
                                             <NavLinkItem key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="ps-6">
                                                 {t(`navigation:${item.labelKey}`)}
                                             </NavLinkItem>
                                        ))}
                                    </div>
                                )}
                            </nav>
                        </SheetContent>
                     </Sheet>


                    {/* App Title/Logo */}
                    <RouterLink to="/" className="font-bold text-lg me-6 flex-shrink-0 dark:text-white">
                         {t('common:appName')}
                    </RouterLink>

                    {/* Desktop Navigation */}
                    <nav className="hidden sm:flex items-center gap-1 text-sm lg:gap-2 flex-grow">
                        {visibleNavItems.map(item => (
                            <Button key={item.to} variant="ghost" size="sm" asChild className="text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-white">
                                <RouterLink to={item.to}>{t(`navigation:${item.labelKey}`)}</RouterLink>
                            </Button>
                        ))}

                         {/* Reports Dropdown (Desktop) */}
                         {canViewAnyReport && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-white">
                                        {t('navigation:reports')} <ChevronDown className="ms-1 h-4 w-4 opacity-70"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {/* <DropdownMenuLabel>{t('navigation:availableReports')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator /> */}
                                    {visibleReportItems.map(item => (
                                         <DropdownMenuItem key={item.to} asChild>
                                             <RouterLink to={item.to}>{t(`reports:${item.labelKey}`)}</RouterLink>
                                         </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                         )}

                         {/* Admin Dropdown (Desktop) */}
                         {canManageAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-white">
                                        {t('navigation:admin')} <ChevronDown className="ms-1 h-4 w-4 opacity-70"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {/* <DropdownMenuLabel>{t('navigation:adminTools')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator /> */}
                                     {visibleAdminItems.map(item => (
                                         <DropdownMenuItem key={item.to} asChild>
                                             <RouterLink to={item.to}>{t(`navigation:${item.labelKey}`)}</RouterLink>
                                         </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                         )}
                    </nav>

                    {/* User Menu / Login */}
                    <div className="flex items-center gap-2 ms-auto">
                        <ThemeToggle />
                        {user ? (
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8">
                                            {/* Add user image logic later if available */}
                                            {/* <AvatarImage src="/avatars/01.png" alt={user.name} /> */}
                                            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <RouterLink to="/profile"><UserCircle className="me-2 h-4 w-4"/>{t('navigation:profile')}</RouterLink>
                                    </DropdownMenuItem>
                                    {/* Add settings link if needed */}
                                    {/* {can('manage-settings') && <DropdownMenuItem asChild><RouterLink to="/settings"><Settings className="me-2 h-4 w-4"/>{t('navigation:settings')}</RouterLink></DropdownMenuItem>} */}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50">
                                        <LogOut className="me-2 h-4 w-4"/>{t('navigation:logout')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Button variant="ghost" size="sm" asChild><RouterLink to="/login">{t('navigation:login')}</RouterLink></Button>
                                <Button size="sm" asChild><RouterLink to="/register">{t('navigation:register')}</RouterLink></Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow container mx-auto px-4 py-6 md:py-8">
                 <Outlet /> {/* Renders the matched route component */}
            </main>

            {/* Footer */}
             <footer className="p-4 text-center text-xs text-muted-foreground dark:bg-gray-800 border-t dark:border-gray-700">
                 © {new Date().getFullYear()} {t('common:appName')}
             </footer>
        </div>
     );
};

export default RootLayout;
// Don't forget to export useAuth from AuthContext.tsx
// Export NavLinkItem if used elsewhere