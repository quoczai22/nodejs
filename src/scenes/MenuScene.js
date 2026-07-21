import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config';
import soundManager from '../systems/SoundManager';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.selectedIndex = 0;
    this.cards = [];
  }

  create() {
    // Play Menu music
    soundManager.playMenuMusic(this, 0.45);

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'menu-bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setAlpha(0.72);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111620, 0.38);

    this.add.text(GAME_WIDTH / 2, 58, 'MARIO REMAKE', {
      fontFamily: 'monospace',
      fontSize: '44px',
      color: '#ffd84d',
      stroke: '#2d1a10',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 108, 'Chon man choi', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#dcfff4',
    }).setOrigin(0.5);

    this.createLevelCards();
    this.createInput();
    this.updateSelection();
  }

  createLevelCards() {
    const cardWidth = 240;
    const cardHeight = 156;
    const gap = 34;
    const rowY = [235, 420];

    this.cards = [];

    LEVELS.forEach((level, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const rowCount = LEVELS.slice(row * 3, row * 3 + 3).length;
      const rowWidth = rowCount * cardWidth + (rowCount - 1) * gap;
      const startX = GAME_WIDTH / 2 - rowWidth / 2 + cardWidth / 2;
      const x = startX + col * (cardWidth + gap);
      const y = rowY[row];

      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x1d2430, 0.92);
      const border = this.add.rectangle(0, 0, cardWidth, cardHeight);
      border.setStrokeStyle(3, 0xd7e1e8);

      const preview = this.add.image(0, -32, `preview-${level.id}`);
      preview.setDisplaySize(194, 82);

      const title = this.add.text(0, 34, level.title, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#d8fff2',
      }).setOrigin(0.5);

      const subtitle = this.add.text(0, 66, level.subtitle, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      }).setOrigin(0.5);

      container.add([bg, border, preview, title, subtitle]);
      container.setSize(cardWidth, cardHeight);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        this.selectedIndex = index;
        this.playSelectSound();
        this.startSelectedLevel();
      });

      this.cards.push({ container, border, title });
    });
  }

  createInput() {
    this.input.keyboard.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard.on('keydown-A', () => this.moveSelection(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard.on('keydown-D', () => this.moveSelection(1));
    this.input.keyboard.on('keydown-UP', () => this.moveSelection(-3));
    this.input.keyboard.on('keydown-W', () => this.moveSelection(-3));
    this.input.keyboard.on('keydown-DOWN', () => this.moveSelection(3));
    this.input.keyboard.on('keydown-S', () => this.moveSelection(3));
    this.input.keyboard.on('keydown-ENTER', () => this.startSelectedLevel());

    this.add.text(GAME_WIDTH / 2, 564, 'A/D hoac mui ten de chon | ENTER de choi', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  moveSelection(delta) {
    const next = Phaser.Math.Clamp(this.selectedIndex + delta, 0, LEVELS.length - 1);
    if (next === this.selectedIndex) return;
    this.selectedIndex = next;
    this.playSelectSound();
    this.updateSelection();
  }

  updateSelection() {
    this.cards.forEach((card, index) => {
      const selected = index === this.selectedIndex;
      card.border.setStrokeStyle(selected ? 5 : 3, selected ? 0xff5b48 : 0xd7e1e8);
      card.title.setColor(selected ? '#ffd84d' : '#d8fff2');

      this.tweens.killTweensOf(card.container);
      this.tweens.add({
        targets: card.container,
        scale: selected ? 1.08 : 1,
        duration: 140,
        ease: 'Sine.easeOut',
      });
    });
  }

  playSelectSound() {
    soundManager.playEffect(this, 'select', 0.55);
  }

  startSelectedLevel() {
    soundManager.stopMenuMusic();
    soundManager.playEffect(this, 'select', 0.55);
    this.scene.start('GameScene', LEVELS[this.selectedIndex]);
  }
}
