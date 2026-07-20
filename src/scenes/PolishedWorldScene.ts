import Phaser from 'phaser';
import WorldScene from './WorldScene';
import { GAME_HEIGHT, GAME_SCALE, GAME_WIDTH, sx, sy, sscale } from '../gameDimensions';
import { PracticeSlimeEncounterController } from '../presentation/PracticeSlimeEncounterController';
import { WildbloomDiscoveryController } from '../presentation/WildbloomDiscoveryController';
import type { InteractionTarget } from '../data/maps';
import type { InteractionId } from '../data/interactions';
import { drawMarkerGlyph } from '../presentation/markerGlyphs';

const WILDBLOOM_MAP_ID = 'wildbloom-woods';

// Same narrow structural view WorldScene exposes to the slime encounter
// controller (see the comment block on `presentationInternals` below).
type WorldScenePresentationInternals = {
  mapId: string;
  targets: InteractionTarget[];
  practiceSlimeSprite?: Phaser.GameObjects.Sprite;
  hintText?: Phaser.GameObjects.Text;
  wildbloomDiscoveryComplete: boolean;
  heroAction: (action: 'spell' | 'bow') => void;
  playSfx: (key: string, volume?: number) => void;
  showToast: (message: string, playSound?: boolean) => void;
  playSlimeReaction: (kind: 'hit' | 'defeat', onImpact?: () => void) => void;
  handlePracticeSlimeDefeat: () => void;
  openBonusPrompt: (
    context: 'farm' | 'wildbloom' | 'village' | 'combat',
    label: string,
    onResolved?: () => string | undefined
  ) => void;
  hintLabel: (target: InteractionTarget) => string;
  setWildbloomDiscoveryComplete: () => void;
  saveCheckpoint: () => void;
};

/**
 * PolishedWorldScene is the shipped visual layer. It extends the stable
 * WorldScene (which keeps the verified gameplay logic) and re-renders the
 * world so it reads as one believable place: grounded shadows under every
 * interactive entity, a Mira NPC with a guidance marker, biome banners on
 * arrival, and a polysyllable-styled Practice Slime encounter with HP pips.
 */
export default class PolishedWorldScene extends WorldScene {
  private practiceSlimeEncounter?: PracticeSlimeEncounterController;
  private wildbloomDiscovery?: WildbloomDiscoveryController;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private slimeGroundShadow?: Phaser.GameObjects.Ellipse;
  private miraPulse?: { glow: Phaser.GameObjects.Graphics; marker: Phaser.GameObjects.Graphics };
  private banner?: Phaser.GameObjects.Container;
  private objectiveMarker?: Phaser.GameObjects.Text;
  private objectiveEdgeArrow?: Phaser.GameObjects.Text;

  private get presentationInternals(): WorldScenePresentationInternals {
    // Both classes are deployed together as one unit, so this narrow
    // structural cast is safe here and keeps WorldScene's public surface
    // unchanged for the stable gameplay tests.
    return this as unknown as WorldScenePresentationInternals;
  }

  create(): void {
    super.create();
    this.addAtmosphere();
    this.addPlayerShadow();
    this.addInteractiveObjectShadows();
    this.addMiraNpc();
    this.installPracticeSlimeEncounter();
    this.installWildbloomDiscovery();
    this.showMapBanner();
  }

  update(): void {
    super.update();
    this.updatePlayerShadow();
    this.updateObjectiveMarker();
    this.wildbloomDiscovery?.update();
  }

  private addAtmosphere(): void {
    const vignette = this.add.graphics().setScrollFactor(0).setDepth(30);
    vignette.fillStyle(0x1a0f04, 0.12);
    vignette.fillRect(0, 0, GAME_WIDTH, sy(20));
    vignette.fillRect(0, GAME_HEIGHT - sy(20), GAME_WIDTH, sy(20));
    vignette.fillRect(0, 0, sx(20), GAME_HEIGHT);
    vignette.fillRect(GAME_WIDTH - sx(20), 0, sx(20), GAME_HEIGHT);
  }

  private addPlayerShadow(): void {
    this.playerShadow = this.add.ellipse(0, 0, sx(15), sy(6), 0x06110d, 0.35).setDepth(1);
  }

  private updatePlayerShadow(): void {
    const player = this.presentationInternals as unknown as { player: Phaser.Physics.Arcade.Sprite };
    if (!this.playerShadow || !player.player) return;
    this.playerShadow.setPosition(player.player.x, player.player.y + sy(1));
  }

