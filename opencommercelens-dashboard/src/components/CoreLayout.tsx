'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Home' },
  { href: '/dashboard/leads', icon: '👥', label: 'Leads' },
  { href: '/dashboard/campaigns', icon: '📧', label: 'Campaigns' },
  { href: '/dashboard/contacts', icon: '📇', label: 'Contacts' },
  { href: '/dashboard/billing', icon: '💳', label: 'Billing' },
];

const integrations = [
  { name: 'Shopify', icon: '🛒' },
  { name: 'Stripe', icon: '💳' },
  { name: 'Slack', icon: '💬' },
  { name: 'Zapier', icon: '⚡' },
];

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, tenant, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);

  // Ctrl+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr' }}>
      {/* Collapsible Left Sidebar */}
      <aside 
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              OCL
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-gray-800">OpenCommerceLens</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-4 border-t border-gray-100 text-gray-400 hover:text-gray-600 flex justify-center"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Upgrade Trigger */}
            {tenant?.plan === 'free' && (
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-full hover:opacity-90">
                Upgrade to Pro
              </button>
            )}
            
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <span>🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{tenant?.plan || 'Free'}</p>
              </div>
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
              <button onClick={logout} className="text-gray-400 hover:text-gray-600 text-sm">
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Command Palette (Ctrl+K) */}
      {commandOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={() => setCommandOpen(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search or type a command..."
                className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-lg"
                autoFocus
              />
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Quick Actions</p>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setCommandOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal (First Visit) */}
      {showOnboarding && (
        <div className="fixed top-20 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-40">
          <button 
            onClick={() => setShowOnboarding(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          <h3 className="font-bold text-lg mb-2">Welcome to OpenCommerceLens</h3>
          <p className="text-sm text-gray-500 mb-4">Choose your workflow focus:</p>
          <div className="space-y-2">
            {['🏆 Sales & Outreach', '📊 Marketing', '🔍 Research'].map((role) => (
              <button
                key={role}
                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-blue-50 rounded-xl text-sm transition-colors"
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
