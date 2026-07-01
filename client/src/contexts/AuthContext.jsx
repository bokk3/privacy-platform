import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken } from '../lib/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Check if we have an existing session refresh token on mount
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            // The Axios interceptor logic will automatically handle /auth/refresh
            // when we try to fetch profile without a valid access token in memory
            fetchProfile();
        } else {
            setIsLoading(false);
        }

        const handleUnauthorized = () => {
            setUser(null);
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [fetchProfile]);

    const login = async (credentials) => {
        const res = await api.post('/auth/login', credentials);
        // If MFA is required, the response indicates this
        if (res.data.mfaRequired) {
            return res.data;
        }

        // Normal login flow
        setAccessToken(res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        await fetchProfile();
        return res.data;
    };

    const loginMfa = async (mfaData) => {
        const res = await api.post('/auth/login/mfa', mfaData);
        setAccessToken(res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        await fetchProfile();
        return res.data;
    };

    const register = async (userData) => {
        const res = await api.post('/auth/register', userData);
        setAccessToken(res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        await fetchProfile();
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        try {
            if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } catch (err) {
            // Ignore errors during logout (network drop, already expired)
        } finally {
            setAccessToken(null);
            localStorage.removeItem('refreshToken');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            login,
            loginMfa,
            register,
            logout,
            fetchProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
