/**
 * Hook que notifica o operador quando o número de OS com erro aumenta.
 *
 * Comportamento:
 *   - Atualiza document.title com badge numérico: "(3) Torre de Controle"
 *   - Emite notificação do browser (se permissão concedida)
 *   - A primeira carga não notifica — só mudanças subsequentes
 *
 * A notificação do browser requer que o usuário conceda permissão
 * via prompt. O hook solicita permissão automaticamente na primeira vez
 * que há erros, sem bloquear a UI.
 */
import { useEffect, useRef } from 'react';

const BASE_TITLE = 'Torre de Controle';

export function useNewErrorNotification(errorCount: number) {
  const prevCount  = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      // Registra a contagem inicial sem notificar
      prevCount.current = errorCount;
      isFirstLoad.current = false;
      updateTitle(errorCount);
      return;
    }

    updateTitle(errorCount);

    const prev = prevCount.current ?? 0;
    if (errorCount > prev) {
      const novas = errorCount - prev;
      notify(`${novas} nova(s) OS com erro`, `Total de erros: ${errorCount}`);
    }

    prevCount.current = errorCount;
  }, [errorCount]);

  // Limpa o badge do título ao desmontar (ex: navegar para outra página)
  useEffect(() => {
    return () => { document.title = BASE_TITLE; };
  }, []);
}

function updateTitle(count: number) {
  document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
}

async function notify(title: string, body: string) {
  if (!('Notification' in window)) return;

  // Solicita permissão apenas se ainda não foi decidida
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return;

  const n = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag:  'painel-erro', // substitui notificação anterior ao invés de empilhar
  });

  // Fecha automaticamente após 6 segundos
  setTimeout(() => n.close(), 6000);
}
