import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, Check, X, Loader2 } from 'lucide-react';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    // Username availability state
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [debouncedUsername, setDebouncedUsername] = useState('');

    // Debounce username input
    useEffect(() => {
        if (isLogin) return;
        const timer = setTimeout(() => {
            setDebouncedUsername(username);
        }, 500);
        return () => clearTimeout(timer);
    }, [username, isLogin]);

    // Check username availability
    useEffect(() => {
        if (isLogin || !debouncedUsername || debouncedUsername.length < 3) {
            setUsernameStatus('idle');
            return;
        }

        const checkUsername = async () => {
            setUsernameStatus('checking');
            try {
                const response = await fetch(`http://localhost:8000/auth/check-username/${encodeURIComponent(debouncedUsername)}`);
                const data = await response.json();
                setUsernameStatus(data.available ? 'available' : 'taken');
            } catch (e) {
                setUsernameStatus('idle');
            }
        };

        checkUsername();
    }, [debouncedUsername, isLogin]);

    // Real-time password validation
    const passwordsMatch = useMemo(() => {
        if (!confirmPassword) return null;
        return password === confirmPassword;
    }, [password, confirmPassword]);

    const passwordStrength = useMemo(() => {
        if (!password) return null;
        if (password.length < 6) return 'weak';
        if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'strong';
        return 'medium';
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isLogin) {
            if (!username.trim()) {
                setError('Username is required');
                return;
            }
            if (usernameStatus === 'taken') {
                setError('Username is already taken');
                return;
            }
            if (!password || !confirmPassword) {
                setError('Password and Confirm Password are required');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }
        }

        if (isLogin) {
            if (!username.trim()) {
                setError('Username is required');
                return;
            }
            if (!password) {
                setError('Password is required');
                return;
            }
        }

        setIsLoading(true);

        const endpoint = isLogin ? '/auth/login' : '/auth/signup';
        const body = isLogin
            ? new URLSearchParams({ username, password })
            : JSON.stringify({
                email: email || undefined,
                username,
                password
            });

        try {
            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: 'POST',
                headers: isLogin
                    ? { 'Content-Type': 'application/x-www-form-urlencoded' }
                    : { 'Content-Type': 'application/json' },
                body
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            login(data.access_token, data.username);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 'weak': return '#ff4d4f';
            case 'medium': return '#faad14';
            case 'strong': return '#52c41a';
            default: return 'var(--glass-border)';
        }
    };

    const getUsernameStatusColor = () => {
        switch (usernameStatus) {
            case 'available': return '#52c41a';
            case 'taken': return '#ff4d4f';
            default: return 'var(--glass-border)';
        }
    };

    const canSignUp = !isLogin &&
        passwordsMatch !== false &&
        usernameStatus !== 'taken' &&
        usernameStatus !== 'checking';

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color)',
            padding: '20px',
            transition: 'background-color 0.3s ease'
        }}>
            <div className="glass fade-in" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>OpenChatLLM</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {isLogin ? 'Welcome back! Please login to continue.' : 'Create an account to get started.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Username - required for both login and signup */}
                    <div style={{ position: 'relative' }}>
                        <UserIcon size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={!isLogin && usernameStatus !== 'idle' ? { borderColor: getUsernameStatusColor() } : {}}
                        />
                        {/* Username availability indicator - only on signup */}
                        {!isLogin && username.length >= 3 && (
                            <div style={{
                                position: 'absolute',
                                right: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                color: getUsernameStatusColor()
                            }}>
                                {usernameStatus === 'checking' && <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
                                {usernameStatus === 'available' && <><Check size={16} /> Available</>}
                                {usernameStatus === 'taken' && <><X size={16} /> Taken</>}
                            </div>
                        )}
                    </div>

                    {/* Email - optional, only on signup */}
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                            <input
                                type="email"
                                placeholder="Email (optional)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Password - required */}
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={!isLogin && password ? { borderColor: getPasswordStrengthColor() } : {}}
                        />
                        {!isLogin && password && (
                            <div style={{
                                position: 'absolute',
                                right: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: getPasswordStrengthColor(),
                                textTransform: 'uppercase'
                            }}>
                                {passwordStrength}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password - required on signup only */}
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <ShieldCheck size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={passwordsMatch !== null ? {
                                    borderColor: passwordsMatch ? '#52c41a' : '#ff4d4f'
                                } : {}}
                            />
                            {passwordsMatch !== null && (
                                <div style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    color: passwordsMatch ? '#52c41a' : '#ff4d4f'
                                }}>
                                    {passwordsMatch ? <Check size={16} /> : <X size={16} />}
                                    {passwordsMatch ? 'Match' : 'No match'}
                                </div>
                            )}
                        </div>
                    )}

                    {error && <div style={{ color: '#ff4d4f', fontSize: '13px', textAlign: 'center', padding: '8px', background: 'rgba(255, 77, 79, 0.1)', borderRadius: '8px' }}>⚠️ {error}</div>}

                    <button
                        type="submit"
                        disabled={isLoading || (!isLogin && !canSignUp)}
                        style={{
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: (isLoading || (!isLogin && !canSignUp)) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            marginTop: '10px',
                            fontSize: '16px',
                            transition: 'var(--transition-smooth)',
                            opacity: (!isLogin && !canSignUp) ? 0.5 : 1
                        }}
                    >
                        {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                        {!isLoading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                    </span>
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); setConfirmPassword(''); setPassword(''); setUsernameStatus('idle'); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-color)',
                            fontWeight: 600,
                            marginLeft: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
