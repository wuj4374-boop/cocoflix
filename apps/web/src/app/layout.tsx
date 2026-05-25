import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import '@/styles/globals.css';
import { PageTransition } from '@/components/layout/PageTransition';

export const metadata: Metadata = {
  title: 'CocoFlix - 私人流媒体影院',
  description: '私人高画质流媒体影院系统，支持 4K/HDR/HEVC 高画质播放',
  keywords: ['流媒体', '影院', '4K', 'HDR', '视频播放'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-[#050505] text-text-primary" style={{ scrollPaddingTop: '80px' }}>
        <PageTransition>{children}</PageTransition>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
