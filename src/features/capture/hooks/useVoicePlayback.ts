import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';

import { captureFile } from '@/shared/storage/captureFiles';
import type { CaptureItem } from '@/shared/types/capture';

/** One shared player for the list, so starting a voice note stops the previous one. */
export function useVoicePlayback() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [activeId, setActiveId] = useState<string | null>(null);

  const togglePlayback = async (item: CaptureItem) => {
    if (item.id !== activeId) {
      player.replace({ uri: captureFile(item.fileName).uri });
      setActiveId(item.id);
      player.play();
      return;
    }

    if (status.playing) {
      player.pause();
      return;
    }

    const finished = status.duration > 0 && status.currentTime >= status.duration;
    if (finished) await player.seekTo(0);
    player.play();
  };

  return { playingId: status.playing ? activeId : null, togglePlayback };
}