  private addInteractiveObjectShadows(): void {
    const targets = this.presentationInternals.targets;
    const practiceSlimeSprite = this.presentationInternals.practiceSlimeSprite;

    if (practiceSlimeSprite) {
      // Slime sprite origin is bottom-center, so its base sits at the sprite y.
      // Tracked (not anonymous) so the shadow retires with the slime on
      // defeat — a shadow over an empty clearing would break the grounding
      // contract just as much as a missing one.
      this.slimeGroundShadow = this.add.ellipse(practiceSlimeSprite.x, practiceSlimeSprite.y - sy(1), sx(20), sx(7), 0x06110d, 0.32)
        .setDepth(1);
    }

    for (const target of targets) {
      if (target.id === 'mira' || target.id === 'practice-slime') continue;
      // All other interactables read as small ground-level markers/props.
      this.add.ellipse(target.x, target.y, sx(12), sy(5), 0x06110d, 0.28).setDepth(1);
    }
  }

  private addMiraNpc(): void {
    const mira = this.presentationInternals.targets.find((target) => target.id === 'mira');
    if (!mira) return;

    // Placeholder-friendly Mira proxy: layered shapes with her quest palette
    // (no new asset pipeline), grounded with a matching soft shadow.
    const body = this.add.graphics().setPosition(mira.x, mira.y).setScale(GAME_SCALE).setDepth(3.5);
    body.fillStyle(0x06110d, 0.35);
    body.fillEllipse(0, 5, 24, 8);
    body.fillStyle(0x7a4b9c, 1);
    body.fillEllipse(0, -14, 18, 26);
    body.fillStyle(0xe8b4a0, 1);
    body.fillCircle(0, -26, 7);
    body.fillStyle(0x3a2a1a, 1);
    body.fillEllipse(0, -30, 14, 8);
    body.fillStyle(0xffd666, 1);
    body.fillCircle(0, -14, 3);
    body.fillStyle(0xffffff, 0.9);
    body.fillCircle(-2.5, -27, 1.1);
    body.fillCircle(2.5, -27, 1.1);

    this.addMiraGuidance(mira);
  }

  private addMiraGuidance(mira: InteractionTarget): void {
    const markerY = mira.y - sy(42);
    const glow = this.add.graphics().setPosition(mira.x, markerY).setScale(GAME_SCALE).setDepth(5);
    glow.fillStyle(0xffd666, 0.28);
    glow.fillCircle(0, 0, 13);
    glow.fillStyle(0xffd666, 0.15);
    glow.fillCircle(0, 0, 18);

    // The literal quest glyph ("!"") replaces the old abstract diamond, so
    // quest givers read by shape, not just by color/sparkle (Batch 1
    // readability pass). The glow ring doubles as the redundant color cue.
    const marker = this.add.graphics().setPosition(mira.x, markerY).setScale(GAME_SCALE).setDepth(5);
    drawMarkerGlyph(marker, 'mira', 0xffd666);

    this.miraPulse = { glow, marker };

    this.tweens.add({
      targets: [glow, marker],
      scale: sscale(1.18),
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private installPracticeSlimeEncounter(): void {
    const internals = this.presentationInternals;
    const slimeTarget = internals.targets.find((target) => target.id === 'practice-slime');
    if (!slimeTarget || !internals.practiceSlimeSprite) return;

    this.practiceSlimeEncounter = new PracticeSlimeEncounterController({
      scene: this,
      target: slimeTarget,
      slime: internals.practiceSlimeSprite,
      heroAction: (action) => internals.heroAction(action),
      playSfx: (key, volume) => internals.playSfx(key, volume),
      playSlimeReaction: (kind, onImpact) => internals.playSlimeReaction(kind, onImpact),
      onPromptRequested: () => this.openPracticeSlimePrompt(slimeTarget)
    });
    this.practiceSlimeEncounter.create();

    // While a strike squash owns the slime sprite's transform, the shared
    // proximity affordance stays out of its way (the encounter resets the
    // exact GAME_SCALE baseline itself after every reaction).
    this.setAffordancePopGuard('practice-slime', () => this.practiceSlimeEncounter?.snapshot().inputLocked === false);

    const originalHintLabel = internals.hintLabel.bind(this);
    internals.hintLabel = (target: InteractionTarget): string => {
      if (target.id !== 'practice-slime') return originalHintLabel(target);
      return this.practiceSlimeEncounter?.snapshot().hintLabel ?? originalHintLabel(target);
    };

    // Opening the optional practice prompt now spends one of the slime's
    // three hearts; defeating it completes the same first-quest beat with
    // the same fixed reward as before.
    internals.openBonusPrompt = (
      context: 'farm' | 'wildbloom' | 'village' | 'combat',
      label: string,
      onResolved?: () => string | undefined
    ): void => {
      if (context !== 'combat') {
        WorldScene.prototype.openBonusPrompt.call(this, context, label, onResolved);
        return;
      }
      this.practiceSlimeEncounter?.strike();
    };
  }

  private openPracticeSlimePrompt(target: InteractionTarget): void {
    const internals = this.presentationInternals;
    if (this.practiceSlimeEncounter?.strike()) return;
    internals.handlePracticeSlimeDefeat();
    this.practiceSlimeEncounter?.retire();
    // The slime's grounding shadow leaves with it (across restarts the
    // defeated target is filtered out before either is created).
    this.slimeGroundShadow?.setVisible(false);
    WorldScene.prototype.openBonusPrompt.call(this, target.kind, target.label);
  }

  private installWildbloomDiscovery(): void {
    const internals = this.presentationInternals;
    if (internals.mapId !== WILDBLOOM_MAP_ID) return;

    this.wildbloomDiscovery = new WildbloomDiscoveryController({
      scene: this,
      hero: (this.presentationInternals as unknown as { player: Phaser.Physics.Arcade.Sprite }).player,
      playSfx: (key, volume) => internals.playSfx(key, volume),
      showToast: (message, playSound) => internals.showToast(message, playSound),
      onDiscoveryComplete: () => {
        internals.setWildbloomDiscoveryComplete();
        internals.saveCheckpoint();
        this.rebuildObjectiveMarker();
      }
    });
    this.wildbloomDiscovery.createFromTilemap();

    if (internals.wildbloomDiscoveryComplete) {
      this.wildbloomDiscovery.revealAll(false);
    }
  }

  private showMapBanner(): void {
    const internals = this.presentationInternals;
    const mapNames: Record<string, string> = {
      farm: 'The Farm',
      [WILDBLOOM_MAP_ID]: 'Wildbloom Woods',
      'eldoria-village': 'Eldoria Village'
    };
    const mapName = mapNames[internals.mapId];
    if (!mapName) return;

    const banner = this.add.container(GAME_WIDTH / 2, sy(30)).setScrollFactor(0).setDepth(45);
    this.banner = banner;

    const bg = this.add.graphics();
    bg.fillStyle(0x17110d, 0.85);
    bg.fillRoundedRect(-sx(56), -sy(9), sx(112), sy(18), 8);
    bg.lineStyle(2, 0xffd666, 0.9);
    bg.strokeRoundedRect(-sx(56), -sy(9), sx(112), sy(18), 8);

    const label = this.add.text(0, 0, mapName, {
      fontFamily: 'system-ui',
      fontSize: '22px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    banner.add([bg, label]);
    banner.setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          delay: 1800,
          duration: 620,
          ease: 'Sine.easeIn',
          onComplete: () => banner.destroy()
        });
      }
    });
  }

