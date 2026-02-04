import React from 'react';
import { LogOut, Power } from 'lucide-react';
import { UserSession } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserSession | null;
  onLogout: () => void;
  onCheckout?: () => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onCheckout, title }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold leading-tight">{title}</h1>
            {user && (
              <p className="text-xs text-brand-100">
                {user.branch} - Ca {user.shift}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user && user.role !== 'admin' && onCheckout && (
              <button 
                onClick={onCheckout}
                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                title="Kết thúc ca làm việc"
              >
                <LogOut size={14} />
                Check-out
              </button>
            )}
            
            {user && (
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-brand-700 rounded-full transition-colors text-brand-200 hover:text-white"
                title="Đăng xuất (Thoát tài khoản)"
              >
                <Power size={20} />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto p-4">
        {children}
      </main>
      <footer className="bg-brand-700 text-brand-100 py-6 mt-4">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm font-medium">© 2026 Baby Boss JSC., All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;