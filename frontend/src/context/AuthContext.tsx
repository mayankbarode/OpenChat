import React, { createContext, useContext, useState } from 'react';

interface AuthState {
    token: string | null;
    username: string | null;
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
    login: (token: string, username: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [auth, setAuth] = useState<AuthState>(() => {
        const token = localStorage.getItem('openchatllm_token');
        const username = localStorage.getItem('openchatllm_username');
        return {
            token,
            username,
            isAuthenticated: !!token
        };
    });

    const login = (token: string, username: string) => {
        localStorage.setItem('openchatllm_token', token);
        localStorage.setItem('openchatllm_username', username);
        setAuth({
            token,
            username,
            isAuthenticated: true
        });
    };

    const logout = () => {
        localStorage.removeItem('openchatllm_token');
        localStorage.removeItem('openchatllm_username');
        setAuth({
            token: null,
            username: null,
            isAuthenticated: false
        });
    };

    return (
        <AuthContext.Provider value={{ ...auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