  private rebuildObjectiveMarker(): void {
    this.objectiveMarker?.destroy();
    this.objectiveMarker = undefined;
  }

  private updateObjectiveMarker(): void {
    const internals = this.presentationInternals as unknown as {
      player: Phaser.Physics.Arcade.Sprite;
      currentObjectiveTarget?: InteractionTarget;
    };
    const target = internals.currentObjectiveTarget;

    if (!target) {
      this.rebuildObjectiveMarker();
      if (this.objectiveEdgeArrow) {
        this.objectiveEdgeArrow.destroy();
        this.objectiveEdgeArrow = undefined;
      }
      return;
    }

    const cam = this.cameras.main;
    const onScreen = target.x >= cam.scrollX - 16
      && target.x <= cam.scrollX + cam.width + 16
      && target.y >= cam.scrollY - 16
      && target.y <= cam.scrollY + cam.height + 16;

    if (onScreen) {
      if (this.objectiveEdgeArrow) {
        this.objectiveEdgeArrow.destroy();
        this.objectiveEdgeArrow = undefined;
      }
      const markerY = target.y - sy(52);
      if (!this.objectiveMarker) {
        this.objectiveMarker = this.add.text(target.x, markerY, '▼', {
          fontFamily: 'system-ui',
          fontSize: '26px',
          color: '#ffd666',
          stroke: '#1a1208',
          strokeThickness: 4
        }).setOrigin(0.5).setDepth(10);
        this.tweens.add({
          targets: this.objectiveMarker,
          y: markerY - sy(6),
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        this.objectiveMarker.setPosition(target.x, markerY);
      }
      return;
    }

    this.rebuildObjectiveMarker();
    if (!this.objectiveEdgeArrow) {
      this.objectiveEdgeArrow = this.add.text(0, 0, '➤', {
        fontFamily: 'system-ui',
        fontSize: '30px',
        color: '#ffd666',
        stroke: '#1a1208',
        strokeThickness: 5
      }).setOrigin(0.5).setScrollFactor(0).setDepth(46);
    }

    const player = internals.player;
    const screenX = player.x - cam.scrollX;
    const screenY = player.y - cam.scrollY;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const targetScreenX = target.x - cam.scrollX;
    const targetScreenY = target.y - cam.scrollY;
    const angle = Math.atan2(targetScreenY - screenY, targetScreenX - screenX);

    const margin = 44;
    const edgeX = Phaser.Math.Clamp(centerX + Math.cos(angle) * (GAME_WIDTH / 2 - margin), margin, GAME_WIDTH - margin);
    const edgeY = Phaser.Math.Clamp(centerY + Math.sin(angle) * (GAME_HEIGHT / 2 - margin), margin, GAME_HEIGHT - margin);
    this.objectiveEdgeArrow.setPosition(edgeX, edgeY).setRotation(angle);
  }
}
