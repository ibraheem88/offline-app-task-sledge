import { useEffect, useState } from 'react';

import { captureRepository } from '@/app/services';
import type { CaptureItem } from '@/shared/types/capture';

/** Live list of captures, newest first. Re-reads the repository after every write. */
export function useCaptures(): CaptureItem[] {
  const [items, setItems] = useState<CaptureItem[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      captureRepository.list().then((next) => {
        if (active) setItems(next);
      });
    };

    load();
    const unsubscribe = captureRepository.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return items;
}
