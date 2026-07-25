import * as Phaser from "phaser";

import {
  emitGameEvent,
  onGameEvent,
  type GameTheme,
  type MoveDirection,
  type NavigationTarget,
} from "./events";

type ThemePalette = {
  floor: number;
  floorAlt: number;
  wall: number;
  line: number;
  accent: number;
  warning: number;
  window: number;
};

const palettes: Record<GameTheme, ThemePalette> = {
  court: {
    floor: 0x34483d,
    floorAlt: 0x3c5145,
    wall: 0x0c1715,
    line: 0x789082,
    accent: 0xc7a35c,
    warning: 0xb84035,
    window: 0xa7c9bf,
  },
  city: {
    floor: 0x2b424b,
    floorAlt: 0x34515d,
    wall: 0x0c171b,
    line: 0x6f929f,
    accent: 0xe0a73f,
    warning: 0xce4037,
    window: 0x9dccdc,
  },
};

export class InvestigationScene extends Phaser.Scene {
  private readonly theme: GameTheme;
  private player!: Phaser.Physics.Arcade.Sprite;
  private npc!: Phaser.Physics.Arcade.Sprite;
  private evidence!: Phaser.Physics.Arcade.Sprite;
  private exit!: Phaser.GameObjects.Zone;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private commandDirections = new Set<MoveDirection>();
  private unsubscribe: Array<() => void> = [];
  private proximity: NavigationTarget | null = null;
  private targetPositions!: Record<
    NavigationTarget,
    { x: number; y: number }
  >;

  constructor(theme: GameTheme) {
    super("investigation");
    this.theme = theme;
  }

  create(): void {
    const palette = palettes[this.theme];
    const width = this.scale.width;
    const height = this.scale.height;
    const sidePadding = Phaser.Math.Clamp(width * 0.055, 48, 100);
    const topBoundary = width < 720 ? 160 : 88;
    const playableBottom = width < 720
      ? Math.max(topBoundary + 120, height * 0.46)
      : height - 100;

    this.targetPositions = {
      npc: {
        x: Phaser.Math.Clamp(width * 0.66, sidePadding + 90, width - sidePadding - 90),
        y: Phaser.Math.Clamp(height * 0.29, topBoundary + 55, playableBottom - 100),
      },
      evidence: {
        x: Phaser.Math.Clamp(width * 0.5, sidePadding + 70, width - sidePadding - 70),
        y: Phaser.Math.Clamp(height * 0.42, topBoundary + 105, playableBottom - 45),
      },
      exit: {
        x: Phaser.Math.Clamp(width * 0.82, sidePadding + 100, width - sidePadding - 50),
        y: Phaser.Math.Clamp(height * 0.34, topBoundary + 85, playableBottom - 70),
      },
    };

    const playerPosition = {
      x: Phaser.Math.Clamp(width * 0.31, sidePadding + 60, width - sidePadding - 60),
      y: this.targetPositions.evidence.y,
    };
    const entityScale = Phaser.Math.Clamp(
      Math.min(width / 1100, height / 650),
      0.9,
      1.35,
    );

    this.cameras.main.setBackgroundColor(palette.wall);
    this.createTextures(palette);
    this.drawRoom(palette, width, height);

    this.player = this.physics.add.sprite(playerPosition.x, playerPosition.y, "detective");
    this.player.setScale(entityScale);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);

    this.npc = this.physics.add.sprite(this.targetPositions.npc.x, this.targetPositions.npc.y, "npc");
    this.npc.setScale(entityScale);
    this.npc.setImmovable(true);
    this.npc.setDepth(4);

    this.evidence = this.physics.add.sprite(this.targetPositions.evidence.x, this.targetPositions.evidence.y, "evidence");
    this.evidence.setScale(entityScale);
    this.evidence.setImmovable(true);
    this.evidence.setDepth(4);

    this.exit = this.add.zone(this.targetPositions.exit.x, this.targetPositions.exit.y, 70, 100);
    this.physics.world.enable(this.exit, Phaser.Physics.Arcade.STATIC_BODY);

