// src/context/SettingsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import settingService, { AppSettings } from '@/services/settingService'; // Adjust path
import { toast } from 'sonner';

interface SettingsContextType {
    settings: AppSettings | null;
    isLoadingSettings: boolean;
    fetchSettings: () => Promise<void>;
    updateSettings: (data: Partial<AppSettings>) => Promise<AppSettings | null>; // Added update method
    getSetting: <K extends keyof AppSettings>(key: K, defaultValue?: AppSettings[K]) => AppSettings[K] | undefined;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    const fetchSettings = useCallback(async () => {
        console.log("SettingsProvider: Fetching settings...");
        setIsLoadingSettings(true);
        try {
            const fetchedSettings = await settingService.getSettings();
            setSettings(fetchedSettings);
            console.log("SettingsProvider: Settings loaded", fetchedSettings);
        } catch (error) {
            console.error("SettingsProvider: Failed to fetch settings", error);
            // Optionally show a toast, but be careful not to annoy on every app load if API is down
            // toast.error(t('error'), { description: settingService.getErrorMessage(error, "Failed to load app settings.")});
            setSettings(null); // Or set to default fallback settings
        } finally {
            setIsLoadingSettings(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);


    const updateSettings = async (data: Partial<AppSettings>): Promise<AppSettings | null> => {
        try {
            const updatedSettings = await settingService.updateSettings(data);
            setSettings(updatedSettings); // Update local context state
            toast.success('نجح', { description: 'تم تحديث الإعدادات بنجاح'});
            return updatedSettings;
        } catch (error) {
            toast.error('خطأ', { description: settingService.getErrorMessage(error) });
            throw error; // Rethrow for form to handle its own state
        }
    };

    const getSetting = <K extends keyof AppSettings>(key: K, defaultValue?: AppSettings[K]): AppSettings[K] | undefined => {
        return settings?.[key] ?? defaultValue;
    };


    const value = {
        settings,
        isLoadingSettings,
        fetchSettings, // Expose if manual refresh is needed
        updateSettings,
        getSetting
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};