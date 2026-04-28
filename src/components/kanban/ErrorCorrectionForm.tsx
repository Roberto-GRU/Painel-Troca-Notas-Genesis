'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { Send, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { OrdemServico, TipoErro } from '@/types';
import FileDropzone from '@/components/ui/FileDropzone';
import toast from 'react-hot-toast';

interface Props {
  os: OrdemServico;
  tipoErro: TipoErro | null;
  compact?: boolean;
}

export default function ErrorCorrectionForm({ os, tipoErro, compact }: Props) {
  const { mutate } = useSWRConfig();
  const [valor, setValor] = useState('');
  const [uploadedPath, setUploadedPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!tipoErro) {
    return (
      <div className="text-xs text-gray-500 italic">
        Erro sem tipo mapeado — contate o suporte.
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!valor && !uploadedPath) {
      toast.error('Preencha o campo de correção antes de enviar.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/kanban/${os.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campo: tipoErro.campo_correcao, valor }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Erro ao salvar');
      }

      const data = await res.json();
      if (data.offline) {
        toast('Modo offline — correção simulada, status não alterado no banco.', { icon: '⚠️' });
      } else {
        toast.success('Correção salva — OS voltou para Processando.');
      }

      setDone(true);

      // Invalida todas as queries de kanban para o card sumir de Erros
      mutate((key) => typeof key === 'string' && key.startsWith('/api/kanban'), undefined, { revalidate: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar correção.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-1.5 text-green-400 text-xs">
        <CheckCircle size={13} />
        Correção enviada — aguardando reprocessamento
      </div>
    );
  }

  return (
    <div className={clsx('space-y-2', !compact && 'p-4')}>
      {tipoErro.tipo_campo === 'file' ? (
        <FileDropzone
          osId={os.id}
          tipo={tipoErro.campo_correcao}
          label={tipoErro.label_campo}
          onUploaded={(path, nome) => { setUploadedPath(path); setValor(nome); }}
        />
      ) : (
        <div>
          {!compact && (
            <label className="block text-xs text-gray-300 font-medium mb-1">
              {tipoErro.label_campo}
            </label>
          )}
          <input
            type={tipoErro.tipo_campo === 'number' ? 'number' : 'text'}
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder={compact ? tipoErro.label_campo : ''}
            className={clsx(
              'w-full bg-[#12141c] border border-[#2a2d3e] rounded-lg text-white',
              'placeholder-gray-600 focus:outline-none focus:border-green-600 transition-colors',
              compact ? 'text-xs px-2 py-1.5' : 'text-sm px-3 py-2'
            )}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving || (!valor && !uploadedPath)}
        className={clsx(
          'flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50',
          compact ? 'text-xs px-2.5 py-1.5 bg-green-700 hover:bg-green-600 text-white w-full justify-center'
                  : 'text-sm px-4 py-2 bg-green-600 hover:bg-green-500 text-white'
        )}
      >
        <Send size={compact ? 12 : 15} />
        {saving ? 'Enviando...' : 'Enviar correção'}
      </button>
    </div>
  );
}
