import { useEffect } from 'react';

import type { SyncEngine } from './SyncEngine';
import { connectSyncTriggers } from './syncTriggers';

/** Recovers interrupted uploads first, then starts listening for connectivity and foreground events. */
export function useSyncLifecycle(engine: SyncEngine): void {
  useEffect(() => {
    let disconnect: (() => void) | undefined;
    let cancelled = false;

    engine.start().then(() => {
      if (!cancelled) disconnect = connectSyncTriggers(engine);
    });

    return () => {
      cancelled = true;
      disconnect?.();
      engine.stop();
    };
  }, [engine]);
}
