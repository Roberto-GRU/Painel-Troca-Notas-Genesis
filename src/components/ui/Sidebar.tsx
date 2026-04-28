'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Kanban, FileText, Settings, Users, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kanban',    label: 'Kanban OS',  icon: Kanban },
  { href: '/relatorios',label: 'Relatórios', icon: FileText },
  { href: '/configuracoes', label: 'Config', icon: Settings },
];

export default function Sidebar() {
  const path   = usePathname();
  const router = useRouter();
  const { data: me } = useSWR<{ username: string; role: string }>('/api/auth/me', fetcher);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const initial = (me?.username ?? 'U')[0].toUpperCase();

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

        {/* Link de admin — só visível para admins */}
        {me?.role === 'admin' && (
          <Link
            href="/admin/usuarios"
            title="Gerenciar usuários"
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              path.startsWith('/admin')
                ? 'bg-purple-600 text-white'
                : 'text-gray-500 hover:bg-[#1f2235] hover:text-gray-200'
            )}
          >
            <Users size={18} />
          </Link>
        )}
      </nav>

      {/* Avatar do usuário logado + logout */}
      <div className="flex flex-col items-center gap-2">
        <div
          title={me?.username ?? ''}
          className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center text-xs font-bold text-green-200 cursor-default select-none"
        >
          {initial}
        </div>
        <button
          onClick={handleLogout}
          title="Sair"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
