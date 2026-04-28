'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileCheck, X } from 'lucide-react';
import { clsx } from 'clsx';

interface FileDropzoneProps {
  osId: string | number;
  tipo: string;
  onUploaded: (path: string, nome: string) => void;
  label?: string;
}

export default function FileDropzone({ osId, tipo, onUploaded, label }: FileDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const f = accepted[0];
      if (!f) return;
      setFile(f);
      setError('');
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('os_id', String(osId));
        fd.append('tipo', tipo);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? 'Erro no upload');
        onUploaded(json.path, json.nome);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erro no upload');
        setFile(null);
      } finally {
        setUploading(false);
      }
    },
    [osId, tipo, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': [], 'text/xml': [], 'application/xml': [], 'image/*': [] },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-gray-300 font-medium">{label}</p>}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-gray-400 bg-[#12141c]',
          file && 'border-green-600 bg-green-900/10'
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <FileCheck size={20} />
            <span className="text-sm">{file.name}</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null); }}
              className="text-gray-400 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        ) : uploading ? (
          <div className="text-gray-400 text-sm animate-pulse">Enviando...</div>
        ) : (
          <div className="space-y-1">
            <UploadCloud size={28} className="mx-auto text-gray-500" />
            <p className="text-sm text-gray-400">
              {isDragActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para enviar'}
            </p>
            <p className="text-xs text-gray-600">PDF, XML, JPG, PNG — máx. 10MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
