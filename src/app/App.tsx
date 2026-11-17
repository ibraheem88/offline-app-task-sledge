import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSyncLifecycle } from '@/features/sync/useSyncLifecycle';

import { RootNavigator } from './navigation';
import { syncEngine } from './services';

export default function App() {
  useSyncLifecycle(syncEngine);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
