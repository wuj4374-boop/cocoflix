'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

type TabType = 'login' | 'register';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    avatarUrl: string | null;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const authLogin = useAuthStore((s) => s.login);
  const [tab, setTab] = useState<TabType>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setError('');
  };

  const handleTabSwitch = (newTab: TabType) => {
    setTab(newTab);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const body: Record<string, string> = { username, password };
      if (tab === 'register' && email.trim()) {
        body.email = email.trim();
      }

      const data = (await apiClient.post(endpoint, body)) as unknown as TokenResponse;
      authLogin(data.accessToken, {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email ?? undefined,
        avatarUrl: data.user.avatarUrl ?? undefined,
        role: data.user.role,
      });
      router.push('/');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || (tab === 'login' ? '登录失败' : '注册失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0508] to-[#050505]"
        style={{ backgroundSize: '400% 400%', animation: 'gradientShift 15s ease infinite' }}
      />

      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-gradient mb-2">CocoFlix</h1>
          <p className="text-text-secondary">私人流媒体影院</p>
        </motion.div>

        <GlassCard variant="light" padding="lg">
          {/* Tabs */}
          <div className="flex mb-6 rounded-xl bg-white/[0.04] p-1">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabSwitch(t)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300',
                  tab === t
                    ? 'bg-primary text-white shadow-glow-md'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {t === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
                    用户名
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-300"
                    required
                  />
                </div>

                {/* Email (register only) */}
                <AnimatePresence>
                  {tab === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                        邮箱 <span className="text-white/20">(可选)</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="请输入邮箱"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-300"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                    密码
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'register' ? '至少6位密码' : '请输入密码'}
                    minLength={tab === 'register' ? 6 : undefined}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-300"
                    required
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 active:scale-95 bg-primary text-white shadow-glow-md hover:shadow-glow-lg hover:bg-primary-600 py-3.5 px-10 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (tab === 'login' ? '登录中...' : '注册中...')
                    : (tab === 'login' ? '登录' : '注册')}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Hint */}
          {tab === 'login' && (
            <p className="mt-6 text-center text-sm text-text-muted">
              默认账号: admin / admin123
            </p>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
