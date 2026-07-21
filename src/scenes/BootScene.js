import Phaser from 'phaser';
import { LEVELS, TILESETS } from '../config';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load menu backgrounds & assets
    this.load.image('menu-bg', 'assets/images/menu_background_pixel.png');
    this.load.audio('select', ['assets/sounds/selectbutton.ogg', 'assets/sounds/selectbutton.mp3']);

    // Preload level data
    for (const level of LEVELS) {
      this.load.image(`preview-${level.id}`, level.preview);
      this.load.text(`map-raw-${level.id}`, level.map);
    }

    // Preload tileset images
    for (const tileset of TILESETS) {
      this.load.image(tileset.key, tileset.url);
    }

    // Preload game audio effects
    this.load.audio('menusound', ['assets/sounds/menusound.ogg', 'assets/sounds/menusound.mp3']);
    this.load.audio('spawn', ['assets/sounds/spawn.ogg', 'assets/sounds/spawn.mp3']);
    this.load.audio('jump', ['assets/sounds/jump.ogg', 'assets/sounds/jump.mp3']);
    this.load.audio('collect', ['assets/sounds/collectitem.ogg', 'assets/sounds/collectitem.mp3']);
    this.load.audio('hurt', ['assets/sounds/hurt_sound.mp3']);
    this.load.audio('die', ['assets/sounds/die.ogg', 'assets/sounds/die.mp3']);
    this.load.audio('checkpoint', ['assets/sounds/checkpoint.ogg', 'assets/sounds/checkpoint_sound.mp3']);
    this.load.audio('finish', ['assets/sounds/finish.ogg', 'assets/sounds/finish.mp3']);

    // Preload character spritesheets (Pink Man default)
    this.load.spritesheet('pink_man_idle', 'assets/Free/Main Characters/Pink Man/Idle (32x32).png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('pink_man_run', 'assets/Free/Main Characters/Pink Man/Run (32x32).png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('pink_man_jump', 'assets/Free/Main Characters/Pink Man/Jump (32x32).png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('pink_man_fall', 'assets/Free/Main Characters/Pink Man/Fall (32x32).png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('pink_man_hit', 'assets/Free/Main Characters/Pink Man/Hit (32x32).png', { frameWidth: 32, frameHeight: 32 });

    // Spawn / Despawn effect spritesheets (96x96)
    this.load.spritesheet('appearing', 'assets/Free/Main Characters/Appearing (96x96).png', { frameWidth: 96, frameHeight: 96 });
    this.load.spritesheet('disappearing', 'assets/Free/Main Characters/Desappearing (96x96).png', { frameWidth: 96, frameHeight: 96 });

    // Preload Checkpoints, Start, and End assets
    this.load.image('start-idle', 'assets/Free/Items/Checkpoints/Start/Start (Idle).png');
    this.load.spritesheet('start-moving', 'assets/Free/Items/Checkpoints/Start/Start (Moving) (64x64).png', { frameWidth: 64, frameHeight: 64 });

    this.load.image('checkpoint-no-flag', 'assets/Free/Items/Checkpoints/Checkpoint/Checkpoint (No Flag).png');
    this.load.spritesheet('checkpoint-flag-out', 'assets/Free/Items/Checkpoints/Checkpoint/Checkpoint (Flag Out) (64x64).png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('checkpoint-flag-idle', 'assets/Free/Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)(64x64).png', { frameWidth: 64, frameHeight: 64 });

    this.load.image('end-idle', 'assets/Free/Items/Checkpoints/End/End (Idle).png');
    this.load.spritesheet('end-pressed', 'assets/Free/Items/Checkpoints/End/End (Pressed) (64x64).png', { frameWidth: 64, frameHeight: 64 });

    // Preload fruits (32x32)
    this.load.spritesheet('apple', 'assets/Free/Items/Fruits/Apple.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fruit-collected', 'assets/Free/Items/Fruits/Collected.png', { frameWidth: 32, frameHeight: 32 });

    // Preload Mushroom enemy (32x32)
    this.load.spritesheet('mushroom-idle', 'assets/Free/Main Characters/Mushroom/idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('mushroom-walk', 'assets/Free/Main Characters/Mushroom/walking.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('mushroom-dead', 'assets/Free/Main Characters/Mushroom/dead.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    this.scene.start('MenuScene');
  }
}
