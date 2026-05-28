'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, fetchUser } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  return <>{children}</>;
}
