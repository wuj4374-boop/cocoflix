import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录 - CocoFlix',
  description: '登录到 CocoFlix 私人流媒体影院',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
