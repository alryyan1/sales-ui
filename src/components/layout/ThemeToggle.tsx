// src/components/layout/ThemeToggle.tsx
import React from 'react';
import { useTheme } from '@/context/ThemeContext'; // Adjust path
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop } from 'lucide-react'; // Icons
import { useTranslation } from 'react-i18next';

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const { t } = useTranslation('common'); // Assuming theme keys are in common.json

    const getCurrentIcon = () => {
        if (theme === 'light' || (theme === 'system' && resolvedTheme === 'light')) {
            return <Sun className="h-[1.2rem] w-[1.2rem]" />;
        }
        if (theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark')) {
            return <Moon className="h-[1.2rem] w-[1.2rem]" />;
        }
        return <Laptop className="h-[1.2rem] w-[1.2rem]" />; // For 'system' before resolution or as fallback
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t('themeToggle.label') || 'Toggle theme'}>
                    {/* Display current theme icon */}
                    {/* This icon will change based on theme state, not just resolvedTheme for explicit selection */}
                    {theme === 'light' && <Sun className="h-[1.2rem] w-[1.2rem]" />}
                    {theme === 'dark' && <Moon className="h-[1.2rem] w-[1.2rem]" />}
                    {theme === 'system' && <Laptop className="h-[1.2rem] w-[1.2rem]" />}
                    <span className="sr-only">{t('themeToggle.label') || 'Toggle theme'}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="me-2 h-4 w-4" />
                    {t('themeToggle.light') || 'Light'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="me-2 h-4 w-4" />
                    {t('themeToggle.dark') || 'Dark'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Laptop className="me-2 h-4 w-4" />
                    {t('themeToggle.system') || 'System'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};