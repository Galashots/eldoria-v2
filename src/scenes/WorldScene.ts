import Phaser from 'phaser';
import { fpx, GAME_HEIGHT, GAME_SCALE, GAME_WIDTH, LEGACY_GAME_WIDTH, sx, sy } from '../gameDimensions';
import { MOVEMENT_TUNING } from '../movementTuning';
import type { AnswerValue, BonusContext, LearningPrompt } from '../data/curriculum';
import { REWARD_KIND_GOLD_VALUE } from '../data/curriculum';
import { PROFILES, type ProfileId } from '../data/profiles';
import { CHARM_REGISTRY, MIRA_FIRST_ERRAND } from '../data/quests';
import {
  MIRA_PRACTICE_CONTEXTS,
  POST_PURPOSE_FLAVOR,
  PRACTICE_OFFER_SUFFIX,
  PRACTICE_OFFER_WINDOW_MS
} from '../data/flavor';
import { resolveInteractionId, getTiledProperty, interactionDisplayName, isInteractionId, type InteractionId } from '../data/interactions';
import { getQuestDefinition, type DialogueLine, type QuestObjectiveTarget } from '../data/questDefs';
import {
  getMapDefinition,
  resolveMapId,
  resolveSpawn,
  type MapDefinition,
  type MapId
} from '../data/maps';
import {
  facingFromVector,
  HeroPresentationController
} from '../presentation/HeroPresentationController';
import { DialogueBox } from '../presentation/DialogueBox';
import { InteractableAffordanceController, type AffordanceVisual } from '../presentation/InteractableAffordance';
import { HUD_CONTROL_SIZES } from '../presentation/hudControls';
import { drawMarkerGlyph } from '../presentation/markerGlyphs';
import {
  drawRoundedButton,
  drawRoundedPanelBackground,
  installButtonPressFeedback,
  popInContainer
} from '../presentation/uiHelpers';
import { LearningBonusSystem } from '../systems/LearningBonusSystem';
import { MasterySystem, type LearningMastery } from '../systems/MasterySystem';
import { FarmQuestSystem, type FarmQuestOutcome } from '../systems/FarmQuestSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { CURRENT_SAVE_VERSION, SaveSystem, type StarterQuestStep } from '../systems/SaveSystem';
import { loadAudioMuted, saveAudioMuted } from '../systems/AudioPreference';
import { createSpeechSupport } from '../systems/speech';
import { TEXT_BLIP_COOLDOWN_MS } from '../systems/textBlips';
import {
  resolveObjectiveGuidance,
  type ObjectiveGuidance
} from '../systems/objectiveGuidance';

type SceneInitData = {
  profileId?: ProfileId;
  /** Registered map to load; omitted => saved map (lastArea) or the farm. */
  mapId?: MapId;
  /** Named arrival spawn on that map; omitted => saved/default placement. */
  spawnId?: string;
};

type TouchMoveVector = {
  x: number;
  y: number;
};

type InteractionTarget = {
  id: InteractionId;
  kind: BonusContext;
  x: number;
  y: number;
  label: string;
};

type PromptCloseResult = {
  answered: boolean;
  correct: boolean;
};

/**
 * A walk-into map transition zone, parsed from a Tiled object of type
 * "exit" (properties: targetMap, targetSpawn, optional documented-but-unused
 * requiresQuestFlag). Rect is in world px.
 */
type ExitZone = {
  rect: Phaser.Geom.Rectangle;
  centerX: number;
  centerY: number;
  targetMap: MapId;
  targetSpawn: string;
};

type PromptCloseHandler = (result: PromptCloseResult) => string | undefined;

