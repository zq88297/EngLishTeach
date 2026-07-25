import * as Phaser from "phaser";

import { InvestigationScene } from "./InvestigationScene";
import type { GameTheme } from "./events";

export function createInvestigationGame(
  parent: HTMLElement,
  theme: GameTheme,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#111918",
    transparent: false,
    pixelArt: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [new InvestigationScene(theme)],
    render: {
      powerPreference: "high-performance",
      roundPixels: true,
    },
  });
}

