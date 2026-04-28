import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Painel Troca Notas — Genesis',
  description: 'Painel de controle de Ordens de Serviço e Troca de Notas — Empresa Genesis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1d27', color: '#e2e8f0', border: '1px solid #2a2d3e' },
          }}
        />
      </body>
    </html>
  );
}
