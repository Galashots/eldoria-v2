import Phaser from 'phaser';
import { fpx, GAME_HEIGHT, GAME_SCALE, GAME_WIDTH, sx, sy } from '../gameDimensions';
import { drawRoundedButton, drawRoundedPanelBackground, popInContainer } from './uiHelpers';

type DialogueLine = {
  speaker: string;
  text: string;
};

type SpeechLike = {
  cancel: () => void;
  speak: (text: string) => void;
};

const DIALOGUE_BOX_NAME = 'dialogue-box';
/** Pokemon/Zelda-convention reveal pacing (~24ms per character). */
const TYPEWRITER_MS_PER_CHAR = 24;

/**
 * Reusable bottom-screen dialogue box (M3 Living World). WORLD-space
 * behavior stays in the scene: this class only owns the panel, text,
 * read-aloud trigger, and input advancement, and it deliberately tolerates
 * scene restarts by destroying itself on Phaser's SHUTDOWN event.
 */
export class DialogueBox {
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
  private keyboardKey?: Phaser.Input.Keyboard.Key;
  private keyboardKeyE?: Phaser.Input.Keyboard.Key;
  private readonly speech: SpeechLike;

  constructor(
    private readonly scene: Phaser.Scene,
    speech: SpeechLike
  ) {
    this.speech = speech;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dismiss(false));
  }

  get isOpen(): boolean {
    return this.container !== undefined;
  }

  open(lines: readonly DialogueLine[], options: { autoRead?: boolean; onClose?: () => void } = {}): void {
    this.dismiss(false);
    this.lines = lines;
    this.lineIndex = 0;
    this.autoRead = options.autoRead === true;
    this.onClose = options.onClose;
    this.buildPanel();
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

  destroy(): void {
    this.dismiss(false);
  }

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
      0x1a140d,
      0xc9a66b,
      10
    );
    background.setInteractive(
      new Phaser.Geom.Rectangle(-halfWidth, -halfHeight, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    background.on('pointerdown', () => this.advance());
    container.add(background);

    const speakerBadge = drawRoundedPanelBackground(
      this.scene,
      -halfWidth + sx(46),
      -halfHeight,
      sx(76),
      sy(14),
      0x5f3d12,
      0xffd666,
      6
    );
    container.add(speakerBadge);

    this.speakerText = this.scene.add.text(-halfWidth + sx(46), -halfHeight, '', {
      fontFamily: 'system-ui',
      fontSize: fpx(9),
      color: '#ffd666',
      fontStyle: 'bold'
    }).setName('dialogue-speaker').setOrigin(0.5);
    container.add(this.speakerText);

    this.bodyText = this.scene.add.text(-halfWidth + sx(14), -halfHeight + sy(12), '', {
      fontFamily: 'system-ui',
      fontSize: fpx(11),
      color: '#fff3c9',
      lineSpacing: sy(4),
      wordWrap: { width: width - sx(40) }
    }).setName('dialogue-body');
    container.add(this.bodyText);

    const speakerButton = drawRoundedButton(
      this.scene,
      halfWidth - sx(18),
      -halfHeight + sy(14),
      sx(28),
      sy(22),
      0x2c4a3b,
      0xa9e783,
      7
    );
    speakerButton.on('pointerdown', () => this.speakCurrentLine());
    container.add(speakerButton);

    const speakerIcon = this.scene.add.graphics();
    this.paintSpeakerIcon(speakerIcon, halfWidth - sx(18), -halfHeight + sy(14));
    container.add(speakerIcon);

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

    this.container = container;
    this.bindKeyboard();
  }

  private bindKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    this.keyboardKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyboardKeyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyboardKey.on('down', () => this.advance());
    this.keyboardKeyE.on('down', () => this.advance());
  }

  private unbindKeyboard(): void {
    this.keyboardKey?.removeAllListeners();
    this.keyboardKeyE?.removeAllListeners();
    this.keyboardKey = undefined;
    this.keyboardKeyE = undefined;
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
   * Per-character reveal hook, kept for the planned read-aloud blip pass:
   * a future change plays a soft tick here as each glyph lands. Internal
   * only for now — deliberately unused outside this class.
   */
  protected onTypewriterCharacter(_char: string, _index: number): void {
    // Future read-aloud blip hook (intentionally a no-op today).
  }

  private speakCurrentLine(): void {
    const line = this.lines[this.lineIndex];
    if (!line) return;
    this.speech.cancel();
    this.speech.speak(`${line.speaker}. ${line.text}`);
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
    callback?.();
  }

  private paintSpeakerIcon(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.fillStyle(0xd7ffb8, 1);
    graphics.fillTriangle(x - 8 * GAME_SCALE / 2, y - 3 * GAME_SCALE, x - 5 * GAME_SCALE / 2, y, x - 8 * GAME_SCALE / 2, y + 3 * GAME_SCALE);
    graphics.fillRect(x - 5 * GAME_SCALE / 2, y - 2 * GAME_SCALE, 3 * GAME_SCALE, 4 * GAME_SCALE);
    graphics.lineStyle(2, 0xd7ffb8, 0.9);
    graphics.beginPath();
    graphics.arc(x + 1 * GAME_SCALE, y, 3 * GAME_SCALE, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55));
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(x + 2 * GAME_SCALE, y, 5 * GAME_SCALE, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45));
    graphics.strokePath();
  }
}
