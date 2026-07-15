/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
    user: any;
    isAuthenticated: boolean;
    setUser: (user: any) => void;
    clearUser: () => void;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user: any) => set({ user, isAuthenticated: true }),
            clearUser: () => set({ user: null, isAuthenticated: false }),
            setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
        }),
        {
            name: 'user-storage',
        }
    )
);