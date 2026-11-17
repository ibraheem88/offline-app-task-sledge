import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CapturesScreen } from '@/features/capture/screens/CapturesScreen';
import { RecordVoiceScreen } from '@/features/capture/screens/RecordVoiceScreen';

export type RootStackParamList = {
  Captures: undefined;
  RecordVoice: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Captures" component={CapturesScreen} options={{ title: 'Field Capture' }} />
      <Stack.Screen
        name="RecordVoice"
        component={RecordVoiceScreen}
        options={{ title: 'Voice note', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
