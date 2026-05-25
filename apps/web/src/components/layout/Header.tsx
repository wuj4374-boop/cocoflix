'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Menu, X, User, Heart, Clock, LogOut, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { SearchSuggestions } from '@/components/search';
import { useAuthStore } from '@/stores/authStore';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/favorites', label: '收藏' },
  { href: '/history', label: '历史' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [searchQuery, router]);

  const handleSuggestSelect = useCallback((item: { text: string; id?: string }) => {
    if (item.id) {
      router.push(`/detail/${item.id}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(item.text)}`);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [router]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, []);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  }, [logout, router]);

  // Global "/" shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          openSearch();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close search on outside click
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isSearchOpen, closeSearch]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'glass border-b border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-gradient-to-b from-[#050505]/80 to-transparent',
      )}
    >
      <div className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl md:text-3xl font-bold text-gradient transition-all duration-300 hover:drop-shadow-[0_0_12px_rgba(229,9,20,0.4)]">
            CocoFlix
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative py-1 transition-colors duration-200',
                  isActive
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search */}
          <div ref={searchContainerRef} className="relative">
            <AnimatePresence>
              {isSearchOpen ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, width: 40 }}
                  animate={{ opacity: 1, scale: 1, width: 'auto' }}
                  exit={{ opacity: 0, scale: 0.95, width: 40 }}
                  transition={{ duration: 0.2 }}
                  className="glass rounded-xl p-1.5 flex items-center absolute right-0 top-1/2 -translate-y-1/2 md:relative md:top-auto md:translate-y-0"
                >
                  <Search size={16} className="text-white/40 ml-2 flex-shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="搜索影片..."
                    className="bg-transparent w-[200px] md:w-48 text-white text-sm placeholder:text-white/30 outline-none px-2 py-1.5"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchSubmit();
                      if (e.key === 'Escape') closeSearch();
                    }}
                  />
                  <button
                    onClick={closeSearch}
                    className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ) : (
                <button
                  onClick={openSearch}
                  className="p-2 text-text-secondary hover:text-primary transition-colors"
                  title="搜索 (/)"
                >
                  <Search size={20} />
                </button>
              )}
            </AnimatePresence>

            {/* 搜索联想下拉 */}
            <SearchSuggestions
              query={searchQuery}
              onSelect={handleSuggestSelect}
              visible={isSearchOpen}
              className="w-72 right-0"
            />
          </div>

          {/* Notification */}
          <button className="p-2 text-text-secondary hover:text-primary transition-colors hidden md:block">
            <Bell size={20} />
          </button>

          {/* User area */}
          {isAuthenticated && user ? (
            <div ref={userMenuRef} className="relative hidden md:block">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary">{user.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-white/50 transition-transform duration-200',
                    isUserMenuOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 glass rounded-xl border border-white/[0.08] shadow-xl shadow-black/40 overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-sm font-medium text-white truncate">{user.username}</p>
                      {user.email && (
                        <p className="text-xs text-white/40 truncate mt-0.5">{user.email}</p>
                      )}
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      {[
                        { icon: User, label: '个人中心', href: '/profile' },
                        { icon: Heart, label: '我的收藏', href: '/favorites' },
                        { icon: Clock, label: '观看历史', href: '/history' },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          <item.icon size={16} />
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-white/[0.06] py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.06] transition-colors w-full"
                      >
                        <LogOut size={16} />
                        退出登录
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary/80 hover:bg-primary rounded-lg transition-colors"
            >
              登录
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-text-secondary hover:text-primary transition-colors md:hidden"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden glass border-t border-white/[0.06]"
          >
            <nav className="container py-4 flex flex-col gap-1">
              {/* Mobile search */}
              <div className="mb-2">
                <div className="flex items-center gap-2 bg-white/[0.06] rounded-lg px-3 py-2.5">
                  <Search size={16} className="text-white/40 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="搜索影片..."
                    className="bg-transparent flex-1 text-white text-sm placeholder:text-white/30 outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchSubmit();
                        setIsMobileMenuOpen(false);
                      }
                    }}
                  />
                </div>
              </div>

              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'py-2.5 px-3 rounded-lg transition-colors',
                      isActive
                        ? 'text-text-primary bg-white/[0.06]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* Mobile auth */}
              <div className="border-t border-white/[0.06] mt-2 pt-2">
                {isAuthenticated && user ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors"
                    >
                      <User size={16} />
                      个人中心
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors"
                    >
                      <Clock size={16} />
                      观看历史
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-white/[0.03] transition-colors w-full"
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2.5 px-3 rounded-lg bg-primary text-white font-medium transition-colors"
                  >
                    登录
                  </Link>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
