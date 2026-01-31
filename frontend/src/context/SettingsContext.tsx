import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'vllm';

export interface AppSettings {
    selectedProvider: Provider;
    selectedModel: string;
    apiKeys: Record<string, string>;
    baseUrls: Record<string, string>;
    theme: 'dark' | 'light';
    isSidebarCollapsed: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    selectedProvider: 'openai',
    selectedModel: 'gpt-4o',
    apiKeys: {},
    baseUrls: { vllm: 'http://localhost:8000/v1' },
    theme: 'dark',
    isSidebarCollapsed: false
};

interface SettingsContextType {
    settings: AppSettings;
    availableModels: string[];
    isFetchingModels: boolean;
    fetchError: string | null;
    updateApiKey: (provider: string, key: string) => void;
    updateBaseUrl: (provider: string, url: string) => void;
    setProvider: (provider: Provider) => void;
    setModel: (model: string) => void;
    toggleTheme: () => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    fetchModels: (provider: Provider) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, isAuthenticated, logout } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('openchatllm_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
        return DEFAULT_SETTINGS;
    });

    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Fetch settings from backend on mount or login
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchBackendSettings();
        }
    }, [isAuthenticated, token]);

    const fetchBackendSettings = async () => {
        if (!token) return;
        try {
            console.log("Fetching backend settings...");
            const response = await fetch('http://localhost:8000/user/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                console.warn("Session expired or invalid token. Logging out...");
                logout();
                return;
            }

            if (response.ok) {
                const data = await response.json();
                console.log("Backend settings received:", data);

                let needsPush = false;
                let mergedKeys = {};
                let mergedUrls = {};

                setSettings(prev => {
                    mergedKeys = { ...prev.apiKeys, ...data.api_keys };
                    mergedUrls = { ...prev.baseUrls, ...data.base_urls };

                    // Check if local has keys backend doesn't (migration)
                    needsPush = Object.keys(prev.apiKeys).some(k => !data.api_keys[k]);

                    return {
                        ...prev,
                        apiKeys: mergedKeys,
                        baseUrls: mergedUrls,
                        selectedProvider: data.selected_provider || prev.selectedProvider,
                        selectedModel: data.selected_model || prev.selectedModel
                    };
                });

                if (needsPush) {
                    console.log("Migrating local settings to backend...");
                    saveBackendSettings({
                        api_keys: mergedKeys,
                        base_urls: mergedUrls
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch backend settings", e);
        }
    };

    const saveBackendSettings = async (updates: any) => {
        if (!isAuthenticated || !token) return;
        try {
            console.log("Saving settings to backend:", updates);
            const response = await fetch('http://localhost:8000/user/settings', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (response.status === 401) {
                logout();
                return;
            }

            console.log("Settings saved to backend successfully");
        } catch (e) {
            console.error("Failed to save backend settings", e);
        }
    };

    useEffect(() => {
        localStorage.setItem('openchatllm_settings', JSON.stringify(settings));

        // Apply theme to document
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }, [settings]);

    const fetchModels = useCallback(async (provider: Provider) => {
        const apiKey = settings.apiKeys[provider];
        const baseUrl = settings.baseUrls[provider];

        if (!apiKey && provider !== 'vllm') {
            setAvailableModels([]);
            setFetchError(null);
            return;
        }

        setIsFetchingModels(true);
        setFetchError(null);
        try {
            const params = new URLSearchParams({ provider });
            if (apiKey) params.append('apiKey', apiKey);
            if (baseUrl) params.append('baseUrl', baseUrl);

            const response = await fetch(`http://localhost:8000/models?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch models');
            }
            const data = await response.json();
            if (data.models) {
                setAvailableModels(data.models);
                if (data.models.length > 0 && !data.models.includes(settings.selectedModel)) {
                    setModel(data.models[0]);
                }
            }
        } catch (e: any) {
            setFetchError(e.message);
            setAvailableModels([]);
        } finally {
            setIsFetchingModels(false);
        }
    }, [settings.apiKeys, settings.baseUrls, settings.selectedModel]);

    // Re-fetch when provider changes
    useEffect(() => {
        fetchModels(settings.selectedProvider);
    }, [settings.selectedProvider]);

    const updateApiKey = (provider: string, key: string) => {
        const newKeys = { ...settings.apiKeys, [provider]: key };
        setSettings(prev => ({ ...prev, apiKeys: newKeys }));
        saveBackendSettings({ api_keys: newKeys });
    };

    const updateBaseUrl = (provider: string, url: string) => {
        const newUrls = { ...settings.baseUrls, [provider]: url };
        setSettings(prev => ({ ...prev, baseUrls: newUrls }));
        saveBackendSettings({ base_urls: newUrls });
    };

    const setProvider = (provider: Provider) => {
        setSettings(prev => ({ ...prev, selectedProvider: provider }));
        saveBackendSettings({ selected_provider: provider });
    };

    const setModel = (model: string) => {
        setSettings(prev => ({ ...prev, selectedModel: model }));
        saveBackendSettings({ selected_model: model });
    };

    const toggleTheme = () => {
        setSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            availableModels,
            isFetchingModels,
            fetchError,
            updateApiKey,
            updateBaseUrl,
            setProvider,
            setModel,
            toggleTheme,
            setIsSidebarCollapsed: (collapsed: boolean) => setSettings(prev => ({ ...prev, isSidebarCollapsed: collapsed })),
            isSidebarCollapsed: settings.isSidebarCollapsed,
            fetchModels
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
