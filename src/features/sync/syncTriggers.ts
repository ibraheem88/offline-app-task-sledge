import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import type { SyncEngine } from './SyncEngine';

// isInternetReachable is null while NetInfo is still checking; only treat an explicit `false` as offline.
function isOnline(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/** Drains the queue when the connection returns and when the app comes back to the foreground. */
export function connectSyncTriggers(engine: SyncEngine): () => void {
  const unsubscribeNetInfo = NetInfo.addEventListener((state) => engine.setOnline(isOnline(state)));

  const appStateSubscription = AppState.addEventListener('change', (status) => {
    if (status === 'active') void engine.sync();
  });

  return () => {
    unsubscribeNetInfo();
    appStateSubscription.remove();
  };
}
