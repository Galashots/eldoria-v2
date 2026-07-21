import Phaser from 'phaser';
import type { DialogueLine } from '../data/questDefs';
import { fpx, GAME_HEIGHT, GAME_SCALE, GAME_WIDTH, sx, sy } from '../gameDimensions';
import type { SpeechHooks, SpeechSupport } from '../systems/speech';
import { blipShouldPlay, computeBlipIndices } from '../systems/textBlips';
import { drawRoundedButton, drawRoundedPanelBackground, popInContainer } from './uiHelpers';

type DialogueOptions = {
  autoRead?: boolean;
  onClose?: () => void;
};

type DialogueBoxDependencies = {
  speech: SpeechSupport;
  speechHooks?: SpeechHooks;
  onSpeechUnavailable?: () => void;
  /**
   * Plays one soft dialogue tick. Injected (not called directly) so the owning
   * scene routes it through its per-key SFX cooldown + global mute. Absent =
   * blips disabled. See Council #115 D5.
   */
  playBlip?: () => void;
};

const DIALOGUE_BOX_NAME = 'dialogue-box';
/** Pokemon/Zelda-convention reveal pacing (~24ms per character). */
const TYPEWRITER_MS_PER_CHAR = 24;

/** Reusable, scene-owned dialogue presentation with no gameplay authority. */
export class DialogueBox {
  private readonly scene: Phaser.Scene;
  private readonly speech: SpeechSupport;
  private readonly speechHooks?: SpeechHooks;
  private readonly onSpeechUnavailable?: () => void;
  private readonly playBlip?: () => void;
  private blipIndices: ReadonlySet<number> = new Set();
  /** True while the current line is being TTS-voiced; suppresses blips. */
  private lineVoiced = false;
  private container?: Phaser.GameObjects.Container;
  private speakerText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private continueHint?: Phaser.GameObjects.Text;
  private continueHintBaseY = 0;
  private continueHintTween?: Phaser.Tweens.Tween;
  private typingTimer?: Phaser.Time.TimerEvent;
  private typingFullText = '';
  private typingIndex = 0;
  private lines: readonly DialogueLine[] = [];
  private lineIndex = 0;
  private autoRead = false;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene, dependencies: DialogueBoxDependencies) {
    this.scene = scene;
    this.speech = dependencies.speech;
    this.speechHooks = dependencies.speechHooks;
    this.onSpeechUnavailable = dependencies.onSpeechUnavailable;
    this.playBlip = dependencies.playBlip;
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown);
  }

  open(lines: DialogueLine[], opts: DialogueOptions = {}): void {
    if (lines.length === 0) {
      opts.onClose?.();
      return;
    }

    // Re-opening presentation must never finish the displaced gameplay beat.
    this.dismiss(false);
    this.lines = lines;
    this.lineIndex = 0;
    this.autoRead = opts.autoRead === true;
    this.onClose = opts.onClose;
    this.buildPanel();
    this.bindKeyboard();
    this.renderCurrentLine();
  }

  advance(): void {
    if (!this.container) return;
    // Mid-typewriter, the first ACTION completes the line instantly instead
    // of advancing (Pokemon/Zelda convention); the next press advances.
    if (this.isTyping()) {
      this.completeTyping();
      return;
    }
    this.speech.cancel();
    if (this.lineIndex >= this.lines.length - 1) {
      this.close();
      return;
    }

    this.lineIndex += 1;
    this.renderCurrentLine();
  }

  close(): void {
    this.dismiss(true);
  }

  isOpen(): boolean {
    return this.container !== undefined;
  }

  /** Scene-shutdown disposal intentionally never runs the gameplay callback. */
  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown);
    this.dismiss(false);
  }

  private readonly handleSceneShutdown = (): void => {
    this.dismiss(false);
  };

  private readonly handleKeyboardAdvance = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    event.preventDefault();
    event.stopPropagation();
    this.advance();
  };

  private buildPanel(): void {
    const width = GAME_WIDTH - sx(24);
    const height = sy(52);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT - sy(64))
      .setName(DIALOGUE_BOX_NAME)
      .setScrollFactor(0)
      .setDepth(41);
    // Same shallow pop-in as the toast/prompt/stats panels; settles at
    // exactly scale 1, so the background advance-area hit-test is only
    // ahead of the visual for the brief settle window.
    popInContainer(this.scene, container, 1);

    const background = drawRoundedPanelBackground(
      this.scene,
      0,
      0,
      width,
      height,
      0x2a1a08,
      0xffd666,
      10
    ).setScrollFactor(0).setInteractive(
      new Phaser.Geom.Rectangle(-halfWidth, -halfHeight, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    background.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
      this.advance();
    });
    container.add(background);

    this.speakerText = this.scene.add.text(-halfWidth + sx(12), -halfHeight + sy(7), '', {
      fontFamily: 'system-ui',
      fontSize: fpx(10),
      color: '#ffd666',
      fontStyle: 'bold'
    }).setName('dialogue-speaker').setOrigin(0, 0);
    container.add(this.speakerText);

    this.bodyText = this.scene.add.text(-halfWidth + sx(12), -sy(4), '', {
      fontFamily: 'system-ui',
      fontSize: fpx(12),
      color: '#ffffff',
      wordWrap: { width: width - sx(42) }
    }).setName('dialogue-body').setOrigin(0, 0.5);
    container.add(this.bodyText);

    // Shown (with a gentle bounce) only once the current line has fully
    // revealed — while the typewriter is mid-line it stays hidden so the
    // cue reads as "ready to continue", not just decoration.
    this.continueHint = this.scene.add.text(halfWidth - sx(12), halfHeight - sy(7), '▼ ACTION', {
      fontFamily: 'system-ui',
      fontSize: fpx(9),
      color: '#c9a66b'
    }).setName('dialogue-continue-hint').setOrigin(1, 1).setVisible(false);
    this.continueHintBaseY = this.continueHint.y;
    container.add(this.continueHint);

    const speakerButton = drawRoundedButton(
      this.scene,
      halfWidth - sx(18),
      -halfHeight + sy(14),
      sx(28),
      sy(22),
      0x3a4f8f,
      0x99c7ff,
      10
    ).setName('dialogue-read-button');
    speakerButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
      this.speakCurrentLine();
    });
    container.add(speakerButton);

    const speakerIcon = this.scene.add.graphics()
      .setPosition(halfWidth - sx(18), -halfHeight + sy(14))
      .setScale(GAME_SCALE);
    this.paintSpeakerIcon(speakerIcon);
    container.add(speakerIcon);

    this.container = container;
  }

  private bindKeyboard(): void {
    this.scene.input.keyboard?.on('keydown-SPACE', this.handleKeyboardAdvance);
    this.scene.input.keyboard?.on('keydown-E', this.handleKeyboardAdvance);
  }

  private unbindKeyboard(): void {
    this.scene.input.keyboard?.off('keydown-SPACE', this.handleKeyboardAdvance);
    this.scene.input.keyboard?.off('keydown-E', this.handleKeyboardAdvance);
  }

  private renderCurrentLine(): void {
    const line = this.lines[this.lineIndex];
    if (!line) return;
    this.speakerText?.setText(line.speaker);
    this.stopTyping();
    // Read-aloud fires once per line at open, exactly as before the
    // typewriter pass — TTS always reads the full line, never the partial
    // reveal.
    if (this.autoRead) this.speakCurrentLine();

    // Council #115 D5 coexistence: one voice per line. When the synthesizer is
    // actually voicing this line (Mage autoRead + speech available) the blips
    // suppress and the TTS is the voice; otherwise (Ranger reader-mode, or
    // autoRead with speech unavailable) the per-char blips carry the texture.
    this.lineVoiced = this.autoRead && this.speech.supported();
    this.blipIndices = this.playBlip ? computeBlipIndices(line.text) : new Set();

    this.typingFullText = line.text;
    this.typingIndex = 0;
    // e2e specs assert dialogue text through the canvas-text recorder /
    // getByName reads, which would race a per-character reveal — typing is
    // instant under the test flag so every spec observes full lines.
    if (window.__ELDORIA_E2E__) {
      this.completeTyping();
      return;
    }

    this.bodyText?.setText('');
    this.typingTimer = this.scene.time.addEvent({
      delay: TYPEWRITER_MS_PER_CHAR,
      repeat: Math.max(0, line.text.length - 1),
      callback: () => this.typeNextCharacter()
    });
  }

  private typeNextCharacter(): void {
    this.typingIndex += 1;
    const revealed = this.typingFullText.slice(0, this.typingIndex);
    this.bodyText?.setText(revealed);
    this.onTypewriterCharacter(this.typingFullText[this.typingIndex - 1] ?? '', this.typingIndex - 1);
    if (this.typingIndex >= this.typingFullText.length) {
      this.completeTyping();
    }
  }

  private isTyping(): boolean {
    return this.typingTimer !== undefined;
  }

  /** Reveals the full line immediately and shows the continue cue. */
  private completeTyping(): void {
    this.stopTyping();
    this.typingIndex = this.typingFullText.length;
    this.bodyText?.setText(this.typingFullText);
    this.showContinueHint();
  }

  private stopTyping(): void {
    this.typingTimer?.remove(false);
    this.typingTimer = undefined;
    this.hideContinueHint();
  }

  private showContinueHint(): void {
    const hint = this.continueHint;
    if (!hint) return;
    this.continueHintTween?.remove();
    hint.setVisible(true);
    this.continueHintTween = this.scene.tweens.add({
      targets: hint,
      y: hint.y - sy(2),
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private hideContinueHint(): void {
    this.continueHintTween?.remove();
    this.continueHintTween = undefined;
    if (this.continueHint) {
      // Reset the bounce offset so the next show starts from the base y.
      this.continueHint.setVisible(false).setY(this.continueHintBaseY);
    }
  }

  /**
   * Per-character reveal hook: plays a soft "voiced text" tick as each glyph
   * lands, unless the line is TTS-voiced (Council #115 D5). The emit set and
   * suppression are pure (`src/systems/textBlips.ts`); this only fires the
   * injected, cooldown-and-mute-gated player. Never reached under
   * `__ELDORIA_E2E__` — that path completes typing instantly, so no per-char
   * reveal (and no blip) occurs, keeping specs deterministic.
   */
  protected onTypewriterCharacter(_char: string, index: number): void {
    if (this.playBlip && blipShouldPlay(index, this.blipIndices, this.lineVoiced)) {
      this.playBlip();
    }
  }

  private speakCurrentLine(): void {
    const line = this.lines[this.lineIndex];
    if (!line) return;
    if (!this.speech.supported()) {
      this.onSpeechUnavailable?.();
      return;
    }
    this.speech.speak(line.readAloudText ?? line.text, this.speechHooks);
  }

  private dismiss(runOnClose: boolean): void {
    if (!this.container) return;

    const callback = runOnClose ? this.onClose : undefined;
    this.onClose = undefined;
    this.speech.cancel();
    this.unbindKeyboard();
    // Stop the scene-level typewriter timer before its Text target is
    // destroyed with the container.
    this.stopTyping();
    this.container.destroy();
    this.container = undefined;
    this.speakerText = undefined;
    this.bodyText = undefined;
    this.continueHint = undefined;
    this.typingFullText = '';
    this.typingIndex = 0;
    this.lines = [];
    this.lineIndex = 0;
    this.autoRead = false;
    this.lineVoiced = false;
    this.blipIndices = new Set();
    callback?.();
  }

  /** Same hand-painted speaker glyph used by the WorldScene audio control. */
  private paintSpeakerIcon(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0xffd666, 1);
    graphics.fillRect(-9, -3, 4, 6);
    graphics.fillTriangle(-5, -3, -5, 3, 1, -7);
    graphics.fillTriangle(-5, 3, 1, -7, 1, 7);
    graphics.lineStyle(1.5, 0xffd666, 1);
    graphics.beginPath();
    graphics.arc(1, 0, 4, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(40));
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(1, 0, 7, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35));
    graphics.strokePath();
  }
}
