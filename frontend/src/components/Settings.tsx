import React, { useEffect, useState } from 'react';
import { useSettings, Provider } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { Lock, Check, X, Cpu, User } from 'lucide-react';

interface SettingsProps {
    onClose: () => void;
}

type Tab = 'api' | 'account';

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const {
        settings,
        updateApiKey,
        updateBaseUrl,
        fetchModels,
        isFetchingModels,
        fetchError,
        availableModels
    } = useSettings();
    const { token } = useAuth();
    const provider = settings.selectedProvider;

    const [activeTab, setActiveTab] = useState<Tab>('api');

    // Change password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordChangeStatus, setPasswordChangeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [passwordChangeError, setPasswordChangeError] = useState('');

    const providerNames: Record<Provider, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        gemini: 'Google Gemini',
        vllm: 'vLLM / Local'
    };

    // Password validation
    const passwordsMatch = newPassword && confirmNewPassword ? newPassword === confirmNewPassword : null;
    const canChangePassword = currentPassword && newPassword && confirmNewPassword && passwordsMatch && newPassword.length >= 6;

    // Auto-fetch if key exists but models are empty
    useEffect(() => {
        if (availableModels.length === 0 && (settings.apiKeys[provider] || (provider === 'vllm' && settings.baseUrls[provider]))) {
            fetchModels(provider);
        }
    }, [provider]);

    const handleChangePassword = async () => {
        if (!canChangePassword) return;

        setPasswordChangeStatus('loading');
        setPasswordChangeError('');

        try {
            const response = await fetch('http://localhost:8000/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to change password');
            }

            setPasswordChangeStatus('success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

            // Reset status after 3 seconds
            setTimeout(() => setPasswordChangeStatus('idle'), 3000);
        } catch (err: any) {
            setPasswordChangeStatus('error');
            setPasswordChangeError(err.message);
        }
    };

    return (
        <div className="settings-overlay glass" style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '480px',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '32px',
            borderRadius: '20px',
            zIndex: 1000,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Settings</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            <div className="tabs-container">
                <button
                    className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
                    onClick={() => setActiveTab('api')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <Cpu size={14} /> AI Connectivity
                </button>
                <button
                    className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
                    onClick={() => setActiveTab('account')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <User size={14} /> Account Security
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '300px' }}>
                {activeTab === 'api' && (
                    <section className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                {providerNames[provider]} Configuration
                            </h3>
                            {isFetchingModels && <span style={{ fontSize: '12px', color: 'var(--accent-color)' }}>Fetching models...</span>}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>API Key</label>
                                <input
                                    type="password"
                                    placeholder={`Enter ${providerNames[provider]} API Key`}
                                    value={settings.apiKeys[provider] || ''}
                                    onChange={(e) => updateApiKey(provider, e.target.value)}
                                />
                            </div>

                            {provider === 'vllm' && (
                                <div>
                                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Base URL</label>
                                    <input
                                        type="text"
                                        placeholder="http://localhost:8000/v1"
                                        value={settings.baseUrls[provider] || ''}
                                        onChange={(e) => updateBaseUrl(provider, e.target.value)}
                                    />
                                </div>
                            )}

                            <button
                                onClick={() => fetchModels(provider)}
                                disabled={isFetchingModels}
                                style={{
                                    marginTop: '8px',
                                    padding: '8px 16px',
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    color: 'var(--accent-color)',
                                    border: '1px solid var(--accent-color)',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: isFetchingModels ? 'not-allowed' : 'pointer',
                                    width: 'fit-content',
                                    transition: 'var(--transition-smooth)'
                                }}>
                                {isFetchingModels ? 'Verifying...' : 'Verify & Fetch Models'}
                            </button>

                            {fetchError && (
                                <div style={{ fontSize: '12px', color: '#ff4d4f', marginTop: '8px' }}>
                                    ⚠️ {fetchError}
                                </div>
                            )}
                            {!fetchError && !isFetchingModels && availableModels.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '8px' }}>
                                    ✓ Successfully fetched {availableModels.length} models
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'account' && (
                    <section className="fade-in">
                        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Change Password
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                                <input
                                    type="password"
                                    placeholder="Current Password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                                <input
                                    type="password"
                                    placeholder="New Password (min 6 chars)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                                <input
                                    type="password"
                                    placeholder="Confirm New Password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    style={{
                                        paddingLeft: '40px',
                                        borderColor: passwordsMatch === null ? undefined : (passwordsMatch ? '#52c41a' : '#ff4d4f')
                                    }}
                                />
                                {passwordsMatch !== null && (
                                    <div style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: passwordsMatch ? '#52c41a' : '#ff4d4f'
                                    }}>
                                        {passwordsMatch ? <Check size={16} /> : <X size={16} />}
                                    </div>
                                )}
                            </div>

                            {passwordChangeStatus === 'error' && (
                                <div style={{ fontSize: '12px', color: '#ff4d4f' }}>⚠️ {passwordChangeError}</div>
                            )}
                            {passwordChangeStatus === 'success' && (
                                <div style={{ fontSize: '12px', color: '#52c41a' }}>✓ Password changed successfully!</div>
                            )}

                            <button
                                onClick={handleChangePassword}
                                disabled={!canChangePassword || passwordChangeStatus === 'loading'}
                                style={{
                                    padding: '10px 16px',
                                    background: canChangePassword ? 'var(--accent-color)' : 'rgba(49, 130, 206, 0.3)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: canChangePassword ? 'pointer' : 'not-allowed',
                                    width: 'fit-content',
                                    opacity: canChangePassword ? 1 : 0.5,
                                    transition: 'var(--transition-smooth)'
                                }}>
                                {passwordChangeStatus === 'loading' ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </section>
                )}
            </div>

            <button
                onClick={onClose}
                style={{
                    width: '100%',
                    marginTop: '32px',
                    padding: '12px',
                    background: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                }}>
                Done
            </button>
        </div>
    );
};

export default Settings;
