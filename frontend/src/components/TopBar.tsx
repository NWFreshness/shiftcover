'use client';

import { useRouter } from 'next/navigation';
import Brand from './Brand';
import { logout } from '@/lib/auth';

interface TopBarProps {
  children?: React.ReactNode;
}

export default function TopBar({ children }: TopBarProps) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Brand size={30} />
        <div className="flex items-center gap-2">
          {children}
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Sign out">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
