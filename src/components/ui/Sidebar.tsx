'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Kanban, FileText, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kanban', label: 'Kanban OS', icon: Kanban },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/configuracoes', label: 'Config', icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-4 gap-6 bg-[#12141c] border-r border-[#2a2d3e] z-40">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center font-bold text-white text-sm select-none">
        GN
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              path.startsWith(href)
                ? 'bg-green-600 text-white'
                : 'text-gray-500 hover:bg-[#1f2235] hover:text-gray-200'
            )}
          >
            <Icon size={18} />
          </Link>
        ))}
      </nav>

      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
        U
      </div>
    </aside>
  );
}
