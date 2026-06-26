import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import type { BonusContext, LearningPrompt } from '../data/curriculum';
import { PROFILES, type ProfileId } from '../data/profiles';
import { LearningBonusSystem } from '../systems/LearningBonusSystem';
import { SaveSystem } from '../systems/SaveSystem';

type SceneInitData = {
  profileId?: ProfileId;
};

type HeldDirections = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

type InteractionTarget = {
  kind: BonusContext;
  x: number;
  y: number;
  label: string;
};

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E', Phaser.Input.Keyboard.Key>;
  private held: HeldDirections = { up: false, down: false, left: false, right: false };
  private targets: InteractionTarget[] = [];
  private profileId: ProfileId = 'grade5-adventurer';
  private learning!: LearningBonusSystem;
  private gold = 0;
  private busy = false;
  private hudText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super('WorldScene');
  }

  init(data: SceneInitData): void {
    this.profileId = data.profileId ?? 'grade5-adventurer';
    this.learning = new LearningBonusSystem(this.profileId);
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    const map = this.make.tilemap({ key: 'farm' });
    const tileset = map.addTilesetImage('eldoria-placeholder', 'tiles');

    if (!tileset) {
      throw new Error('Missing tileset: eldoria-placeholder');
    }

    map.createLayer('Ground', tileset, 0, 0);
    map.createLayer('Decor', tileset, 0, 0);

    const collisionLayer = map.createLayer('Collision', tileset, 0, 0);
    if (collisionLayer) {
      collisionLayer.setCollision([3, 4, 6]);
      collisionLayer.setVisible(false);
    }

    const objectLayer = map.getObjectLayer('Objects');
    const spawn = objectLayer?.objects.find((obj) => obj.name === 'PlayerSpawn');

    this.player = this.physics.add.sprite(spawn?.x ?? 160, spawn?.y ?? 160, 'adventurer', 0);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(18, 18).setOffset(7, 12);

    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    this.targets = this.makeTargets(objectLayer?.objects ?? []);
    this.drawTargetMarkers();

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,E') as Record<
      'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E',
      Phaser.Input.Keyboard.Key
    >;

    const saved = SaveSystem.load(this.profileId);
    if (saved) {
      this.gold = saved.gold;
      this.player.setPosition(saved.player.x, saved.player.y);
    }

    this.createHud();
    this.createTouchControls();
  }

  update(): void {
    if (this.busy) {
      this.player.setVelocity(0, 0);
      return;
    }

    const speed = 125;
    const left = this.cursors.left.isDown || this.keys.A.isDown || this.held.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || this.held.right;
    const up = this.cursors.up.isDown || this.keys.W.isDown || this.held.up;
    const down = this.cursors.down.isDown || this.keys.S.isDown || this.held.down;

    const vx = (right ? speed : 0) - (left ? speed : 0);
    const vy = (down ? speed : 0) - (up ? speed : 0);
    this.player.setVelocity(vx, vy);
    this.player.body?.velocity.normalize().scale(vx || vy ? speed : 0);

    if (vx !== 0 || vy !== 0) {
      this.player.setFrame(vx < 0 ? 2 : vx > 0 ? 3 : vy < 0 ? 1 : 0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.tryInteract();
    }

    this.updateHint();
  }

  private makeTargets(objects: Phaser.Types.Tilemaps.TiledObject[]): InteractionTarget[] {
    return objects
      .filter((obj) => obj.type === 'npc' || obj.type === 'bonus' || obj.type === 'enemy')
      .map((obj) => ({
        kind: obj.type === 'enemy' ? 'combat' : obj.type === 'bonus' ? 'farm' : 'quest',
        x: obj.x ?? 0,
        y: obj.y ?? 0,
        label: obj.name || obj.type || 'Target'
      }));
  }

  private drawTargetMarkers(): void {
    for (const target of this.targets) {
      const color = target.kind === 'combat' ? 0xaa3344 : target.kind === 'farm' ? 0x55aa33 : 0x4488cc;
      this.add.circle(target.x, target.y - 12, 6, color).setStrokeStyle(2, 0x1a1208);
      this.add.text(target.x, target.y - 30, target.label, {
        fontFamily: 'system-ui',
        fontSize: '9px',
        color: '#ffffff',
        stroke: '#1a1208',
        strokeThickness: 3
      }).setOrigin(0.5);
    }
  }

  private createHud(): void {
    this.add.rectangle(GAME_WIDTH / 2, 14, GAME_WIDTH - 20, 24, 0x2a1a08, 0.9)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x6f5126);

    this.hudText = this.add.text(16, 7, '', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#ffd666'
    }).setScrollFactor(0);

    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#f5e6c8',
      backgroundColor: '#2a1a08',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0);

    this.refreshHud();
  }

  private refreshHud(): void {
    const profile = PROFILES[this.profileId];
    this.hudText.setText(`${profile.label}  |  Gold: ${this.gold}`);
  }

  private updateHint(): void {
    const target = this.nearestTarget();
    this.hintText.setText(target ? `Action: ${target.label} bonus` : 'Explore. Learning bonuses are optional.');
  }

  private createTouchControls(): void {
    const makeButton = (x: number, y: number, label: string, onDown: () => void, onUp: () => void): void => {
      const bg = this.add.rectangle(x, y, 36, 36, 0x5f3d12, 0.76)
        .setStrokeStyle(2, 0xffd666)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      this.add.text(x, y, label, {
        fontFamily: 'system-ui',
        fontSize: '18px',
        color: '#ffd666'
      }).setOrigin(0.5).setScrollFactor(0);

      bg.on('pointerdown', onDown);
      bg.on('pointerup', onUp);
      bg.on('pointerout', onUp);
    };

    const reset = (): void => {
      this.held = { up: false, down: false, left: false, right: false };
    };

    makeButton(64, GAME_HEIGHT - 86, '▲', () => { this.held.up = true; }, reset);
    makeButton(64, GAME_HEIGHT - 42, '▼', () => { this.held.down = true; }, reset);
    makeButton(22, GAME_HEIGHT - 42, '◀', () => { this.held.left = true; }, reset);
    makeButton(106, GAME_HEIGHT - 42, '▶', () => { this.held.right = true; }, reset);

    const action = this.add.circle(GAME_WIDTH - 54, GAME_HEIGHT - 52, 34, 0x5f3d12, 0.82)
      .setStrokeStyle(3, 0xffd666)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.add.text(GAME_WIDTH - 54, GAME_HEIGHT - 52, 'ACTION', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#ffd666'
    }).setOrigin(0.5).setScrollFactor(0);

    action.on('pointerdown', () => this.tryInteract());
  }

  private nearestTarget(): InteractionTarget | null {
    const px = this.player.x;
    const py = this.player.y;

    let best: InteractionTarget | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      const d = Phaser.Math.Distance.Between(px, py, target.x, target.y);
      if (d < 42 && d < bestDistance) {
        best = target;
        bestDistance = d;
      }
    }

    return best;
  }

  private tryInteract(): void {
    if (this.busy) return;

    const target = this.nearestTarget();
    if (!target) {
      this.showToast('Nothing to use here yet.');
      return;
    }

    this.openBonusPrompt(target.kind, target.label);
  }

  private openBonusPrompt(context: BonusContext, label: string): void {
    this.busy = true;
    this.player.setVelocity(0, 0);

    const prompt = this.learning.makePrompt(context);
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, 360, 170, 0x2a1a08, 0.96)
      .setStrokeStyle(3, 0xffd666);
    panel.add(bg);

    panel.add(this.add.text(0, -62, `${label}: optional learning bonus`, {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#ffd666'
    }).setOrigin(0.5));

    panel.add(this.add.text(0, -34, prompt.text, {
      fontFamily: 'system-ui',
      fontSize: '22px',
      color: '#ffffff'
    }).setOrigin(0.5));

    prompt.choices.forEach((choice, index) => {
      const x = -100 + index * 100;
      const btn = this.add.rectangle(x, 22, 72, 42, 0x5f3d12)
        .setStrokeStyle(2, 0xffd666)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(x, 22, String(choice), {
        fontFamily: 'system-ui',
        fontSize: '18px',
        color: '#ffffff'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        const result = this.learning.resolve(prompt, choice);
        panel.destroy();

        if (result.correct) {
          this.applyReward(prompt);
        }

        this.showToast(result.message);
        this.busy = false;
        this.save();
      });

      panel.add(btn);
      panel.add(txt);
    });

    const skip = this.add.text(0, 72, 'Skip bonus', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#c9a66b'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skip.on('pointerdown', () => {
      panel.destroy();
      this.showToast('Skipped. Adventure continues.');
      this.busy = false;
    });

    panel.add(skip);
  }

  private applyReward(prompt: LearningPrompt): void {
    if (prompt.rewardKind === 'bonus-gold') this.gold += 5;
    if (prompt.rewardKind === 'bonus-harvest') this.gold += 3;
    if (prompt.rewardKind === 'critical-hit') this.gold += 2;
    if (prompt.rewardKind === 'bonus-xp') this.gold += 1;

    this.refreshHud();
  }

  private showToast(message: string): void {
    const toast = this.add.text(GAME_WIDTH / 2, 48, message, {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: '#3a2208',
      padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setScrollFactor(0);

    this.tweens.add({
      targets: toast,
      y: 36,
      alpha: 0,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onComplete: () => toast.destroy()
    });
  }

  private save(): void {
    SaveSystem.save({
      version: 1,
      profileId: this.profileId,
      gold: this.gold,
      lastArea: 'farm',
      player: {
        x: this.player.x,
        y: this.player.y
      }
    });
  }
}
