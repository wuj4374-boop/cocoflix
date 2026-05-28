'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Edit3, Check, X, Heart, Clock, Film } from 'lucide-react';
import { toast } from 'sonner';

import { useFavorites, useHistory } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { GlassCard, Shimmer } from '@/components/ui';
import { staggerContainer, fadeInUp } from '@/lib/animations';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const { data: favorites } = useFavorites();
  const { data: history } = useHistory();

  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.bio !== undefined) {
      setBioValue(user.bio ?? '');
    }
  }, [user?.bio]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = (await apiClient.post('/user/avatar', formData)) as unknown as { avatarUrl?: string };
        const avatarUrl = res.avatarUrl;
        if (avatarUrl) {
          updateUser({ avatarUrl });
        }
      } catch {
        toast.error('头像上传失败');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [updateUser],
  );

  const handleSaveBio = useCallback(async () => {
    setSaving(true);
    try {
      await apiClient.put('/user/profile', { bio: bioValue });
      updateUser({ bio: bioValue });
      setEditingBio(false);
    } catch {
      toast.error('保存简介失败');
    } finally {
      setSaving(false);
    }
  }, [bioValue, updateUser]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <GlassCard variant="default" padding="lg" className="text-center max-w-sm">
          <p className="text-text-secondary mb-4">请先登录</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            去登录
          </button>
        </GlassCard>
      </div>
    );
  }

  const favoriteCount = favorites?.length ?? 0;
  const historyCount = history?.length ?? 0;
  const totalWatchTime = history?.reduce((sum, item) => sum + (item.duration || 0), 0) ?? 0;

  const formatWatchTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="container max-w-2xl"
      >
        {/* Avatar section */}
        <motion.div variants={fadeInUp} className="flex flex-col items-center mb-10">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-28 h-28 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center ring-4 ring-white/[0.06]">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-primary">
                  {user.username[0]?.toUpperCase()}
                </span>
              )}
            </div>
            {/* Upload overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={24} className="text-white" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">{user.username}</h1>
          {user.email && <p className="text-sm text-text-secondary mt-1">{user.email}</p>}
        </motion.div>

        {/* Bio section */}
        <motion.div variants={fadeInUp} className="mb-8">
          <GlassCard variant="default" padding="lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">个人简介</h2>
              {!editingBio ? (
                <button
                  onClick={() => setEditingBio(true)}
                  className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  <Edit3 size={16} />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingBio(false); setBioValue(user.bio ?? ''); }}
                    className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={handleSaveBio}
                    disabled={saving}
                    className="p-2 text-primary hover:text-white hover:bg-primary rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>
                </div>
              )}
            </div>
            {editingBio ? (
              <textarea
                value={bioValue}
                onChange={(e) => setBioValue(e.target.value)}
                placeholder="写点什么介绍自己..."
                maxLength={500}
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 resize-none transition-all"
              />
            ) : (
              <p className="text-white/60 text-sm leading-relaxed">
                {user.bio || '这个人很懒，什么都没写...'}
              </p>
            )}
          </GlassCard>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeInUp}>
          <h2 className="text-lg font-semibold text-white mb-4">数据统计</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Heart, label: '收藏', value: favoriteCount, color: 'text-red-400' },
              { icon: Film, label: '观看', value: historyCount, color: 'text-blue-400' },
              { icon: Clock, label: '总时长', value: formatWatchTime(totalWatchTime), color: 'text-emerald-400' },
            ].map((stat) => (
              <GlassCard key={stat.label} variant="default" padding="md" className="text-center">
                <stat.icon size={24} className={`${stat.color} mx-auto mb-2`} />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