const PRACTICE_SLIME_TEXTURE_KEY = 'practice-slime-v001';
const PRACTICE_SLIME_IDLE_ANIMATION = 'practice-slime-idle';
const PRACTICE_SLIME_HOP_ANIMATION = 'practice-slime-hop';
const CROP_BONUS_FEEDBACK_NAME = 'crop-bonus-feedback';
const STATS_CLOSE_BUTTON_NAME = 'stats-close-button';
const MAP_ENTRY_BANNER_NAME = 'map-entry-banner';
const BERRY_ORDER_ID = 'pell-berry-order';
const BERRY_ORDER = getQuestDefinition(BERRY_ORDER_ID);
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E' | 'I' | 'TAB', Phaser.Input.Keyboard.Key>;
  private touchMove: TouchMoveVector = { x: 0, y: 0 };
  private joystickOrigin: TouchMoveVector = { x: 0, y: 0 };
  private joystickPointer: Phaser.Input.Pointer | null = null;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private readonly joystickRadius = sx(42);
  private targets: InteractionTarget[] = [];
  private profileId: ProfileId = 'grade5-adventurer';
  // Multi-map state (see data/maps.ts). mapId is authoritative for the
  // currently loaded map; initSpawnId is set only when this scene start came
  // from an explicit transition/boot request rather than a saved position.
  protected mapId: MapId = 'farm';
  private mapDef!: MapDefinition;
  private initMapId?: MapId;
  private initSpawnId?: string;
  private exits: ExitZone[] = [];
  private transitioning = false;
  private learning!: LearningBonusSystem;
  private gold = 0;
  private inventory: Record<string, number> = {};
  private mastery: LearningMastery = {};
  private farmQuest!: FarmQuestSystem;
  private questSystem!: QuestSystem;
  private busy = false;
  private statsPanelOpen = false;
  private statsContainer?: Phaser.GameObjects.Container;
  private statsCloseGroup?: Phaser.GameObjects.Container;
  // Batch 1 affordance pass: every marker visual registered here gets a
  // staggered idle bob plus a proximity pop (see InteractableAffordance).
  // `idleBob: false` marks visuals like the slime sprite that should pop on
  // approach but never bob (it has its own hop animation).
  private targetMarkerVisuals: { target: InteractionTarget; marker: AffordanceVisual; idleBob: boolean }[] = [];
  private affordances?: InteractableAffordanceController;
  private readonly speech = createSpeechSupport();
  private dialogueBox?: DialogueBox;
  private hudText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private practiceSlimeSprite?: Phaser.GameObjects.Sprite;
  // Objective direction (pre-reader friendly): a bouncing gold chevron above
  // the current quest target plus an edge-of-screen arrow when it's off
  // camera. Both are plain Graphics direct scene children — see the
  // container-convention comment in drawTargetMarkers().
  private objectiveMarker?: Phaser.GameObjects.Graphics;
  private objectiveMarkerTween?: Phaser.Tweens.Tween;
  private objectiveEdgeArrow?: Phaser.GameObjects.Graphics;
  private objectiveTargetPosition?: { x: number; y: number };
  private heroPresentation!: HeroPresentationController;
  private music?: Phaser.Sound.BaseSound;
  private muteIcon!: Phaser.GameObjects.Graphics;
  private lastFootstepAt = 0;
  // Post-purpose interactions (see data/flavor.ts): a flavor toast can carry
  // a short-lived practice offer — a second ACTION press on the same target
  // within the window opens the optional prompt. Session-local by design.
  private pendingPracticeOffer?: { id: InteractionId; context: BonusContext; label: string; expiresAt: number };
  private flavorRotation: Partial<Record<keyof typeof POST_PURPOSE_FLAVOR, number>> = {};
  private miraPracticeContextIndex = 0;
  private readonly lastSfxAt: Partial<Record<string, number>> = {};
  private readonly sfxCooldownMs = 90;
  // Lowered from the first pass's 0.32: the placeholder loop is only ~12.6s,
  // so at first-impression volumes its repetition became noticeable fast.
  // Softer here reduces that risk until real licensed music replaces it.
  private readonly musicVolume = 0.22;
  private readonly musicDuckedVolume = 0.06;
  private readonly speechHooks = {
    onStart: (): void => this.setMusicVolume(this.musicDuckedVolume),
    onEnd: (): void => this.setMusicVolume(this.musicVolume)
  };
  // Bound once so addEventListener/removeEventListener target the same
  // reference. Without this, losing window/tab focus while a movement key
  // is physically held down never delivers its keyup to the canvas, so
  // Phaser's cursor/key state stays stuck "down" forever afterward and the
  // player keeps sliding in that direction even though nothing is pressed.
  private readonly clearStuckInputOnFocusLoss = (): void => {
    this.input.keyboard?.resetKeys();
    this.resetJoystick();
  };

  constructor() {
    super('WorldScene');
  }

  init(data: SceneInitData): void {
    this.profileId = data.profileId ?? 'grade5-adventurer';
    this.learning = new LearningBonusSystem(this.profileId);
    this.initMapId = data.mapId;
    this.initSpawnId = data.spawnId;
    // Scene instances are reused across restarts (map transitions restart
    // this scene with new init data), so cross-boot state must reset here —
    // class-field initializers only ran at construction.
    this.transitioning = false;
    this.busy = false;
    this.statsPanelOpen = false;
    this.exits = [];
    this.dialogueBox = undefined;
    this.targetMarkerVisuals = [];
    this.affordances = undefined;
    this.statsCloseGroup = undefined;
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Save is loaded before anything else: it decides which map to build
    // (persisted in the pre-existing lastArea field — old saves wrote
    // 'farm', unknown values resolve to the farm) and whether the Practice
    // Slime should exist at all.
    const saved = SaveSystem.load(this.profileId);
    const arrivedViaExplicitRequest = this.initMapId !== undefined;
    this.mapId = this.initMapId ?? resolveMapId(saved?.lastArea);
    this.mapDef = getMapDefinition(this.mapId);

    const map = this.make.tilemap({ key: this.mapDef.tiledKey });
    const tilesets = this.mapDef.tilesets.map(({ tiledName, imageKey }) => {
      const tileset = map.addTilesetImage(tiledName, imageKey);
      if (!tileset) throw new Error(`Missing tileset: ${tiledName}`);
      return tileset;
    });

    // Tile layers render at GAME_SCALE (their underlying Tiled grid/GIDs are
    // untouched) rather than doubling the map JSON's own tile dimensions, so
    // the map file stays a single source of truth for both this scaled
    // runtime and Tiled's editor view. Every layer draws from the map's full
    // registered tileset list; unused tilesets on a layer are harmless.
    map.createLayer('Ground', tilesets, 0, 0)?.setScale(GAME_SCALE);
    map.createLayer('Decor', tilesets, 0, 0)?.setScale(GAME_SCALE);

    const collisionLayer = map.createLayer('Collision', tilesets, 0, 0)?.setScale(GAME_SCALE);
    if (collisionLayer) {
      collisionLayer.setCollision([...this.mapDef.collisionGids]);
      collisionLayer.setVisible(false);
    }

    const objectLayer = map.getObjectLayer('Objects');
    const tiledSpawn = objectLayer?.objects.find((obj) => obj.name === 'PlayerSpawn');
    const worldWidth = map.widthInPixels * GAME_SCALE;
    const worldHeight = map.heightInPixels * GAME_SCALE;

    // Placement priority: an explicit spawn request (map transition or
    // scripted boot) wins; otherwise a same-map saved position restores
    // exactly as before; otherwise the map's own PlayerSpawn object, then
    // the registry default spawn.
    const requestedSpawn = arrivedViaExplicitRequest
      ? resolveSpawn(this.mapDef, this.initSpawnId)
      : undefined;
    const fallbackSpawn = tiledSpawn
      ? { x: (tiledSpawn.x ?? 0) * GAME_SCALE, y: (tiledSpawn.y ?? 0) * GAME_SCALE }
      : resolveSpawn(this.mapDef, undefined);
    const savedPositionApplies = !arrivedViaExplicitRequest
      && saved !== null
      && resolveMapId(saved.lastArea) === this.mapId;
    const startPosition = requestedSpawn
      ?? (savedPositionApplies ? saved.player : fallbackSpawn);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.player = this.physics.add.sprite(startPosition.x, startPosition.y, 'adventurer', 0);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(GAME_SCALE);
    // Arcade Physics bodies don't auto-derive from display scale once
    // setSize() is called explicitly, so these must be doubled by hand to
    // match the now-2x sprite and world.
    this.player.body?.setSize(sx(18), sy(18)).setOffset(sx(7), sy(12));

    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    if (saved) {
      this.gold = saved.gold;
      this.inventory = { ...(saved.inventory ?? {}) };
      this.mastery = { ...(saved.mastery ?? {}) };
    }

    this.farmQuest = FarmQuestSystem.fromSave(saved);
    this.questSystem = QuestSystem.fromSave(saved);

    this.targets = this.makeTargets(objectLayer?.objects ?? []).filter(
      (target) => target.id !== 'practice-slime' || !this.farmQuest.isPracticeSlimeDefeated()
    );
    this.exits = this.makeExits(objectLayer?.objects ?? []);
    this.createPracticeSlimeAnimations();
    this.drawTargetMarkers();
    this.installInteractableAffordances();

    this.cameras.main.startFollow(this.player, true, MOVEMENT_TUNING.cameraLerp, MOVEMENT_TUNING.cameraLerp);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,E,I,TAB') as Record<
      'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E' | 'I' | 'TAB',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);

    this.heroPresentation = new HeroPresentationController(this, this.player, this.profileId);
    this.heroPresentation.create();

    // Passed into createHud() rather than read back from `this.sound.mute`
    // there: Phaser's WebAudio `mute` getter reflects a GainNode value that
    // a `setValueAtTime`-scheduled setter doesn't update synchronously, so
    // re-reading it on the same tick can still return the pre-set value.
    const initialAudioMuted = loadAudioMuted();
    this.sound.mute = initialAudioMuted;

    this.createHud(initialAudioMuted);
    this.createTouchControls();

    this.music = this.sound.add(this.mapDef.musicKey, { loop: true, volume: this.musicVolume });
    this.music.play();
    this.dialogueBox = new DialogueBox(this, {
      speech: this.speech,
      speechHooks: this.speechHooks,
      onSpeechUnavailable: () => this.showToast('Read aloud is not available here.'),
      // Routed through playSfx so the global mute pref applies (Council #115 D5
      // conditions 1-2). Uses a dedicated sub-48ms cooldown (TEXT_BLIP_COOLDOWN_MS)
      // so the documented every-2nd-glyph cadence is actually audible instead of
      // being halved by the default 90ms tap-spam guard.
      playBlip: () => this.playSfx('sfx-text-blip', 0.18, TEXT_BLIP_COOLDOWN_MS)
    });

    // Arriving on a map by explicit request (a transition or scripted boot)
    // persists it immediately — quitting on this map returns here — and
    // fades back in to complete the travel moment the exit's fade-out began.
    if (arrivedViaExplicitRequest) {
      this.save();
      this.cameras.main.fadeIn(300, 12, 10, 18);
    }

    this.showMapEntryBanner();

    this.events.on(Phaser.Scenes.Events.PAUSE, this.stopPromptReadAloud, this);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.stopPromptReadAloud, this);
    window.addEventListener('blur', this.clearStuckInputOnFocusLoss);
    document.addEventListener('visibilitychange', this.clearStuckInputOnFocusLoss);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dialogueBox?.destroy();
      this.affordances?.dispose();
      this.affordances = undefined;
      this.stopPromptReadAloud();
      this.input.keyboard?.resetKeys();
      this.resetJoystick();
      // Scene instances are reused across restarts; drop the stale display
      // objects so the next create() rebuilds them fresh.
      this.objectiveMarkerTween = undefined;
      this.objectiveMarker = undefined;
      this.objectiveEdgeArrow = undefined;
      this.objectiveTargetPosition = undefined;
      this.pendingPracticeOffer = undefined;
      this.heroPresentation.dispose();
      // destroy(), not just stop(): `this.sound` is a Game-level plugin
      // shared across scene restarts, so a merely-stopped Sound instance
      // would leak every time this WorldScene instance re-runs create().
      this.music?.destroy();
      this.events.off(Phaser.Scenes.Events.PAUSE, this.stopPromptReadAloud, this);
      this.events.off(Phaser.Scenes.Events.SLEEP, this.stopPromptReadAloud, this);
      window.removeEventListener('blur', this.clearStuckInputOnFocusLoss);
      document.removeEventListener('visibilitychange', this.clearStuckInputOnFocusLoss);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.stopPromptReadAloud();
    });
  }

  update(): void {
    this.heroPresentation.syncPosition();
    // Runs before the busy gates below: the arrow tracks the camera, and the
    // camera can still be settling (follow lerp) for a frame or two after a
    // prompt opens.
    this.updateObjectiveEdgeArrow();
    // Proximity pops keep running while panels are open so closing a panel
    // near a target still shows the affordance; the controller is cheap.
    this.affordances?.update();

    if (this.busy && !this.statsPanelOpen) {
      this.player.setVelocity(0, 0);
      this.heroPresentation.setBusy();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.I) || Phaser.Input.Keyboard.JustDown(this.keys.TAB)) {
      this.toggleStatsPanel();
      return;
    }

    if (this.busy) {
      this.player.setVelocity(0, 0);
      this.heroPresentation.setBusy();
      return;
    }

    // Raised from the original 250 world px/sec after play feedback that the
    // hero "feels slow" — see MOVEMENT_TUNING for the tuned values and their
    // playtested bounds.
    const { maxSpeed, velocitySmoothing, velocitySnapThreshold } = MOVEMENT_TUNING;
    const keyX = (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0)
      - (this.cursors.left.isDown || this.keys.A.isDown ? 1 : 0);
    const keyY = (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0)
      - (this.cursors.up.isDown || this.keys.W.isDown ? 1 : 0);
    const rawX = keyX + this.touchMove.x;
    const rawY = keyY + this.touchMove.y;
    const rawLength = Math.hypot(rawX, rawY);
    const inputX = rawLength > 1 ? rawX / rawLength : rawX;
    const inputY = rawLength > 1 ? rawY / rawLength : rawY;
    const isMoving = Math.abs(inputX) > 0.01 || Math.abs(inputY) > 0.01;

    // Light acceleration/deceleration: lerp the current physics velocity
    // toward input * maxSpeed each frame instead of setting it outright, so
    // starts/stops ease briefly rather than snapping. Reading the current
    // velocity from the body (not a shadow variable) keeps this correct
    // across the busy paths above, which zero the body directly. The snap
    // threshold turns the asymptotic tail of a stop into an exact 0 so
    // "velocity is 0 when idle" remains a stable, testable state.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const targetX = inputX * maxSpeed;
    const targetY = inputY * maxSpeed;
    let nextX = body.velocity.x + (targetX - body.velocity.x) * velocitySmoothing;
    let nextY = body.velocity.y + (targetY - body.velocity.y) * velocitySmoothing;
    if (!isMoving && Math.hypot(nextX, nextY) < velocitySnapThreshold) {
      nextX = 0;
      nextY = 0;
    }
    this.player.setVelocity(nextX, nextY);

    if (isMoving) {
      this.heroPresentation.setMovement(facingFromVector(inputX, inputY), true);
      if (this.time.now - this.lastFootstepAt > MOVEMENT_TUNING.footstepIntervalMs) {
        this.lastFootstepAt = this.time.now;
        // Softer than other one-shot SFX on purpose: this one repeats every
        // footstep interval during movement, so it's the SFX most likely to
        // feel annoying on a first playthrough.
        this.playSfx('sfx-footstep', 0.16);
      }
    } else {
      this.heroPresentation.setIdle();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.handleActionInput();
    }

    this.checkExitTrigger();
    this.updateHint();
  }

  private makeTargets(objects: Phaser.Types.Tilemaps.TiledObject[]): InteractionTarget[] {
    return objects
      .filter((obj) => obj.type === 'npc' || obj.type === 'bonus' || obj.type === 'enemy')
      .map((obj) => {
        const label = obj.name || obj.type || 'Target';
        const customId = getTiledProperty(obj, 'interactionId');
        if (customId !== undefined && !isInteractionId(customId)) {
          // A hand-authored mistake the committed-map validator rejects:
          // degrade to the name-based fallback instead of crashing dispatch
          // on tap (interactions.ts isInteractionId is the runtime backstop).
          console.warn(`[WorldScene] target "${label}" has unknown interactionId ${String(customId)}; falling back to name resolution`);
        }
        return {
          // An explicit custom interactionId wins when it is a registered
          // id; anything else resolves by display name (generic-bonus floor).
          id: isInteractionId(customId) ? customId : resolveInteractionId(label),
          kind: obj.type === 'enemy' ? 'combat' : obj.type === 'bonus' ? 'farm' : 'quest',
          x: (obj.x ?? 0) * GAME_SCALE,
          y: (obj.y ?? 0) * GAME_SCALE,
          label
        } satisfies InteractionTarget;
      });
  }

  /**
   * Parses walk-into exit zones from the map's Tiled Objects layer. An exit
   * whose targetMap is not registered is dropped (the unit-test layer
   * cross-validates every committed map's exits against the registry, so
   * this guard only matters for hand-authored mistakes during development).
   */
  private makeExits(objects: Phaser.Types.Tilemaps.TiledObject[]): ExitZone[] {
    const exits: ExitZone[] = [];
    for (const obj of objects) {
      if (obj.type !== 'exit') continue;
      const targetMap = getTiledProperty(obj, 'targetMap');
      const targetSpawn = getTiledProperty(obj, 'targetSpawn');
      if (typeof targetMap !== 'string' || resolveMapId(targetMap) !== targetMap) continue;
      if (typeof targetSpawn !== 'string') continue;

      const rect = new Phaser.Geom.Rectangle(
        (obj.x ?? 0) * GAME_SCALE,
        (obj.y ?? 0) * GAME_SCALE,
        (obj.width ?? 0) * GAME_SCALE,
        (obj.height ?? 0) * GAME_SCALE
      );
      exits.push({
        rect,
        centerX: rect.centerX,
        centerY: rect.centerY,
        targetMap: targetMap as MapId,
        targetSpawn
      });
    }
    return exits;
  }

  /**
   * Walk-into transition check, run each frame while the player has control.
   * Triggering locks input, fades out, and restarts the scene on the target
   * map/spawn; the transitioning flag guards against re-entry, and arrival
   * spawns are registry-placed outside their neighbouring exit zones so
   * walking back through a gate never bounces.
   */
  private checkExitTrigger(): void {
    if (this.transitioning || this.busy) return;

    for (const exit of this.exits) {
      if (!exit.rect.contains(this.player.x, this.player.y)) continue;
      this.beginMapTransition(exit);
      return;
    }
  }

  private beginMapTransition(exit: ExitZone): void {
    this.transitioning = true;
    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);
    this.heroPresentation.setBusy();
    this.stopPromptReadAloud();

    // Same dusk tint the polished gate arrival uses, so out-fade and in-fade
    // read as one continuous travel moment.
    this.cameras.main.fadeOut(300, 12, 10, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({
        profileId: this.profileId,
        mapId: exit.targetMap,
        spawnId: exit.targetSpawn
      } satisfies SceneInitData);
    });
  }

  private drawTargetMarkers(): void {
    for (const target of this.targets) {
      if (target.id === 'practice-slime') {
        this.practiceSlimeSprite = this.add.sprite(
          target.x,
          target.y,
          PRACTICE_SLIME_TEXTURE_KEY,
          0
        )
          .setOrigin(0.5, 1)
          .setScale(GAME_SCALE)
          .setDepth(2)
          .play(PRACTICE_SLIME_IDLE_ANIMATION);
        // The slime's idle animation is already alive, so it pops on
        // approach but never idle-bobs (two idle systems would fight).
        this.targetMarkerVisuals.push({ target, marker: this.practiceSlimeSprite, idleBob: false });
        continue;
      }

      if (target.id === 'mira') {
        // PolishedWorldScene.addMiraGuidance draws Mira's NPC silhouette and
        // quest-glyph marker over the bare target point.
        continue;
      }

      // Kept as direct scene children (not a container): tests locate the
      // bonus-prompt panel via `children.list.find(c => Array.isArray(c.list))`
      // — "the first Container in the scene" — and a persistent marker
      // container created here (during every create()) would wrongly match
      // that lookup instead of the actual prompt panel.
      const ringColor = target.kind === 'combat' ? 0xaa3344 : target.kind === 'farm' ? 0x55aa33 : 0x4488cc;
      // Batch 1 marker pass: a literal code-drawn glyph (flower, stone,
      // slime face, scroll, berries...) identifies the target type; color
      // is only redundant coding on top, never the sole signal. Drawn in
      // design px inside a GAME_SCALE-scaled Graphics — the same convention
      // as the Mira marker — instead of doubling every pixel by hand.
      const glyph = this.add.graphics()
        .setPosition(target.x, target.y - sy(12))
        .setScale(GAME_SCALE)
        .setDepth(3);
      drawMarkerGlyph(glyph, target.id, ringColor);
      this.add.text(target.x, target.y - sy(34), this.targetDisplayName(target), {
        fontFamily: 'system-ui',
        fontSize: fpx(11),
        color: '#ffffff',
        stroke: '#1a1208',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(3);
      this.targetMarkerVisuals.push({ target, marker: glyph, idleBob: true });
    }
  }

  /**
   * Kid-friendly marker label: a curated display name when one exists
   * ("Crop Patch", "Mossy Stone"), falling back to the target's quest label.
   * Prompts and hints route through this so the dev-style raw ids
   * ("CropBonus") never reach the screen.
   */
  private targetDisplayName(target: InteractionTarget): string {
    return interactionDisplayName(target.id, target.label);
  }

  private installInteractableAffordances(): void {
    this.affordances = new InteractableAffordanceController(this, this.player);
    for (const { target, marker, idleBob } of this.targetMarkerVisuals) {
      this.affordances.register({ id: target.id, x: target.x, y: target.y, marker, idleBob });
    }
  }

  /** Subclass hook: gate a target's proximity pop (the slime strike owns the sprite mid-beat). */
  protected setAffordancePopGuard(id: InteractionId, canPop: () => boolean): void {
    this.affordances?.setPopGuard(id, canPop);
  }

  private createPracticeSlimeAnimations(): void {
    if (!this.anims.exists(PRACTICE_SLIME_IDLE_ANIMATION)) {
      this.anims.create({
        key: PRACTICE_SLIME_IDLE_ANIMATION,
        frames: this.anims.generateFrameNumbers(PRACTICE_SLIME_TEXTURE_KEY, { start: 0, end: 3 }),
        frameRate: 3,
        repeat: -1
      });
    }

    if (!this.anims.exists(PRACTICE_SLIME_HOP_ANIMATION)) {
      this.anims.create({
        key: PRACTICE_SLIME_HOP_ANIMATION,
        frames: this.anims.generateFrameNumbers(PRACTICE_SLIME_TEXTURE_KEY, { start: 6, end: 11 }),
        frameRate: 10,
        repeat: 0
      });
    }
  }

  private playPracticeSlimeFeedback(kind: 'hop' | 'poof', onComplete?: () => void): void {
    const sprite = this.practiceSlimeSprite;
    if (!sprite || kind !== 'hop') {
      onComplete?.();
      return;
    }

    sprite.play(PRACTICE_SLIME_HOP_ANIMATION);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (sprite.active) {
        sprite.play(PRACTICE_SLIME_IDLE_ANIMATION);
      }
      onComplete?.();
    });
  }

  private playCropBonusFeedback(target: InteractionTarget, onComplete: () => void): void {
    // Kept as direct scene children (not a scaled container) with each pixel
    // literal doubled by hand: the pulse is located by name via
    // scene.children.getByName in tests/vertical-slice.spec.ts, which only
    // searches the scene's own direct display list, not nested containers.
    const centerY = target.y - sy(12);
    const pulse = this.add.circle(target.x, centerY, sx(8), 0x8fd14f, 0.08)
      .setName(CROP_BONUS_FEEDBACK_NAME)
      .setStrokeStyle(2, 0xd7ff8f, 0.95)
      .setDepth(3);

    for (let index = 0; index < 4; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      const leaf = this.add.ellipse(
        target.x + direction * sx(4 + index * 2),
        centerY + sy(2),
        sx(5),
        sx(3),
        index < 2 ? 0x8fd14f : 0xffd666,
        0.95
      ).setDepth(3).setAngle(direction * 22);

      this.tweens.add({
        targets: leaf,
        x: leaf.x + direction * sx(8 + index * 2),
        y: leaf.y - sy(12 + index * 2),
        angle: leaf.angle + direction * 55,
        alpha: 0,
        duration: 420 + index * 20,
        ease: 'Sine.easeOut',
        onComplete: () => leaf.destroy()
      });
    }

    this.tweens.add({
      targets: pulse,
      scale: 2.4,
      alpha: 0,
      duration: 480,
      ease: 'Sine.easeOut',
      onComplete: () => {
        pulse.destroy();
        onComplete();
      }
    });
  }

  /**
   * Draws a small speaker glyph by hand instead of using a native emoji
   * (🔊/🔇), which renders in whatever emoji font the OS/browser ships and
   * looks visually inconsistent next to the pixel-art sprites — a real risk
   * for a game that has to look the same on iPad Safari and desktop Chrome.
   * Repaints in place on `graphics` so the mute toggle can redraw it without
   * recreating the object.
   */
  // Draws relative to a local (0,0) origin — the caller positions the whole
  // icon once via graphics.setPosition() and scales it via .setScale(), so
  // every internal offset here stays correct at any GAME_SCALE without
  // needing to be doubled by hand.
  private paintSpeakerIcon(graphics: Phaser.GameObjects.Graphics, muted: boolean): void {
    graphics.clear();
    graphics.fillStyle(0xffd666, 1);
    graphics.fillRect(-9, -3, 4, 6);
    graphics.fillTriangle(-5, -3, -5, 3, 1, -7);
    graphics.fillTriangle(-5, 3, 1, -7, 1, 7);

    if (muted) {
      graphics.lineStyle(2, 0xe0916c, 1);
      graphics.beginPath();
      graphics.moveTo(2, -7);
      graphics.lineTo(9, 7);
      graphics.strokePath();
    } else {
      graphics.lineStyle(1.5, 0xffd666, 1);
      graphics.beginPath();
      graphics.arc(1, 0, 4, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(40));
      graphics.strokePath();
      graphics.beginPath();
      graphics.arc(1, 0, 7, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35));
      graphics.strokePath();
    }
  }

  /** Draws a small gold-coin glyph in place of the 🪙 emoji, for the same reason as `paintSpeakerIcon`. */
  private drawCoinIcon(x: number, y: number, radius = 8): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffd666, 1);
    graphics.fillCircle(x, y, radius);
    graphics.lineStyle(1.5, 0xa97a1f, 1);
    graphics.strokeCircle(x, y, radius);
    graphics.fillStyle(0xfff3c9, 0.8);
    graphics.fillEllipse(x - radius * 0.32, y - radius * 0.32, radius * 0.55, radius * 0.35);
    return graphics;
  }

  private createHud(initialAudioMuted: boolean): void {
    drawRoundedPanelBackground(this, GAME_WIDTH / 2, sy(14), GAME_WIDTH - sx(20), sy(24), 0x2a1a08, 0x6f5126, 10)
      .setScrollFactor(0);

    this.hudText = this.add.text(sx(16), sy(7), '', {
      fontFamily: 'system-ui',
      fontSize: fpx(12),
      color: '#ffd666'
    }).setScrollFactor(0);

    const statsBtn = drawRoundedButton(this, GAME_WIDTH - sx(50), sy(14), HUD_CONTROL_SIZES.stats.width, HUD_CONTROL_SIZES.stats.height, 0x5f3d12, 0xffd666, 10);

    this.add.text(GAME_WIDTH - sx(50), sy(14), 'STATS', {
      fontFamily: 'system-ui',
      fontSize: fpx(9),
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    statsBtn.on('pointerdown', () => this.toggleStatsPanel());

    const muteBtn = drawRoundedButton(this, GAME_WIDTH - sx(96), sy(14), HUD_CONTROL_SIZES.mute.width, HUD_CONTROL_SIZES.mute.height, 0x5f3d12, 0xffd666, 10);

    this.muteIcon = this.add.graphics()
      .setScrollFactor(0)
      .setScale(GAME_SCALE)
      .setPosition(GAME_WIDTH - sx(96), sy(14));
    this.paintSpeakerIcon(this.muteIcon, initialAudioMuted);

    muteBtn.on('pointerdown', () => this.toggleAudioMute());

    // A small gap below the HUD bar (rather than sitting flush against it)
    // so the two read as separate pieces of information, not one tall box.
    drawRoundedPanelBackground(this, GAME_WIDTH / 2, sy(48), GAME_WIDTH - sx(20), sy(28), 0x162a12, 0x5e9f3a, 10)
      .setScrollFactor(0);

    this.objectiveText = this.add.text(sx(16), sy(40), '', {
      fontFamily: 'system-ui',
      fontSize: fpx(11),
      color: '#d7ffb8',
      wordWrap: { width: GAME_WIDTH - sx(32) }
    }).setScrollFactor(0);

    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - sy(18), '', {
      fontFamily: 'system-ui',
      fontSize: fpx(11),
      color: '#f5e6c8',
      backgroundColor: '#2a1a08',
      padding: { x: sx(8), y: sy(4) }
    }).setOrigin(0.5).setScrollFactor(0);

    this.refreshHud();
    this.refreshObjective();
  }

  private refreshHud(): void {
    const profile = PROFILES[this.profileId];
    const charm = MIRA_FIRST_ERRAND.rewards.charm;
    const keepsake = (this.inventory[charm.key] ?? 0) > 0
      ? `  |  Keepsake: ${charm.name}`
      : '';

    this.hudText.setText(`${profile.label}  |  Gold: ${this.gold}${keepsake}`);
  }

  private refreshObjective(): void {
    const presentation = this.resolveObjectivePresentation();
    const guidance = resolveObjectiveGuidance(this.mapId, presentation.objective);
    const bannerText = presentation.source === 'mira' && guidance.kind === 'exit'
      ? `Head back to The Farm — ${presentation.bannerText}`
      : presentation.bannerText;
    this.objectiveText.setText(`Objective: ${bannerText}`);
    this.updateObjectiveMarker(guidance);
  }

  private resolveObjectivePresentation(): {
    bannerText: string;
    objective: QuestObjectiveTarget | null;
    source: 'berry-order' | 'mira';
  } {
    const berryStep = this.questSystem.step(BERRY_ORDER_ID);
    if (berryStep === 'gathering' || berryStep === 'return-ready') {
      return {
        bannerText: this.berryOrderObjectiveText(berryStep),
        objective: BERRY_ORDER.objectiveTargets[berryStep] ?? null,
        source: 'berry-order'
      };
    }

    if (!this.farmQuest.allErrandsComplete()) {
      const target = this.farmQuest.currentObjectiveTarget();
      return {
        bannerText: this.farmQuest.currentObjective(),
        objective: target ? { map: 'farm', target } : null,
        source: 'mira'
      };
    }

    return {
      bannerText: this.berryOrderObjectiveText(berryStep),
      objective: BERRY_ORDER.objectiveTargets[berryStep] ?? null,
      source: 'berry-order'
    };
  }

  private berryOrderObjectiveText(step: string): string {
    const objective = BERRY_ORDER.objectives[step];
    if (typeof objective === 'function') return objective(this.questSystem.berriesCollected());
    return objective ?? BERRY_ORDER.name;
  }

  /**
   * Positions the bouncing gold chevron above the current objective target
   * (or hides it when every errand is complete / the target is absent).
   * Called from refreshObjective() so every quest-state change retargets it.
   */
  private updateObjectiveMarker(guidance: ObjectiveGuidance): void {
    let targetPosition: { x: number; y: number; markerY: number } | undefined;
    if (guidance.kind === 'local') {
      const target = this.targets.find((candidate) => candidate.id === guidance.target);
      if (target) {
        targetPosition = { x: target.x, y: target.y, markerY: target.y - sy(52) };
      }
    } else if (guidance.kind === 'exit') {
      const exit = this.exits.find((candidate) => candidate.targetMap === guidance.exitTo);
      if (exit) {
        targetPosition = { x: exit.centerX, y: exit.centerY, markerY: exit.centerY };
      }
    }

    if (!targetPosition) {
      this.objectiveTargetPosition = undefined;
      this.objectiveMarkerTween?.remove();
      this.objectiveMarkerTween = undefined;
      this.objectiveMarker?.setVisible(false);
      this.objectiveEdgeArrow?.setVisible(false);
      return;
    }

    this.objectiveTargetPosition = { x: targetPosition.x, y: targetPosition.y };

    const marker = this.ensureObjectiveMarker();
    // Local objectives sit above their floating labels; exit objectives sit
    // over the gate rectangle's stored centre so routing matches Tiled.
    const baseY = targetPosition.markerY;
    this.objectiveMarkerTween?.remove();
    marker.setVisible(true).setPosition(targetPosition.x, baseY);
    this.objectiveMarkerTween = this.tweens.add({
      targets: marker,
      y: baseY - sy(6),
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private ensureObjectiveMarker(): Phaser.GameObjects.Graphics {
    if (this.objectiveMarker) return this.objectiveMarker;

    // A plain Graphics direct scene child (never a Container — see the
    // container-convention comment in drawTargetMarkers). Local design-space
    // geometry scaled once by GAME_SCALE, like the Mira guidance marker.
    const marker = this.add.graphics()
      .setName('objective-marker')
      .setScale(GAME_SCALE)
      .setDepth(6);
    marker.fillStyle(0xffd666, 1);
    marker.fillTriangle(-7, -6, 7, -6, 0, 4);
    marker.fillTriangle(-5, -14, 5, -14, 0, -7);
    marker.lineStyle(1.5, 0x1a1208, 0.9);
    marker.strokeTriangle(-7, -6, 7, -6, 0, 4);

    this.objectiveMarker = marker;
    return marker;
  }

  /**
   * Shows a screen-edge arrow pointing at the objective target while it is
   * outside the camera view; hidden when on-screen or with no objective.
   * Runs every frame from update() — pure position math, no allocations.
   */
  private updateObjectiveEdgeArrow(): void {
    const target = this.objectiveTargetPosition;
    if (!target) {
      this.objectiveEdgeArrow?.setVisible(false);
      return;
    }

    const view = this.cameras.main.worldView;
    if (view.contains(target.x, target.y)) {
      this.objectiveEdgeArrow?.setVisible(false);
      return;
    }

    const arrow = this.ensureObjectiveEdgeArrow();
    const screenX = target.x - view.x;
    const screenY = target.y - view.y;
    // Clamp inside the play area: below the HUD/objective banners on top,
    // clear of the hint bar on the bottom.
    const clampedX = Phaser.Math.Clamp(screenX, sx(24), GAME_WIDTH - sx(24));
    const clampedY = Phaser.Math.Clamp(screenY, sy(74), GAME_HEIGHT - sy(34));
    const angle = Math.atan2(screenY - clampedY, screenX - clampedX);
    arrow.setVisible(true).setPosition(clampedX, clampedY).setRotation(angle);
  }

  private ensureObjectiveEdgeArrow(): Phaser.GameObjects.Graphics {
    if (this.objectiveEdgeArrow) return this.objectiveEdgeArrow;

    // Drawn pointing right at rotation 0 so setRotation() aims it directly.
    const arrow = this.add.graphics()
      .setName('objective-edge-arrow')
      .setScrollFactor(0)
      .setScale(GAME_SCALE)
      .setDepth(22)
      .setVisible(false);
    arrow.fillStyle(0xffd666, 0.95);
    arrow.fillTriangle(10, 0, -6, -7, -6, 7);
    arrow.lineStyle(1.5, 0x1a1208, 0.9);
    arrow.strokeTriangle(10, 0, -6, -7, -6, 7);

    this.objectiveEdgeArrow = arrow;
    return arrow;
  }

  private updateHint(): void {
    const target = this.nearestTarget();
    this.hintText.setText(target ? `Action: ${this.hintLabel(target)}` : 'Explore. Learning bonuses are optional.');
  }

  private hintLabel(target: InteractionTarget): string {
    // The quest system may translate the raw label into a step hint; when it
    // passes the label through untouched, swap in the kid-friendly display
    // name so dev-style ids ("CropBonus") never reach the HUD.
    const questLabel = this.farmQuest.hintLabel(target.label);
    return questLabel === target.label ? this.targetDisplayName(target) : questLabel;
  }

  private createTouchControls(): void {
    this.createDynamicJoystick();

    // Stays clickable on every device (a mouse-accessible alternative to
    // Space/E is useful even on desktop), but only renders at full
    // prominence on touch-capable devices — on a keyboard/mouse session it
    // was previously showing at full opacity for no reason, cluttering the
    // most valuable screen corner.
    const isTouchDevice = this.sys.game.device.input.touch;
    const actionAlpha = isTouchDevice ? 0.82 : 0.25;

    const action = this.add.circle(GAME_WIDTH - sx(54), GAME_HEIGHT - sy(52), sx(34), 0x5f3d12, actionAlpha)
      .setStrokeStyle(3, 0xffd666, actionAlpha)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    const actionLabel = this.add.text(GAME_WIDTH - sx(54), GAME_HEIGHT - sy(52), 'ACTION', {
      fontFamily: 'system-ui',
      fontSize: fpx(10),
      color: '#ffd666'
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(isTouchDevice ? 1 : actionAlpha);

    action.on('pointerdown', () => this.handleActionInput());
    // Same squash-and-release as the panel buttons; silent here because
    // handleActionInput() already plays the contextual interaction sfx.
    installButtonPressFeedback(this, action, { playTapSound: false, alsoScale: [actionLabel] });
  }

  private createDynamicJoystick(): void {
    this.joystickBase = this.add.circle(0, 0, this.joystickRadius, 0x5f3d12, 0.5)
      .setStrokeStyle(3, 0xffd666, 0.75)
      .setScrollFactor(0)
      .setVisible(false);
    this.joystickKnob = this.add.circle(0, 0, sx(16), 0xffd666, 0.82)
      .setStrokeStyle(2, 0x2a1a08)
      .setScrollFactor(0)
      .setVisible(false);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startJoystick(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.updateJoystick(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.resetJoystick(pointer));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.resetJoystick(pointer));
  }

  private startJoystick(pointer: Phaser.Input.Pointer): void {
    if (this.busy || this.joystickPointer !== null || !this.isLowerLeftTouch(pointer)) {
      return;
    }

    this.joystickPointer = pointer;
    this.joystickOrigin = { x: pointer.x, y: pointer.y };
    this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
    // Knob "grabs" on touch-down: a small scale-up + full alpha, released in
    // resetJoystick — the same press feedback language as the buttons.
    this.joystickKnob.setPosition(pointer.x, pointer.y).setVisible(true).setScale(1.12).setAlpha(1);
    this.updateJoystick(pointer);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointer !== pointer) {
      return;
    }

    const dx = pointer.x - this.joystickOrigin.x;
    const dy = pointer.y - this.joystickOrigin.y;
    const distance = Math.hypot(dx, dy);
    const clampedDistance = Math.min(distance, this.joystickRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = this.joystickOrigin.x + Math.cos(angle) * clampedDistance;
    const knobY = this.joystickOrigin.y + Math.sin(angle) * clampedDistance;

    this.joystickKnob.setPosition(knobX, knobY);

    if (distance <= 0) {
      this.touchMove = { x: 0, y: 0 };
      return;
    }

    const inputStrength = clampedDistance / this.joystickRadius;
    this.touchMove = {
      x: Math.cos(angle) * inputStrength,
      y: Math.sin(angle) * inputStrength
    };
  }

  private resetJoystick(pointer?: Phaser.Input.Pointer): void {
    if (pointer && this.joystickPointer !== pointer) {
      return;
    }

    this.joystickPointer = null;
    this.touchMove = { x: 0, y: 0 };
    this.joystickBase?.setVisible(false);
    this.joystickKnob?.setVisible(false).setScale(1).setAlpha(0.82);
  }

  private isLowerLeftTouch(pointer: Phaser.Input.Pointer): boolean {
    return pointer.x <= GAME_WIDTH / 2 && pointer.y >= GAME_HEIGHT / 2;
  }

  private nearestTarget(): InteractionTarget | null {
    const px = this.player.x;
    const py = this.player.y;
    // Squared distances avoid a sqrt per target per frame (this runs every
    // frame via updateHint()); the ordering and threshold comparison are
    // identical to comparing real distances since both sides are non-negative.
    const rangeSquared = sx(42) ** 2;

    let best: InteractionTarget | null = null;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      const dSquared = Phaser.Math.Distance.Squared(px, py, target.x, target.y);
      if (dSquared < rangeSquared && dSquared < bestDistanceSquared) {
        best = target;
        bestDistanceSquared = dSquared;
      }
    }

    return best;
  }

  private handleActionInput(): void {
    if (this.dialogueBox?.isOpen()) {
      this.dialogueBox.advance();
      return;
    }
    if (this.heroPresentation.isHurtPlaying()) return;
    if (!this.tryInteract()) this.heroPresentation.playAction(this.busy);
  }

  // Interaction registry: maps a target's stable InteractionId to its handler.
  // Adding a future NPC/interactable means registering an entry here (and,
  // for a special sprite/marker, in drawTargetMarkers), not editing a chain
  // of label comparisons. 'generic-bonus' is the fallback every unmapped
  // target already used before this registry existed.
  private readonly interactionHandlers: Record<InteractionId, (target: InteractionTarget) => void> = {
    mira: (target) => this.handleMiraInteraction(target),
    'crop-bonus': (target) => this.handleCropBonusInteraction(target),
    'practice-slime': (target) => this.handleSlimeInteraction(target),
    'sprout-1': (target) => this.handleSproutInteraction(target),
    'sprout-2': (target) => this.handleSproutInteraction(target),
    'sprout-3': (target) => this.handleSproutInteraction(target),
    // Wildbloom Woods interactables are quest-free by design: the flower is
    // pure rotating flavor, and the stone is the woods' explicit opt-in
    // practice spot (same second-ACTION pattern as the post-purpose farm).
    'whispering-flower': () => this.showToast(this.nextFlavorLine('whispering-flower')),
    'mossy-stone': (target) => {
      if (this.tryConsumePracticeOffer(target)) return;
      this.showFlavorWithPracticeOffer(target, 'mossy-stone', 'exploration');
    },
    'baker-pell': () => this.handleBakerPellInteraction(),
    'village-notice-board': () => this.showToast(this.nextFlavorLine('village-notice-board')),
    'village-well': () => this.showToast(this.nextFlavorLine('village-well')),
    'generic-bonus': (target) => this.openBonusPrompt(target.kind, this.targetDisplayName(target))
  };

  private tryInteract(): boolean {
    if (this.busy) return false;

    const target = this.nearestTarget();
    if (!target) {
      this.showToast('Nothing to use here yet.');
      return false;
    }

    const handler = this.interactionHandlers[target.id];
    if (!handler) {
      // Defensive: ids are validated at target creation (makeTargets) and by
      // the committed-map unit validator, so this should never fire — but a
      // bad id must degrade to a toast, never crash interaction handling.
      this.showToast('Nothing to use here yet.');
      return false;
    }

    this.playSfx('sfx-interact', 0.3);
    handler(target);
    return true;
  }

  private playSfx(key: string, volume = 0.5, cooldownMs = this.sfxCooldownMs): void {
    // A short per-key cooldown keeps enthusiastic repeated taps (a common
    // pattern for young kids) from stacking overlapping copies of the same
    // one-shot sound into a buzz. The default (90ms) suits tap-driven SFX;
    // callers on a faster natural cadence (the typewriter blip fires every
    // ~48ms) pass a smaller cooldown so their intended rhythm is not swallowed.
    const now = this.time.now;
    if ((this.lastSfxAt[key] ?? -Infinity) + cooldownMs > now) return;
    this.lastSfxAt[key] = now;
    this.sound.play(key, { volume });
  }

  private setMusicVolume(volume: number): void {
    const sound = this.music as (Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound) | undefined;
    sound?.setVolume(volume);
  }

  private toggleAudioMute(): void {
    // Read the getter exactly once. Phaser's WebAudio `mute` getter reflects
    // a GainNode's value, and the setter schedules the change via
    // AudioParam.setValueAtTime — re-reading `this.sound.mute` right after
    // setting it can still return the pre-toggle value on the same tick.
    const nextMuted = !this.sound.mute;
    this.sound.mute = nextMuted;
    saveAudioMuted(nextMuted);
    this.paintSpeakerIcon(this.muteIcon, nextMuted);
  }

  /**
   * Returns the next flavor line for a post-purpose interactable, rotating
   * through data/flavor.ts's lines so repeats aren't identical.
   */
  private nextFlavorLine(key: keyof typeof POST_PURPOSE_FLAVOR): string {
    const lines = POST_PURPOSE_FLAVOR[key];
    const index = this.flavorRotation[key] ?? 0;
    this.flavorRotation[key] = (index + 1) % lines.length;
    return lines[index] ?? lines[0];
  }

  /**
   * If the target carries a live practice offer (a flavor toast ending in
   * PRACTICE_OFFER_SUFFIX was just shown for it), consume it and open the
   * optional prompt. The offer is the explicit player-chosen path to
   * practice after an interactable's quest purpose is fulfilled.
   */
  private tryConsumePracticeOffer(target: InteractionTarget): boolean {
    const offer = this.pendingPracticeOffer;
    if (!offer || offer.id !== target.id || this.time.now > offer.expiresAt) return false;

    this.pendingPracticeOffer = undefined;
    this.openBonusPrompt(offer.context, offer.label);
    return true;
  }

  /** Shows a post-purpose flavor toast and arms its practice offer window. */
  private showFlavorWithPracticeOffer(
    target: InteractionTarget,
    flavorKey: keyof typeof POST_PURPOSE_FLAVOR,
    context: BonusContext
  ): void {
    this.showToast(`${this.nextFlavorLine(flavorKey)} ${PRACTICE_OFFER_SUFFIX}`);
    this.pendingPracticeOffer = {
      id: target.id,
      context,
      label: this.targetDisplayName(target),
      expiresAt: this.time.now + PRACTICE_OFFER_WINDOW_MS
    };
  }

  private handleMiraInteraction(target: InteractionTarget): void {
    if (this.farmQuest.allErrandsComplete()) {
      if (this.tryConsumePracticeOffer(target)) {
        // Advance the rotation only when an offer is actually taken, so the
        // next opt-in reaches a different mastery context (combat first —
        // it replaces the retired Practice Slime as the combat-practice tap).
        this.miraPracticeContextIndex = (this.miraPracticeContextIndex + 1) % MIRA_PRACTICE_CONTEXTS.length;
        return;
      }
      const context = MIRA_PRACTICE_CONTEXTS[this.miraPracticeContextIndex] ?? 'quest';
      this.showFlavorWithPracticeOffer(target, 'mira', context);
      return;
    }

    this.applyQuestOutcome(this.farmQuest.interactWithMira(), true);
  }

  private handleBakerPellInteraction(): void {
    const step = this.questSystem.step(BERRY_ORDER_ID);
    const dialogue = BERRY_ORDER.dialogue;
    if (!dialogue) return;

    if (step === 'not-started') {
      this.openDialogue(dialogue.offer, () => {
        if (this.questSystem.step(BERRY_ORDER_ID) !== 'not-started') return;
        this.questSystem.setStep(BERRY_ORDER_ID, 'gathering');
        this.refreshObjective();
        this.save();
      });
      return;
    }

    if (step === 'gathering') {
      this.openDialogue(dialogue.reminder ?? dialogue.offer);
      return;
    }

    if (step === 'return-ready') {
      this.openDialogue(dialogue.return, () => {
        // Step first, then present/persist the reward. A second rapid ACTION
        // can only enter the complete/flavor branch and cannot grant twice.
        if (this.questSystem.step(BERRY_ORDER_ID) !== 'return-ready') return;
        this.questSystem.setStep(BERRY_ORDER_ID, 'complete');
        const item = BERRY_ORDER.rewards.item;
        this.applyQuestOutcome({
          stateChanged: true,
          objectiveChanged: true,
          reward: BERRY_ORDER.rewards,
          toast: item
            ? `Quest Complete: ${BERRY_ORDER.name}\nReceived: ${item.name}`
            : `Quest Complete: ${BERRY_ORDER.name}`
        }, true);
      });
      return;
    }

    this.showToast(this.nextFlavorLine('baker-pell'));
  }

  private openDialogue(lines: DialogueLine[], onClose?: () => void): void {
    if (!this.dialogueBox || this.dialogueBox.isOpen()) return;
    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);
    this.dialogueBox.open(lines, {
      autoRead: this.profileId === 'grade2-mage',
      onClose: () => {
        // DialogueBox owns Space/E while busy, so WorldScene never consumes
        // the same physical keydown through its update-loop JustDown checks.
        // Clear those pending edges before unlocking gameplay; keep isDown
        // intact so a held key cannot become a fresh press on key-repeat.
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
        Phaser.Input.Keyboard.JustDown(this.keys.E);
        this.busy = false;
        onClose?.();
      }
    });
  }

  private handleCropBonusInteraction(target: InteractionTarget): void {
    if (!this.farmQuest.cropPurposeFulfilled()) {
      this.busy = true;
      this.resetJoystick();
      this.player.setVelocity(0, 0);
      this.playCropBonusFeedback(target, () => {
        this.openBonusPrompt(target.kind, this.targetDisplayName(target), () => {
          const outcome = this.farmQuest.completeCropInteraction();
          this.applyQuestOutcome(outcome, false);
          return outcome.message;
        });
      });
      return;
    }

    if (this.questSystem.step(BERRY_ORDER_ID) === 'gathering'
      && this.questSystem.berriesCollected() < 3) {
      const count = this.questSystem.collectNextBerry();
      this.showFloatingReward(`Sunberry ${count}/3`, target.x, target.y - sy(26), '#ffd666');
      if (count === 3) {
        this.questSystem.setStep(BERRY_ORDER_ID, 'return-ready');
        this.showToast('Pell is waiting — back to the village!');
      }
      this.refreshObjective();
      this.save();
      return;
    }

    if (this.tryConsumePracticeOffer(target)) return;
    this.showFlavorWithPracticeOffer(target, 'crop', target.kind);
  }

  private handleSlimeInteraction(target: InteractionTarget): void {
    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);
    this.playPracticeSlimeFeedback('hop', () => {
      this.openBonusPrompt(target.kind, this.targetDisplayName(target), () => {
        const outcome = this.farmQuest.completeSlimeInteraction();
        this.applyQuestOutcome(outcome, false);
        return outcome.message;
      });
    });
  }

  /**
   * Gameplay authority for the Practice Slime's permanent defeat: records the
   * quest flag, persists it immediately (so a mid-prompt tab close still
   * sticks), removes the interaction target, and hides the base slime sprite.
   * Pip/encounter presentation cleanup stays with the encounter controller
   * (PolishedWorldScene calls its retire()).
   */
  private handlePracticeSlimeDefeat(): void {
    if (this.farmQuest.isPracticeSlimeDefeated()) return;

    this.farmQuest.markPracticeSlimeDefeated();
    this.targets = this.targets.filter((target) => target.id !== 'practice-slime');
    this.practiceSlimeSprite?.setVisible(false);
    // Retire the slime's affordance with it so the hidden sprite can no
    // longer pop or sparkle when the player crosses the clearing.
    this.affordances?.unregister('practice-slime');
    this.save();
    this.updateHint();
    // If the objective marker was floating over the slime (find-slime step),
    // hide it now rather than leaving it bouncing over an empty clearing
    // until the prompt-close quest advance re-runs refreshObjective().
    this.refreshObjective();
  }

  private handleSproutInteraction(target: InteractionTarget): void {
    // Post-purpose sprouts are pure flavor — no prompt and no opt-in
    // (Mira and the crop patch carry the practice offers).
    if (this.farmQuest.sproutPurposeFulfilled()) {
      this.showToast(this.nextFlavorLine('sprout'));
      return;
    }

    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);
    this.playCropBonusFeedback(target, () => {
      this.openBonusPrompt(target.kind, this.targetDisplayName(target), () => {
        const outcome = this.farmQuest.completeSproutInteraction(target.id);
        this.applyQuestOutcome(outcome, false);
        return outcome.message;
      });
    });
  }

  private setFirstQuestStep(step: StarterQuestStep): void {
    this.farmQuest.setFirstQuestStepForTest(step);
    this.refreshObjective();
    this.save();
  }

  private get firstQuestStep(): StarterQuestStep {
    return this.farmQuest.firstQuestStep;
  }

  private applyQuestOutcome(outcome: FarmQuestOutcome, persist: boolean): void {
    if (outcome.objectiveChanged) this.refreshObjective();

    let bigSparkles = false;
    let showSparkles = false;
    if (outcome.reward) {
      this.gold += outcome.reward.gold;
      this.showFloatingReward(`+${outcome.reward.gold} Gold`, this.player.x, this.player.y - sy(26), '#ffd666');
      if (outcome.reward.item) {
        const { key, name } = outcome.reward.item;
        this.inventory[key] = (this.inventory[key] ?? 0) + 1;
        // A keepsake charm is a bigger moment than a gold trickle, so it
        // gets its own emphasized pop-in text and a larger sparkle burst
        // rather than reusing the plain floating-text treatment.
        this.showFloatingReward(`Received: ${name}`, this.player.x, this.player.y - sy(46), '#d7ffb8', true);
        bigSparkles = true;
      }
      this.refreshHud();
      showSparkles = true;
      this.playSfx('sfx-quest-complete', 0.4);
    }

    if (outcome.foundItem) {
      this.showFloatingReward(`Found: ${outcome.foundItem}`, this.player.x, this.player.y - sy(26), '#d7ffb8');
      showSparkles = true;
    }

    // A quest-chapter narrative beat (e.g. Mira's opening "something old is
    // waking up" hook) has a toast but no reward yet — a small sparkle still
    // sells "something magical is happening" without implying an item/gold
    // reward was granted.
    if (!showSparkles && outcome.toast && outcome.objectiveChanged) showSparkles = true;

    if (showSparkles) this.createSparkleBurst(this.player.x, this.player.y - sy(14), bigSparkles);
    if (outcome.toast) this.showToast(outcome.toast);
    if (persist && (outcome.stateChanged || outcome.reward)) this.save();
  }

  previewPrompt(templateId: string): LearningPrompt {
    if (!import.meta.env.DEV && !window.__ELDORIA_E2E__) {
      throw new Error('Prompt preview is available only in development and tests.');
    }
    if (this.busy) throw new Error('Cannot preview a prompt while another interaction is open.');

    const prompt = this.learning.makePromptById(templateId);
    this.openBonusPrompt(prompt.context, 'Prompt Preview', undefined, prompt);
    return prompt;
  }

  triggerGrade2HurtForTest(): boolean {
    if (!import.meta.env.DEV && !window.__ELDORIA_E2E__) {
      throw new Error('Grade 2 hurt preview is available only in development and tests.');
    }

    return this.heroPresentation.playHurtForPreview(this.busy);
  }

  private openBonusPrompt(
    context: BonusContext,
    label: string,
    onClose?: PromptCloseHandler,
    previewPrompt?: LearningPrompt
  ): void {
    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);

    const isPreview = previewPrompt !== undefined;
    const prompt = previewPrompt ?? this.learning.makePrompt(context, this.mastery);
    const isAudioFirst = PROFILES[this.profileId].readingMode === 'audio-first';
    // NOT scaled via container: Phaser's hit-test for a Graphics object's
    // custom Geom.Rectangle interactive area does not account for an
    // ancestor container's scale (only its position), so every interactive
    // child below (read/skip/choice buttons) would silently stop responding
    // to clicks if this container carried a GAME_SCALE transform. Every
    // literal is doubled directly instead.
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(30);
    // Back.easeOut pop-in on the existing container (no wrapper). The
    // ancestor-scale hit-test caveat above only matters while the tween is
    // running: it settles at exactly scale 1 in 170ms, before a kid can
    // reach for a choice.
    popInContainer(this, panel, 1);
    const panelHeight = isAudioFirst ? sy(220) : sy(190);
    const titleY = isAudioFirst ? -sy(84) : -sy(72);
    const promptY = isAudioFirst ? -sy(52) : -sy(42);
    const choicesY = isAudioFirst ? sy(38) : sy(34);
    const skipY = isAudioFirst ? sy(94) : sy(82);

    // Fully opaque (not the previous 0.96 alpha): a slightly transparent
    // panel background let whatever world-space marker label happened to
    // sit behind it (e.g. "CropBonus") faintly ghost through.
    const bg = drawRoundedPanelBackground(this, 0, 0, sx(360), panelHeight, 0x2a1a08, 0xffd666, 10);
    panel.add(bg);

    panel.add(this.add.text(0, titleY, `${label}: optional learning bonus`, {
      fontFamily: 'system-ui',
      fontSize: fpx(14),
      color: '#ffd666'
    }).setOrigin(0.5));

    panel.add(this.add.text(0, promptY, prompt.text, {
      fontFamily: 'system-ui',
      fontSize: prompt.text.length > 55 ? fpx(13) : fpx(17),
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: sx(324) }
    }).setOrigin(0.5));

    if (isAudioFirst) {
      const readButton = drawRoundedButton(this, 0, -sy(12), sx(132), sy(28), 0x3a4f8f, 0x99c7ff, 12);
      const readText = this.add.text(0, -sy(12), 'READ ALOUD', {
        fontFamily: 'system-ui',
        fontSize: fpx(11),
        color: '#ffffff'
      }).setOrigin(0.5);

      readButton.on('pointerdown', () => this.readPromptAloud(label, prompt));
      panel.add(readButton);
      panel.add(readText);
    }

    // Local (0, skipY) instead of the previous screen-absolute position: as
    // panel children now, they're already carried by the panel's own
    // position, and destroying the panel below cleans them up too.
    const skipButton = drawRoundedButton(this, 0, skipY, sx(132), sy(28), 0x3a2208, 0xc9a66b, 12);
    const skipText = this.add.text(0, skipY, 'Skip bonus', {
      fontFamily: 'system-ui',
      fontSize: fpx(12),
      color: '#c9a66b'
    }).setOrigin(0.5);
    panel.add(skipButton);
    panel.add(skipText);
    const destroyPrompt = (): void => {
      panel.destroy();
    };

    prompt.choices.forEach((choice, index) => {
      const x = sx(-110 + index * 110);
      const choiceLabel = String(choice);
      const btn = drawRoundedButton(this, x, choicesY, sx(102), sy(46), 0x5f3d12, 0xffd666, 12);

      const txt = this.add.text(x, choicesY, choiceLabel, {
        fontFamily: 'system-ui',
        fontSize: choiceLabel.length > 12 ? fpx(9) : fpx(17),
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: sx(92) }
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        const result = this.learning.resolve(prompt, choice as AnswerValue);
        this.stopPromptReadAloud();
        destroyPrompt();

        if (isPreview) {
          this.busy = false;
          return;
        }

        if (result.correct) {
          this.applyReward(prompt);
        }

        this.mastery = MasterySystem.recordOutcome(
          this.mastery,
          prompt,
          result.correct ? 'correct' : 'wrong'
        );

        this.busy = false;
        const progressMessage = onClose?.({ answered: true, correct: result.correct });
        this.showToast(progressMessage ? `${result.message} ${progressMessage}` : result.message);
        this.save();
      });

      panel.add(btn);
      panel.add(txt);
    });

    skipButton.on('pointerdown', () => {
      this.stopPromptReadAloud();
      destroyPrompt();
      this.busy = false;
      if (isPreview) return;

      this.mastery = MasterySystem.recordOutcome(this.mastery, prompt, 'skipped');
      const progressMessage = onClose?.({ answered: false, correct: false });
      this.showToast(progressMessage ? `Skipped. ${progressMessage}` : 'Skipped. Adventure continues.');
      this.save();
    });
  }

  private readPromptAloud(label: string, prompt: LearningPrompt): void {
    if (!this.hasPromptReadAloudSupport()) {
      this.showToast('Read aloud is not available here.');
      return;
    }

    this.speech.speak(this.makeReadAloudText(label, prompt), this.speechHooks);
  }

  private stopPromptReadAloud(): void {
    this.speech.cancel();
  }

  private hasPromptReadAloudSupport(): boolean {
    return this.speech.supported();
  }

  private makeReadAloudText(label: string, prompt: LearningPrompt): string {
    const readablePrompt = (prompt.readAloudText ?? prompt.text)
      .replaceAll('−', ' minus ')
      .replaceAll('×', ' times ')
      .replace(/\s*=\s*\?/g, ' equals what?')
      .replace(/\s+/g, ' ')
      .trim();
    const choices = prompt.choices.map(String).join(', ');

    return `${label} optional learning bonus. ${readablePrompt}. Choices are: ${choices}. Tap the answer to try for a bonus.`;
  }

  private applyReward(prompt: LearningPrompt): void {
    const goldReward = REWARD_KIND_GOLD_VALUE[prompt.rewardKind];

    this.gold += goldReward;

    this.refreshHud();

    if (goldReward > 0) {
      this.showFloatingReward(`+${goldReward} Gold`, this.player.x, this.player.y - sy(26), '#ffd666');
      this.createSparkleBurst(this.player.x, this.player.y - sy(12));
      this.playSfx('sfx-reward', 0.45);
    }
  }

  private showFloatingReward(message: string, x: number, y: number, color: string, emphasize = false): void {
    const text = this.add.text(x, y, message, {
      fontFamily: 'system-ui',
      fontSize: emphasize ? fpx(15) : fpx(12),
      color,
      stroke: '#1a1208',
      strokeThickness: emphasize ? 8 : 6
    }).setOrigin(0.5).setDepth(20).setScale(emphasize ? 0.6 : 1);

    if (emphasize) {
      this.tweens.add({
        targets: text,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut'
      });
    }

    this.tweens.add({
      targets: text,
      y: y - (emphasize ? sy(30) : sy(22)),
      alpha: 0,
      delay: emphasize ? 120 : 0,
      duration: emphasize ? 1500 : 1200,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    });
  }

  private createSparkleBurst(x: number, y: number, big = false): void {
    const sparkleCount = big ? 14 : 8;
    const distanceX = big ? sx(34) : sx(22);
    const distanceY = big ? sy(26) : sy(16);
    const duration = big ? 680 : 520;
    const color = big ? 0xfff6cf : 0xfff0a3;
    const radius = big ? sx(3) : sx(2);
    for (let index = 0; index < sparkleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkleCount;
      const sparkle = this.add.circle(x, y, radius, color, 0.95).setDepth(19);
      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distanceX,
        y: y + Math.sin(angle) * distanceY,
        alpha: 0,
        scale: 0.2,
        duration,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private toggleStatsPanel(): void {
    if (this.statsPanelOpen) {
      this.closeStatsPanel();
    } else {
      if (this.busy) return;
      this.openStatsPanel();
    }
    this.playSfx('sfx-ui-tap', 0.35);
  }

  private openStatsPanel(): void {
    this.busy = true;
    this.statsPanelOpen = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);

    // Every child below uses purely local design-space numbers, so scaling
    // this one container reproduces the whole panel at GAME_SCALE.
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setScale(GAME_SCALE)
      .setDepth(100);
    this.statsContainer = panel;
    // Same Back.easeOut pop as the other panels, in place on the existing
    // container — the panel's resting scale is GAME_SCALE.
    popInContainer(this, panel, GAME_SCALE);

    const bg = drawRoundedPanelBackground(this, 0, 0, 380, 240, 0x1a1208, 0xffd666, 10);
    panel.add(bg);

    const title = this.add.text(0, -100, 'STATS & MASTERY', {
      fontFamily: 'system-ui',
      // Local design-space literal (not fpx()): this text is a child of
      // `panel`, which is already .setScale(GAME_SCALE) below, so its own
      // fontSize must stay in the same unscaled local space as every other
      // literal here (-100, -90, 380, 240, ...) — using fpx() would apply
      // GAME_SCALE twice if it ever changes.
      fontSize: '15px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);

    // A cool slate-blue divider (instead of the same brown/gold used
    // everywhere else) gives this "character sheet" screen a small visual
    // identity of its own, distinct from the warm gold chrome the HUD and
    // bonus-prompt panels share.
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x5a7a94);
    divider.lineBetween(0, -80, 0, 80);
    panel.add(divider);

    // --- LEFT COLUMN: PROFILE & KEEPSAKES ---
    const profile = PROFILES[this.profileId];
    const profileName = this.add.text(-90, -70, profile.label, {
      fontFamily: 'system-ui',
      // Local design-space literal: see the comment on the STATS & MASTERY
      // title above — this is also a child of the GAME_SCALE-scaled panel.
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(profileName);

    const profileDesc = this.add.text(-90, -50, profile.readingMode === 'audio-first' ? 'Grade 2 Mage' : 'Grade 5 Ranger Explorer', {
      fontFamily: 'system-ui',
      // Local design-space literal: same GAME_SCALE-scaled panel as above.
      fontSize: '10px',
      color: '#c9a66b'
    }).setOrigin(0.5);
    panel.add(profileDesc);

    const goldLabel = this.add.text(-90, -16, `Gold: ${this.gold}`, {
      fontFamily: 'system-ui',
      // Local design-space literal: same GAME_SCALE-scaled panel as above.
      fontSize: '12px',
      color: '#ffd666'
    }).setOrigin(0.5, 0.5);
    panel.add(goldLabel);
    panel.add(this.drawCoinIcon(-90 + goldLabel.displayWidth / 2 + 12, -16, 7));

    const keepsakeHeader = this.add.text(-90, 18, 'KEEPSAKES', {
      fontFamily: 'system-ui',
      // Local design-space literal: same GAME_SCALE-scaled panel as above.
      fontSize: '11px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(keepsakeHeader);

    // Renders one slot per known charm (CHARM_REGISTRY) instead of a single
    // hardcoded Sunberry Charm slot, so future charms show up here without
    // further panel changes.
    const slotSize = 32;
    const slotGap = 20;
    const slotsWidth = CHARM_REGISTRY.length * slotSize + (CHARM_REGISTRY.length - 1) * slotGap;
    const slotsStartX = -90 - slotsWidth / 2 + slotSize / 2;

    CHARM_REGISTRY.forEach((charm, index) => {
      const slotX = slotsStartX + index * (slotSize + slotGap);
      const slotBg = drawRoundedPanelBackground(this, slotX, 52, slotSize, slotSize, 0x2a1a08, 0x6f5126, 4);
      panel.add(slotBg);

      const hasCharm = (this.inventory[charm.key] ?? 0) > 0;
      if (hasCharm) {
        // Local design-space literal: same GAME_SCALE-scaled panel as above.
        const charmText = this.add.text(slotX, 52, charm.emoji, { fontSize: '16px' }).setOrigin(0.5);
        panel.add(charmText);
      }

      // A caption directly under each slot (rather than one caption shared
      // across every slot) so it's unambiguous which slot is empty and
      // which one holds which charm once more than one exists.
      const slotCaption = this.add.text(slotX, 52 + slotSize / 2 + 12, hasCharm ? charm.name : '(Empty)', {
        fontFamily: 'system-ui',
        // Local design-space literal: same GAME_SCALE-scaled panel as above.
        fontSize: '8px',
        color: hasCharm ? '#d7ffb8' : '#6f5126',
        align: 'center',
        wordWrap: { width: slotSize + slotGap, useAdvancedWrap: true }
      }).setOrigin(0.5, 0);
      panel.add(slotCaption);
    });

    // --- RIGHT COLUMN: CURRICULUM MASTERY ---
    const masteryHeader = this.add.text(90, -70, 'CURRICULUM MASTERY', {
      fontFamily: 'system-ui',
      // Local design-space literal: same GAME_SCALE-scaled panel as above.
      fontSize: '12px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(masteryHeader);

    const subjects = [
      { id: 'math', label: 'Math' },
      { id: 'ela', label: 'English (ELA)' },
      { id: 'science', label: 'Science' },
      { id: 'social', label: 'Social Studies' }
    ];

    subjects.forEach((subject, index) => {
      const yPos = -40 + index * 34;

      let correct = 0;
      let attempted = 0;
      for (const [key, record] of Object.entries(this.mastery)) {
        const parts = key.split(':');
        if (parts[1] === subject.id) {
          correct += record.correct;
          attempted += record.attempted;
        }
      }

      const percent = attempted > 0 ? (correct / attempted) : 0;

      const subLabel = this.add.text(90 - 70, yPos - 11, subject.label, {
        fontFamily: 'system-ui',
        // Local design-space literal: same GAME_SCALE-scaled panel as above.
        fontSize: '10px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      panel.add(subLabel);

      const subProgressText = this.add.text(90 + 70, yPos - 11, `${correct}/${attempted}`, {
        fontFamily: 'system-ui',
        // Local design-space literal: same GAME_SCALE-scaled panel as above.
        fontSize: '10px',
        color: '#c9a66b'
      }).setOrigin(1, 0.5);
      panel.add(subProgressText);

      const barBg = this.add.rectangle(90, yPos, 140, 8, 0x2a1a08)
        .setStrokeStyle(1, 0x6f5126)
        .setOrigin(0.5);
      panel.add(barBg);

      if (percent > 0) {
        const barFill = this.add.rectangle(90 - 70, yPos, 140 * percent, 8, 0x5e9f3a)
          .setOrigin(0, 0.5);
        panel.add(barFill);
      }
    });

    // --- CLOSE BUTTON ---
    // Button and label live together in their own unscaled, screen-space
    // container. Previously the depth-101 button was drawn in screen space
    // while its "CLOSE" label stayed a child of the depth-100 panel, which
    // hid the label under the button. Keeping both in one group fixes the
    // depth split by construction, keeps the button's hit area matched to
    // what is drawn, and lets the whole button pop in with the panel.
    const closeGroup = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 + sy(100))
      .setName(STATS_CLOSE_BUTTON_NAME)
      .setScrollFactor(0)
      .setDepth(101);
    this.statsCloseGroup = closeGroup;

    const closeButton = drawRoundedButton(this, 0, 0, sx(100), sy(24), 0x5f3d12, 0xffd666, 12);
    closeButton.on('pointerdown', () => this.closeStatsPanel());
    closeGroup.add(closeButton);

    const closeTxt = this.add.text(0, 0, 'CLOSE', {
      fontFamily: 'system-ui',
      fontSize: fpx(12),
      color: '#ffffff'
    }).setOrigin(0.5);
    closeGroup.add(closeTxt);
    popInContainer(this, closeGroup, 1);
  }

  private closeStatsPanel(): void {
    if (!this.statsPanelOpen) return;
    if (this.statsContainer) {
      this.statsContainer.destroy();
      this.statsContainer = undefined;
    }
    this.statsCloseGroup?.destroy();
    this.statsCloseGroup = undefined;
    this.statsPanelOpen = false;
    this.busy = false;
  }

  private showToast(message: string): void {
    const text = this.add.text(0, 0, message, {
      fontFamily: 'system-ui',
      // Local design-space literal (not fpx()): this text lives inside
      // `toast`, which is itself scaled by GAME_SCALE below, so its
      // fontSize — like its wordWrap width — must stay in the original
      // 480-wide design space. Using fpx() here would apply GAME_SCALE
      // twice if it ever changes.
      fontSize: '13px',
      color: '#ffffff',
      align: 'center',
      // LEGACY_GAME_WIDTH (not GAME_WIDTH): this text lives inside `toast`,
      // which is itself scaled by GAME_SCALE below, so its local layout math
      // stays in the original 480-wide design space.
      wordWrap: { width: LEGACY_GAME_WIDTH - 64 }
    }).setOrigin(0.5);

    const paddingX = 14;
    const paddingY = 8;
    const bg = drawRoundedPanelBackground(
      this, 0, 0, text.width + paddingX * 2, text.height + paddingY * 2, 0x2a1a08, 0xffd666, 8
    );

    // A rounded gold-bordered card (matching the panel/HUD chrome) instead
    // of a flat text-background box, with a quick pop-in so a quest or
    // reward notification reads as a small event rather than debug text.
    // Sits below the objective banner (which spans y 34-62) rather than
    // drifting up into it, since this toast fires most often in exactly
    // the moment the objective banner's text is also changing.
    const toast = this.add.container(GAME_WIDTH / 2, sy(80), [bg, text])
      .setScrollFactor(0)
      .setDepth(40)
      .setScale(GAME_SCALE * 0.85);

    this.tweens.add({
      targets: toast,
      scale: GAME_SCALE,
      duration: 160,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: toast,
      y: sy(70),
      alpha: 0,
      delay: 260,
      duration: 2000,
      ease: 'Sine.easeInOut',
      onComplete: () => toast.destroy()
    });
  }

  /**
   * Map entry banner: the map's display name fades in and out over ~1.5s on
   * every scene start, making transitions read as travel. The text object is
   * kept (hidden) after the fade so tests can locate it by name without
   * racing the tween.
   */
  private showMapEntryBanner(): void {
    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - sy(70), this.mapDef.displayName, {
      fontFamily: 'system-ui',
      fontSize: fpx(22),
      color: '#ffd666',
      fontStyle: 'bold',
      stroke: '#1a1208',
      strokeThickness: 8
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(35)
      .setName(MAP_ENTRY_BANNER_NAME)
      .setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          delay: 900,
          duration: 300,
          ease: 'Sine.easeIn',
          onComplete: () => banner.setVisible(false)
        });
      }
    });
  }

  private save(): void {
    const farmQuestSave = this.farmQuest.toSaveFields();
    const registryQuestSave = this.questSystem.toSaveFields();
    SaveSystem.save({
      version: CURRENT_SAVE_VERSION,
      profileId: this.profileId,
      gold: this.gold,
      inventory: this.inventory,
      mastery: this.mastery,
      // lastArea doubles as the persisted current-map id (old saves wrote
      // 'farm', which resolves unchanged; unknown values fall back to the
      // farm at load). The saved player position is already map-local, so it
      // doubles as the arrival placement on reload.
      lastArea: this.mapId,
      ...farmQuestSave,
      questSteps: registryQuestSave.questSteps,
      // Keep the legacy/Mira flags authoritative if engines ever grow an
      // overlapping key; registry flags may add data, never erase hers.
      questFlags: {
        ...registryQuestSave.questFlags,
        ...farmQuestSave.questFlags
      },
      player: {
        x: this.player.x,
        y: this.player.y
      }
    });
  }
}
