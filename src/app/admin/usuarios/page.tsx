'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { UserPlus, Trash2, Pencil, ShieldCheck, User, Check, X } from 'lucide-react';
import { clsx } from 'clsx';
import Sidebar from '@/components/ui/Sidebar';
import type { PublicUser, Role } from '@/lib/users';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface FormState { displayName: string; username: string; password: string; role: Role }
const EMPTY: FormState = { displayName: '', username: '', password: '', role: 'user' };

export default function AdminUsuariosPage() {
  const { data: me } = useSWR<{ username: string; role: string }>('/api/auth/me', fetcher);
  const { data: users, mutate } = useSWR<PublicUser[]>('/api/admin/users', fetcher);

  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormState & { active: boolean }>>({});
  const [saving, setSaving]     = useState(false);

  if (me && me.role !== 'admin') {
    return (
      <div className="flex h-screen bg-[#0f1117] items-center justify-center">
        <p className="text-red-400 text-sm">Acesso restrito a administradores.</p>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success('Usuário criado com sucesso');
      setCreating(false);
      setForm(EMPTY);
      mutate();
    } else {
      const { error } = await res.json();
      toast.error(error ?? 'Erro ao criar usuário');
    }
    setSaving(false);
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      toast.success('Usuário atualizado');
      setEditId(null);
      mutate();
    } else {
      const { error } = await res.json();
      toast.error(error ?? 'Erro ao atualizar');
    }
    setSaving(false);
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Remover usuário "${username}"?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Usuário removido');
      mutate();
    } else {
      const { error } = await res.json();
      toast.error(error ?? 'Erro ao remover');
    }
  }

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-16 overflow-y-auto px-6 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Usuários</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie acessos ao painel</p>
          </div>
          <button
            onClick={() => { setCreating(true); setEditId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-xl transition-colors"
          >
            <UserPlus size={15} /> Novo usuário
          </button>
        </div>

        {/* Formulário de criação */}
        {creating && (
          <form onSubmit={handleCreate} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Novo usuário</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Username" value={form.username}     onChange={v => setForm(f => ({ ...f, username: v }))}    placeholder="ex: joao.silva" />
              <Input label="Nome"     value={form.displayName}  onChange={v => setForm(f => ({ ...f, displayName: v }))} placeholder="ex: João Silva" />
              <Input label="Senha"    value={form.password}     onChange={v => setForm(f => ({ ...f, password: v }))}    placeholder="••••••••" type="password" />
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Perfil</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full px-3 py-2 bg-[#12141c] border border-[#2a2d3e] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-green-600"
                >
                  <option value="user">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setCreating(false); setForm(EMPTY); }}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-1.5 text-sm bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Criando…' : 'Criar'}
              </button>
            </div>
          </form>
        )}

        {/* Tabela de usuários */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d3e] text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Usuário</th>
                <th className="text-left px-5 py-3">Perfil</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Criado em</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map(u => (
                <tr key={u.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#1f2235] transition-colors">
                  {editId === u.id ? (
                    // Linha de edição inline
                    <td colSpan={4} className="px-5 py-3">
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <Input label="Nome" value={editForm.displayName ?? u.displayName}
                          onChange={v => setEditForm(f => ({ ...f, displayName: v }))} />
                        <Input label="Nova senha (opcional)" value={editForm.password ?? ''}
                          onChange={v => setEditForm(f => ({ ...f, password: v }))} type="password" placeholder="deixe vazio para manter" />
                        <div>
                          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Perfil</label>
                          <select value={editForm.role ?? u.role}
                            onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                            className="w-full px-3 py-2 bg-[#12141c] border border-[#2a2d3e] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-green-600">
                            <option value="user">Operador</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#2a2d3e] flex items-center justify-center text-xs font-bold text-gray-300 uppercase">
                            {u.displayName[0]}
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.displayName}</p>
                            <p className="text-gray-500 text-xs">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
                          u.role === 'admin' ? 'bg-purple-900/30 text-purple-300' : 'bg-blue-900/30 text-blue-300'
                        )}>
                          {u.role === 'admin' ? <ShieldCheck size={11} /> : <User size={11} />}
                          {u.role === 'admin' ? 'Admin' : 'Operador'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx(
                          'text-xs px-2 py-1 rounded-full',
                          u.active ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'
                        )}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </>
                  )}

                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {editId === u.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(u.id)} disabled={saving}
                            className="p-1.5 text-green-400 hover:text-green-300 transition-colors">
                            <Check size={15} />
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors">
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(u.id); setEditForm({}); setCreating(false); }}
                            className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          {u.username !== 'admin' && (
                            <button onClick={() => handleDelete(u.id, u.username)}
                              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Remover">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-[#12141c] border border-[#2a2d3e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-green-600 placeholder-gray-700"
      />
    </div>
  );
}
