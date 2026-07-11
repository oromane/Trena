'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Rafraîchit la page tant que la synchro Garmin tourne en tâche de fond.
 * Rendu invisible : appelle router.refresh() toutes les 3 s pendant que le
 * dernier sync_run est au statut 'running', puis s'arrête dès qu'il bascule
 * en success / partial / error.
 */
export default function SyncStatusPoller({ status }: { status?: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [status, router]);

  return null;
}