    this.physics.add.collider(this.player, this.npc);
    this.physics.add.collider(this.player, this.evidence);

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Phaser keyboard plugin is unavailable");
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D",
    }) as Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

    this.unsubscribe = [
      onGameEvent("move", ({ direction, active }) => {
        if (active) {
          this.commandDirections.add(direction);
        } else {
          this.commandDirections.delete(direction);
        }
      }),
      onGameEvent("navigate", ({ target }) => this.navigateTo(target)),
      onGameEvent("investigate", () => {
        emitGameEvent("proximity", { target: this.proximity });
      }),
    ];

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe.forEach((unsubscribe) => unsubscribe());
      this.unsubscribe = [];
    });
  }

  update(): void {
    if (!this.player) {
      return;
    }

    const velocity = new Phaser.Math.Vector2();
    const left = this.cursors.left?.isDown || this.wasd.left.isDown || this.commandDirections.has("left");
    const right = this.cursors.right?.isDown || this.wasd.right.isDown || this.commandDirections.has("right");
    const up = this.cursors.up?.isDown || this.wasd.up.isDown || this.commandDirections.has("up");
    const down = this.cursors.down?.isDown || this.wasd.down.isDown || this.commandDirections.has("down");

    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;

    velocity.normalize().scale(170);
    this.player.setVelocity(velocity.x, velocity.y);

    if (velocity.x !== 0) {
      this.player.setFlipX(velocity.x < 0);
    }

    const nearest = this.findNearestTarget();
    if (nearest !== this.proximity) {
      this.proximity = nearest;
      emitGameEvent("proximity", { target: nearest });
    }
  }

  private createTextures(palette: ThemePalette): void {
    const detective = this.make.graphics({ x: 0, y: 0 }, false);
    detective.fillStyle(0xe8ece7);
    detective.fillCircle(14, 10, 7);
    detective.fillStyle(0x17262a);
    detective.fillRoundedRect(6, 17, 16, 21, 3);
    detective.fillStyle(palette.accent);
    detective.fillRect(8, 23, 12, 3);
    detective.generateTexture("detective", 28, 40);
    detective.destroy();

    const npc = this.make.graphics({ x: 0, y: 0 }, false);
    npc.fillStyle(0xf2d8bd);
    npc.fillCircle(15, 10, 7);
    npc.fillStyle(this.theme === "court" ? 0x7b2f2b : 0x2e6275);
    npc.fillRoundedRect(6, 17, 18, 24, 3);
    npc.generateTexture("npc", 30, 43);
    npc.destroy();

    const evidence = this.make.graphics({ x: 0, y: 0 }, false);
    evidence.fillStyle(palette.accent, 0.2);
    evidence.fillCircle(19, 19, 18);
    evidence.lineStyle(2, palette.accent, 0.9);
    evidence.strokeCircle(19, 19, 12);
    evidence.fillStyle(palette.accent);
    evidence.fillRect(14, 14, 10, 10);
    evidence.generateTexture("evidence", 38, 38);
    evidence.destroy();
  }

  private drawRoom(
    palette: ThemePalette,
    width: number,
    height: number,
  ): void {
    this.physics.world.setBounds(
      82,
      80,
      Math.max(120, width - 164),
      Math.max(120, height - 130),
    );

    const graphics = this.add.graphics();
    graphics.fillStyle(palette.floor);
    graphics.fillRect(80, 78, Math.max(120, width - 160), Math.max(120, height - 128));

    for (let y = 90; y < height - 60; y += 48) {
      for (let x = 92; x < width - 92; x += 48) {
        const alternate = (x / 48 + y / 48) % 2 === 0;
        graphics.fillStyle(alternate ? palette.floorAlt : palette.floor, 0.75);
        graphics.fillRect(x, y, 44, 44);
      }
    }

    graphics.fillStyle(palette.wall);
    graphics.fillRect(60, 58, width - 120, 24);
    graphics.fillRect(60, height - 52, width - 120, 24);
    graphics.fillRect(60, 58, 24, height - 86);
    graphics.fillRect(width - 84, 58, 24, height - 86);

    graphics.fillStyle(palette.window, 0.75);
    const windowWidth = Phaser.Math.Clamp(width * 0.18, 100, 260);
    graphics.fillRect(width * 0.2, 60, windowWidth, 14);
    graphics.fillRect(width * 0.62, 60, windowWidth, 14);

    graphics.lineStyle(3, palette.line, 0.58);
    graphics.beginPath();
    graphics.moveTo(width * 0.31, this.targetPositions.evidence.y);
    graphics.lineTo(this.targetPositions.evidence.x, this.targetPositions.evidence.y);
    graphics.lineTo(this.targetPositions.npc.x, this.targetPositions.npc.y);
    graphics.lineTo(this.targetPositions.exit.x, this.targetPositions.exit.y);
    graphics.strokePath();

    const tableWidth = Phaser.Math.Clamp(width * 0.16, 150, 250);
    const tableX = this.targetPositions.evidence.x - tableWidth / 2;
    const tableY = this.targetPositions.evidence.y - 47;
    graphics.fillStyle(palette.wall, 0.9);
    graphics.fillRoundedRect(tableX, tableY, tableWidth, 94, 4);
    graphics.lineStyle(2, palette.line, 0.8);
    graphics.strokeRoundedRect(tableX, tableY, tableWidth, 94, 4);

    graphics.fillStyle(palette.warning);
    graphics.fillRect(
      this.targetPositions.exit.x + 31,
      this.targetPositions.exit.y - 42,
      12,
      84,
    );

    const title = this.add
      .text(
        width * 0.5,
        94,
        this.theme === "court" ? "ARCHIVE / 禁苑档案廊" : "PLATFORM 00 / 海港末站",
        {
          color: "#dbe5df",
          fontFamily: "monospace",
          fontSize: "13px",
        },
      )
      .setOrigin(0.5, 0)
      .setAlpha(0.86)
      .setDepth(2);

    const evidenceGlow = this.add.circle(
      this.targetPositions.evidence.x,
      this.targetPositions.evidence.y,
      28,
      palette.accent,
      0.08,
    );
    this.tweens.add({
      targets: evidenceGlow,
      alpha: { from: 0.05, to: 0.22 },
      scale: { from: 0.8, to: 1.25 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
    });

    title.setVisible(width >= 520);
  }

  private findNearestTarget(): NavigationTarget | null {
    const targets: Array<{
      target: NavigationTarget;
      point: Phaser.Math.Vector2;
    }> = [
      { target: "npc", point: this.npc.getCenter() },
      { target: "evidence", point: this.evidence.getCenter() },
      { target: "exit", point: new Phaser.Math.Vector2(this.targetPositions.exit.x, this.targetPositions.exit.y) },
    ];

    const nearest = targets
      .map((entry) => ({
        ...entry,
        distance: Phaser.Math.Distance.BetweenPoints(
          this.player.getCenter(),
          entry.point,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    return nearest && nearest.distance < 86 ? nearest.target : null;
  }

  private navigateTo(target: NavigationTarget): void {
    const position = this.targetPositions[target];
    const direction = position.x < this.scale.width / 2 ? 1 : -1;

    this.player.setPosition(
      position.x + direction * 56,
      position.y,
    );
  }
}

