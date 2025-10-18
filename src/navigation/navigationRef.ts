import { createNavigationContainerRef } from '@react-navigation/native';

// We keep it untyped for simplicity across JS/TS boundaries
export const navigationRef = createNavigationContainerRef<any>();

export async function waitForNavigationReady(timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  return new Promise(resolve => {
    const tick = () => {
      if (navigationRef.isReady()) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 150);
    };
    tick();
  });
}
