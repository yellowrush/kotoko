type RandomPlaceListener = () => void;

const randomPlaceListeners = new Set<RandomPlaceListener>();

export function subscribeRandomPlaceRequest(listener: RandomPlaceListener): () => void {
  randomPlaceListeners.add(listener);
  return () => {
    randomPlaceListeners.delete(listener);
  };
}

export function requestRandomPlace(): void {
  for (const listener of [...randomPlaceListeners]) {
    listener();
  }
}

export function pickRandomItem<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T | null {
  if (items.length === 0) return null;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index] ?? null;
}
