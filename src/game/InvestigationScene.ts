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
    floor: 0x25312d,
    floorAlt: 0x2d3a34,
    wall: 0x101918,
    line: 0x52695f,
    accent: 0xc7a35c,
    warning: 0xb84035,
    window: 0x91b6ad,
  },
  city: {
    floor: 0x1f3138,
    floorAlt: 0x263c45,
    wall: 0x111a1e,
    line: 0x4e6a76,
    accent: 0xe0a73f,
    warning: 0xce4037,
    window: 0x86b9cc,
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

    this.targetPositions = {
      npc: { x: width * 0.66, y: height * 0.3 },
      evidence: { x: width * 0.5, y: height * 0.42 },
      exit: { x: Math.min(830, width - 45), y: height * 0.37 },
    };

    const playerPosition = { x: Math.max(110, width * 0.3), y: height * 0.42 };

    this.cameras.main.setBackgroundColor(palette.wall);
    this.createTextures(palette);
    this.drawRoom(palette);
    this.physics.world.setBounds(24, 48, width - 48, height - 72);

    this.player = this.physics.add.sprite(playerPosition.x, playerPosition.y, "detective");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);

    this.npc = this.physics.add.sprite(this.targetPositions.npc.x, this.targetPositions.npc.y, "npc");
    this.npc.setImmovable(true);
    this.npc.setDepth(4);

    this.evidence = this.physics.add.sprite(this.targetPositions.evidence.x, this.targetPositions.evidence.y, "evidence");
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

  private drawRoom(palette: ThemePalette): void {
    const width = 960;
    const height = 540;
    this.physics.world.setBounds(82, 80, width - 164, height - 130);

    const graphics = this.add.graphics();
    graphics.fillStyle(palette.floor);
    graphics.fillRect(80, 78, width - 160, height - 128);

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
    graphics.fillRect(190, 60, 180, 14);
    graphics.fillRect(590, 60, 180, 14);

    graphics.fillStyle(0x111918, 0.86);
    graphics.fillRoundedRect(430, 320, 190, 94, 4);
    graphics.lineStyle(2, palette.line, 0.8);
    graphics.strokeRoundedRect(430, 320, 190, 94, 4);

    graphics.fillStyle(palette.warning);
    graphics.fillRect(825, 365, 12, 74);

    const title = this.add
      .text(
        106,
        102,
        this.theme === "court" ? "ARCHIVE / 禁苑档案廊" : "PLATFORM 00 / 海港末站",
        {
          color: "#dbe5df",
          fontFamily: "monospace",
          fontSize: "13px",
        },
      )
      .setAlpha(0.72);

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

    title.setDepth(2);
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

