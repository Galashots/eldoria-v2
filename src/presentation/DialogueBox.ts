import Phaser from 'phaser';
import type { DialogueLine } from '../data/questDefs';
import { fpx, GAME_HEIGHT, GAME_SCALE, GAME_WIDTH, sx, sy } from '../gameDimensions';
import type { SpeechHooks, SpeechSupport } from '../systems/speech';
import { drawRoundedButton, drawRoundedPanelBackground } from './uiHelpers';

type DialogueOptions = {
  autoRead?: boolean;
  onClose?: () => void;
};

type DialogueBoxDependencies = {
  speech: SpeechSupport;
  speechHooks?: SpeechHooks;
  onSpeechUnavailable?: () => void;
};

const DIALOGUE_BOX_NAME = 'dialogue-box';

/** Reusable, scene-owned dialogue presentation with no gameplay authority. */
export class DialogueBox {
  private readonly scene: Phaser.Scene;
  private readonly speech: SpeechSupport;
  private readonly speechHooks?: SpeechHooks;
  private readonly onSpeechUnavailable?: () => void;
  private container?: Phaser.GameObjects.Container;
  private speakerText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private lines: readonly DialogueLine[] = [];
  private lineIndex = 0;
  private autoRead = false;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene, dependencies: DialogueBoxDependencies) {
    this.scene = scene;
    this.speech = dependencies.speech;
    this.speechHooks = dependencies.speechHooks;
    this.onSpeechUnavailable = dependencies.onSpeechUnavailable;
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

    const continueHint = this.scene.add.text(halfWidth - sx(12), halfHeight - sy(7), '▼ ACTION', {
      fontFamily: 'system-ui',
      fontSize: fpx(9),
      color: '#c9a66b'
    }).setName('dialogue-continue-hint').setOrigin(1, 1);
    container.add(continueHint);

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
    this.bodyText?.setText(line.text);
    if (this.autoRead) this.speakCurrentLine();
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
    this.container.destroy();
    this.container = undefined;
    this.speakerText = undefined;
    this.bodyText = undefined;
    this.lines = [];
    this.lineIndex = 0;
    this.autoRead = false;
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
