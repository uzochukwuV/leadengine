'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: '📧' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: '📇' },
  { href: '/dashboard/billing', label: 'Billing', icon: '💳' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, tenant, logout } = useAuth();

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold">OpenCommerceLens</h1>
        <p className="text-sm text-gray-400">{tenant?.name || 'Loading...'}</p>
      </div>
      
      <nav className="flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="border-t border-gray-700 pt-4 mt-4">
        <div className="px-4 py-2 text-sm">
          <p className="text-gray-400">Signed in as</p>
          <p className="font-medium truncate">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-700 rounded">
            {tenant?.plan || 'free'} plan
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full mt-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg text-left"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
