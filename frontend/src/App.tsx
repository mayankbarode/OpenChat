import React, { useState } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatArea from './components/ChatArea';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { useSettings, Provider } from './context/SettingsContext';
import { useAuth } from './context/AuthContext';
import { LogOut, User as UserIcon, Moon, Sun, Menu } from 'lucide-react';

const App: React.FC = () => {
    const { isAuthenticated, username, logout } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentConvId, setCurrentConvId] = useState<string | null>(null);
    const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
    const { isSidebarCollapsed, setIsSidebarCollapsed } = useSettings();
    const { settings, setProvider, setModel, availableModels, toggleTheme, isFetchingModels } = useSettings();

    if (!isAuthenticated) {
        return <Auth />;
    }

    const handleNewChat = () => {
        setCurrentConvId(null);
    };

    const handleSelectConv = (id: string) => {
        setCurrentConvId(id);
    };

    return (
        <div className="app-container" style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: 'var(--bg-color)' }}>
            {!isSidebarCollapsed && (
                <ChatSidebar
                    onNewChat={handleNewChat}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    currentConvId={currentConvId}
                    onSelectConv={handleSelectConv}
                    refreshKey={sidebarRefreshKey}
                />
            )}

            {isFetchingModels && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '3px',
                    zIndex: 2000,
                    background: 'var(--accent-color)',
                    opacity: 0.8,
                    overflow: 'hidden'
                }}>
                    <div className="loading-bar-animation" style={{
                        height: '100%',
                        background: 'white',
                        width: '30%',
                        boxShadow: '0 0 10px white'
                    }} />
                </div>
            )}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="glass" style={{
                    height: '64px',
                    display: 'flex',
                    padding: '0 24px',
                    justifyContent: 'space-between',
                    zIndex: 10,
                    borderBottom: '1px solid var(--glass-border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                transition: 'var(--transition-smooth)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            className="hover-bright"
                            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <Menu size={20} />
                        </button>
                        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>OpenChatLLM</h2>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select
                                value={settings.selectedProvider}
                                onChange={(e) => setProvider(e.target.value as Provider)}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="gemini">Gemini</option>
                                <option value="vllm">vLLM</option>
                            </select>

                            <select
                                value={settings.selectedModel}
                                onChange={(e) => setModel(e.target.value)}
                                disabled={availableModels.length === 0}
                                style={{
                                    cursor: availableModels.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: availableModels.length === 0 ? 0.6 : 1
                                }}
                            >
                                {availableModels.length > 0 ? (
                                    availableModels.map((m: string) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))
                                ) : (
                                    <option value="">No models fetched</option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            <UserIcon size={16} />
                            {username}
                        </div>
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px',
                                borderRadius: '8px',
                                transition: 'var(--transition-smooth)'
                            }}
                            className="hover-bright"
                            title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <button
                            onClick={logout}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px'
                            }}
                            className="hover-bright"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                </header>

                <ChatArea
                    provider={settings.selectedProvider}
                    model={settings.selectedModel}
                    apiKey={settings.apiKeys[settings.selectedProvider]}
                    baseUrl={settings.baseUrls[settings.selectedProvider]}
                    conversationId={currentConvId}
                    onConversationCreated={(id) => {
                        setCurrentConvId(id);
                        setSidebarRefreshKey(k => k + 1);
                    }}
                />
            </main>

            {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
        </div>
    );
};

export default App;
