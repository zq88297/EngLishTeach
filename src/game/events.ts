export type GameTheme = "court" | "city";
export type NavigationTarget = "npc" | "evidence" | "exit";
export type MoveDirection = "up" | "down" | "left" | "right";

type GameEventMap = {
  move: { direction: MoveDirection; active: boolean };
  navigate: { target: NavigationTarget };
  investigate: undefined;
  proximity: { target: NavigationTarget | null };
};

const eventTarget = new EventTarget();

export function emitGameEvent<K extends keyof GameEventMap>(
  name: K,
  detail: GameEventMap[K],
): void {
  eventTarget.dispatchEvent(new CustomEvent(name, { detail }));
}

export function onGameEvent<K extends keyof GameEventMap>(
  name: K,
  listener: (detail: GameEventMap[K]) => void,
): () => void {
  const handler = (event: Event) => {
    listener((event as CustomEvent<GameEventMap[K]>).detail);
  };

  eventTarget.addEventListener(name, handler);
  return () => eventTarget.removeEventListener(name, handler);
}

