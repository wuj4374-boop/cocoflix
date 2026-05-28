import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e50914',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#e50914',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        background: {
          DEFAULT: '#050505',
          secondary: '#0f0f0f',
          tertiary: '#171717',
          elevated: '#1c1c1c',
          overlay: 'rgba(0,0,0,0.6)',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.05)',
          light: 'rgba(255,255,255,0.08)',
          medium: 'rgba(255,255,255,0.12)',
          heavy: 'rgba(255,255,255,0.18)',
          border: 'rgba(255,255,255,0.08)',
          'border-light': 'rgba(255,255,255,0.15)',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a3a3a3',
          tertiary: '#737373',
          muted: '#525252',
        },
        border: {
          DEFAULT: '#1e1e1e',
          light: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'sans-serif'],
      },
      fontSize: {
        hero: ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        'hero-sm': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        display: ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        subtitle: ['1.125rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      borderRadius: {
        card: '8px',
        button: '4px',
        modal: '12px',
      },
      backdropBlur: {
        glass: '12px',
        'glass-lg': '20px',
        'glass-xl': '40px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(229,9,20,0.2)',
        'glow-md': '0 0 20px rgba(229,9,20,0.3)',
        'glow-lg': '0 0 40px rgba(229,9,20,0.4)',
        'glow-xl': '0 0 80px rgba(229,9,20,0.3)',
        'glow-white': '0 0 20px rgba(255,255,255,0.1)',
        glass: '0 8px 32px rgba(0,0,0,0.4)',
        'glass-lg': '0 16px 64px rgba(0,0,0,0.5)',
        cinematic: '0 20px 80px rgba(0,0,0,0.6)',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backgroundSize: {
        '200%': '200% 200%',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-slow': 'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
        'slide-up-slow': 'slideUp 0.6s cubic-bezier(0.25,0.1,0.25,1)',
        'slide-down': 'slideDown 0.3s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite linear',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'gradient-shift': 'gradientShift 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(229,9,20,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(229,9,20,0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(229,9,20,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(229,9,20,0.5)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
