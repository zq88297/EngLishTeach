"use client";

import { useEffect, useRef } from "react";

import { onGameEvent, type GameTheme, type NavigationTarget } from "@/game/events";

type PhaserWorldProps = {
  theme: GameTheme;
  onProximityChange: (target: NavigationTarget | null) => void;
};

export function PhaserWorld({
  theme,
  onProximityChange,
}: PhaserWorldProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;

    if (!parent) {
      return;
    }

    let cancelled = false;
    let destroyGame: (() => void) | undefined;

    parent.dataset.loadState = "loading";
    void import("@/game/createGame")
      .then(({ createInvestigationGame }) => {
        if (cancelled) {
          return;
        }

        const game = createInvestigationGame(parent, theme);
        destroyGame = () => game.destroy(true);
        parent.dataset.loadState = "ready";
      })
      .catch(() => {
        parent.dataset.loadState = "failed";
      });

    const unsubscribe = onGameEvent(
      "proximity",
      ({ target }) => onProximityChange(target),
    );

    return () => {
      cancelled = true;
      unsubscribe();
      destroyGame?.();
      parent.replaceChildren();
    };
  }, [onProximityChange, theme]);

  return (
    <div
      ref={parentRef}
      className="phaser-world"
      aria-hidden="true"
      data-testid="phaser-world"
    />
  );
}

