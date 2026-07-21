import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILESETS, LEVELS } from '../config';
import soundManager from '../systems/SoundManager';
import Player from '../entities/Player';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.soundManager = soundManager;
  }

  create(level) {
    this.level = level;
    this.respawnX = undefined;
    this.respawnY = undefined;
    this.cameras.main.setBackgroundColor('#161b24');

    this.add.text(24, 18, `Dang mo ${level.title}`, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffd84d',
    }).setScrollFactor(0).setDepth(100);

    this.fpsText = this.add.text(GAME_WIDTH - 120, 18, 'FPS: --', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#33ff33',
    }).setScrollFactor(0).setDepth(1000);

    const rawMap = this.cache.text.get(`map-raw-${level.id}`)?.trim() ?? '';
    if (!this.isJsonMap(rawMap)) {
      this.showMapExportWarning(level, rawMap);
      this.createTouchControls();
      return;
    }

    this.load.tilemapTiledJSON(`map-${level.id}`, level.map);
    this.load.once('complete', () => {
      try {
        this.createCheckpointAnims();
        this.createTilemap(level);
      } catch (err) {
        console.error(err);
        this.add.text(50, 100, `ERROR: ${err.message}\n${err.stack}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ff3333',
          backgroundColor: '#111111',
          padding: { x: 10, y: 10 },
          wordWrap: { width: 900 }
        }).setScrollFactor(0).setDepth(9999);
      }
    });
    this.load.start();
  }

  isJsonMap(rawMap) {
    if (!rawMap.startsWith('{')) return false;
    try {
      JSON.parse(rawMap);
      return true;
    } catch {
      return false;
    }
  }

  showMapExportWarning(level, rawMap) {
    const detected = rawMap.startsWith('<?xml') || rawMap.startsWith('<map')
      ? 'Hien tai file nay van la TMX/XML du bi dat duoi .json.'
      : 'File map chua phai JSON hop le.';

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 780, 260, 0x202936, 0.95)
      .setStrokeStyle(3, 0xff5b48)
      .setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 245, `${level.title} chua load duoc`, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffdf63',
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 318, [
      detected,
      'Mo Tiled -> File -> Export As -> JSON map files (*.json).',
      `Luu de len: public/assets/maps/Map${level.id}.tmj`,
      'Sau do refresh lai trinh duyet.',
    ], {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0);

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  createTilemap(level) {
    const map = this.make.tilemap({ key: `map-${level.id}` });
    this.map = map;

    // Load tilesets dynamically (handling image collection paths like '../../../../gamemario/Free/Traps/Platforms/Brown Off.png')
    const tilesets = map.tilesets.map(mapTileset => {
      const matchingConfig = TILESETS.find(configTileset => {
        const fileName = mapTileset.name.split('/').pop().split('\\').pop().toLowerCase();
        const configLower = configTileset.name.toLowerCase();
        return fileName === configLower || 
               fileName === configLower + '.png';
      });

      if (matchingConfig) {
        return map.addTilesetImage(mapTileset.name, matchingConfig.key);
      }
      return null;
    }).filter(Boolean);

    const scale = 1.5;

    // Render layers and scale them by 1.5
    this.backgroundLayer = map.getLayer('Background') ? map.createLayer('Background', tilesets, 0, 0).setScale(scale) : null;
    this.boundaryLayer = map.getLayer('Boundary Walls') ? map.createLayer('Boundary Walls', tilesets, 0, 0).setScale(scale) : null;
    this.solidLayer = map.getLayer('Solid Floating Platforms') ? map.createLayer('Solid Floating Platforms', tilesets, 0, 0).setScale(scale) : null;
    this.groundLayer = map.getLayer('Ground') ? map.createLayer('Ground', tilesets, 0, 0).setScale(scale) : null;
    this.hazardsLayer = map.getLayer('Hazards') ? map.createLayer('Hazards', tilesets, 0, 0).setScale(scale) : null;

    // Setup map bounds
    const worldWidth = (map.widthInPixels || GAME_WIDTH) * scale;
    const worldHeight = (map.heightInPixels || GAME_HEIGHT) * scale;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.physics.world.checkCollision.down = false;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    // Get spawning points from Start object layer
    const startLayer = map.getObjectLayer('Start');
    let spawnX = 150;
    let spawnY = 450;
    if (startLayer && startLayer.objects.length > 0) {
      const startObj = startLayer.objects[0];
      const w = startObj.width || 64;
      const h = startObj.height || 64;
      // Object coordinates in Tiled are bottom-left by default for tile objects.
      // So center is offset accordingly and scaled by 1.5.
      spawnX = (startObj.x + w / 2) * scale;
      spawnY = (startObj.y - h / 2) * scale;
    }

    // Instantiate modular player class
    this.player = new Player(this, spawnX, spawnY);

    // Create moving platforms
    this.createMovingPlatforms(map);
    this.worldStepListener = (postStepDelta) => {
      this.updateMovingPlatforms(undefined, postStepDelta * 1000);
    };
    this.physics.world.on('worldstep', this.worldStepListener, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.physics.world.off('worldstep', this.worldStepListener, this);
    });

    // Camera follow player (X axis only, matching Python Arcade viewport behavior)
    this.cameras.main.startFollow(this.player, true, 0.12, 0);
    this.cameras.main.scrollY = 0;

    // Setup collisions with ground, walls, and platforms
    if (this.groundLayer) {
      this.groundLayer.setCollisionByExclusion([-1]);
      this.physics.add.collider(this.player, this.groundLayer);
    }
    if (this.boundaryLayer) {
      this.boundaryLayer.setCollisionByExclusion([-1]);
      this.physics.add.collider(this.player, this.boundaryLayer);
    }
    if (this.solidLayer) {
      this.solidLayer.setCollisionByExclusion([-1]);
      this.physics.add.collider(this.player, this.solidLayer);
    }

    // Setup overlap detection with hazards (precise collision for spikes)
    if (this.hazardsLayer) {
      this.hazardsLayer.setCollisionByExclusion([-1]);
      this.physics.add.overlap(this.player, this.hazardsLayer, (player, tile) => {
        if (tile && tile.index !== -1) {
          const tileTop = tile.pixelY * 1.5;
          const penetrationDepth = player.body.bottom - tileTop;
          if (penetrationDepth > 8) {
            player.hurt();
          }
        }
      });
    }

    // Render tilemap debug graphics to visualize collision boxes
    if (this.physics.config.debug) {
      const debugGraphics = this.add.graphics().setAlpha(0.5).setDepth(2000);
      if (this.solidLayer) {
        this.solidLayer.renderDebug(debugGraphics, {
          tileColor: null,
          collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
          faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        });
      }
      if (this.groundLayer) {
        this.groundLayer.renderDebug(debugGraphics, {
          tileColor: null,
          collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
          faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        });
      }
      if (this.boundaryLayer) {
        this.boundaryLayer.renderDebug(debugGraphics, {
          tileColor: null,
          collidingTileColor: new Phaser.Display.Color(0, 255, 255, 255), // Cyan color for boundary walls
          faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        });
      }
    }

    // Create interactive objects (Start, End, Checkpoints)
    this.createInteractiveObjects(map);

    // Spawn fruits with the same random-style distribution used in the Python version
    this.createFruitItems(map);

    // Initialize keyboards
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE,ESC');

    this.createTouchControls();
  }

  createTouchControls() {
    this.touchState = { left: false, right: false, jump: false };

    this.touchButtons = [];

    const resetTouchState = () => {
      this.touchState.left = false;
      this.touchState.right = false;
      this.touchState.jump = false;

      this.touchButtons.forEach((button) => {
        button.activePointerId = null;
      });
    };

    this.resetTouchState = resetTouchState;

    // Mobile touch controls overlay
    this.addButton(78, 515, '<', () => {
      this.touchState.left = true;
      this.touchState.right = false;
    }, () => { this.touchState.left = false; }, 66, 'left');
    this.addButton(162, 515, '>', () => {
      this.touchState.right = true;
      this.touchState.left = false;
    }, () => { this.touchState.right = false; }, 66, 'right');
    this.addButton(850, 515, 'JUMP', () => { this.touchState.jump = true; }, () => { this.touchState.jump = false; }, 130, 'jump');

    // Throw placeholder effect button
    this.addButton(710, 515, 'THROW', () => {
      soundManager.playEffect(this, 'throw', 0.72);
    }, null, 90, 'throw');

    // Return to Menu Scene pause button
    this.addButton(940, 36, 'ESC', () => {
      this.scene.start('MenuScene');
    }, null, 66, 'esc');

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));

    this.input.on('pointerup', resetTouchState);
    this.input.on('pointercancel', resetTouchState);
    this.game.events.on('blur', resetTouchState);
    this.events.on('shutdown', resetTouchState);
  }

  addButton(x, y, label, down, up, width = 66, touchKey = null) {
    const button = this.add.container(x, y).setScrollFactor(0).setDepth(1000);
    button.activePointerId = null;
    const bg = this.add.rectangle(0, 0, width, 58, 0x222c39, 0.72)
      .setStrokeStyle(2, 0xffffff, 0.8);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: label.length > 1 ? '18px' : '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(width, 58);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', (pointer) => {
      button.activePointerId = pointer.id;

      if (touchKey === 'left') {
        this.touchState.right = false;
        const rightButton = this.touchButtons.find((candidate) => candidate.touchKey === 'right');
        if (rightButton) {
          rightButton.activePointerId = null;
        }
      } else if (touchKey === 'right') {
        this.touchState.left = false;
        const leftButton = this.touchButtons.find((candidate) => candidate.touchKey === 'left');
        if (leftButton) {
          leftButton.activePointerId = null;
        }
      }

      down(pointer);
    });
    if (up) {
      const release = (pointer) => {
        if (button.activePointerId !== pointer.id) {
          return;
        }

        button.activePointerId = null;
        up(pointer);
      };

      button.on('pointerup', release);
      button.on('pointerout', release);
      button.on('pointerupoutside', release);
      button.on('pointercancel', release);
    }

    button.touchKey = touchKey;
    this.touchButtons.push(button);
  }

  respawnPlayer() {
    let spawnX = this.respawnX;
    let spawnY = this.respawnY;

    if (spawnX === undefined || spawnY === undefined) {
      const startLayer = this.map.getObjectLayer('Start');
      spawnX = 150;
      spawnY = 450;
      if (startLayer && startLayer.objects.length > 0) {
        const startObj = startLayer.objects[0];
        const w = startObj.width || 64;
        const h = startObj.height || 64;
        spawnX = (startObj.x + w / 2) * 1.5;
        spawnY = (startObj.y - h / 2) * 1.5;
      }
    }

    if (this.player) {
      this.player.setPosition(spawnX, spawnY);
      this.player.isDying = false;
      this.player.isBig = false;
      this.player.setScale(this.player.normalScale);
      this.player.playAppear();
    }
  }

  createMovingPlatforms(map) {
    this.movingPlatforms = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.parseMovingPlatformsFromLayer(map, 'Moving_Platforms');
    this.parseMovingPlatformsFromLayer(map, 'Elevator_Platforms');
    this.parseMovingPlatformsFromLayer(map, 'Elevator_Platfroms');

    this.physics.add.collider(this.player, this.movingPlatforms, (player, platform) => {
      if (player.body.touching.down && platform.body.touching.up) {
        player.ridingPlatform = platform;
      }
    });
  }

  parseMovingPlatformsFromLayer(map, layerName) {
    const movingLayer = map.getLayer(layerName);
    if (!movingLayer) return;

    const tileWidth = (map.tileWidth || 16) * 1.5;
    const tileHeight = (map.tileHeight || 16) * 1.5;
    const scale = 1.5;

    const resolveBoundaryValue = (value, tileSize) => {
      if (Math.abs(value) <= map.width + map.height) {
        return value * tileSize + tileSize / 2;
      }
      return value * scale;
    };

    const getTilesetForTile = (tileIndex) => {
      let matched = null;
      for (const ts of map.tilesets) {
        if (tileIndex >= ts.firstgid) {
          if (!matched || ts.firstgid > matched.firstgid) {
            matched = ts;
          }
        }
      }
      return matched;
    };

    // Load raw map data to extract custom properties bypassing Phaser's tileset parser bugs
    const rawMapText = this.cache.text.get(`map-raw-${this.level.id}`);
    const rawMapData = rawMapText ? JSON.parse(rawMapText) : null;

    const getPropertiesFromRawMap = (gid) => {
      if (!rawMapData || !rawMapData.tilesets) return {};
      let matched = null;
      for (const ts of rawMapData.tilesets) {
        if (gid >= ts.firstgid) {
          if (!matched || ts.firstgid > matched.firstgid) {
            matched = ts;
          }
        }
      }
      if (!matched) return {};
      const localId = gid - matched.firstgid;
      if (matched.tiles) {
        const tileData = matched.tiles.find(t => t.id === localId);
        if (tileData && tileData.properties) {
          const props = {};
          tileData.properties.forEach(p => {
            props[p.name] = p.value;
          });
          return props;
        }
      }
      return {};
    };

    const width = map.width;
    const height = map.height;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const tile = map.getTileAt(x, y, true, layerName);
        if (tile && tile.index !== -1) {
          const tileset = getTilesetForTile(tile.index);
          const props = getPropertiesFromRawMap(tile.index);

          const changeX = props.change_x;
          const changeY = props.change_y;
          const boundaryLeft = props.boundary_left;
          const boundaryRight = props.boundary_right;
          const boundaryBottom = props.boundary_bottom;
          const boundaryTop = props.boundary_top;

          if (changeX === undefined && changeY === undefined) continue;

          const tilesetName = tileset ? tileset.name : '';
          const tilesetConfig = TILESETS.find(config => {
            const fileName = tilesetName.split('/').pop().split('\\').pop().toLowerCase();
            const configLower = config.name.toLowerCase();
            return fileName === configLower || 
                   fileName === configLower + '.png';
          });
          const textureKey = tilesetConfig ? tilesetConfig.key : 'tiles-brown-platform';

          const centerX = (tile.pixelX + tile.width / 2) * scale;
          const centerY = (tile.pixelY + tile.height / 2) * scale;

          map.removeTileAt(x, y, false, false, layerName);

          const platform = this.movingPlatforms.create(centerX, centerY, textureKey);
          platform.setScale(scale);
          platform.body.setAllowGravity(false);
          platform.body.setImmovable(true);
          if (platform.body.setPushable) {
            platform.body.setPushable(false);
          }
          platform.body.setSize(platform.width * 0.8, platform.height);
          platform.body.setOffset(platform.width * 0.1, 0);

          platform.floatX = centerX;
          platform.floatY = centerY;
          platform.speedX = changeX !== undefined ? changeX * 60 : 0;
          platform.speedY = changeY !== undefined ? changeY * 60 : 0;
          platform.changeX = changeX !== undefined ? changeX : 0;
          platform.changeY = changeY !== undefined ? changeY : 0;

          platform.boundaryLeft = boundaryLeft !== undefined ? resolveBoundaryValue(boundaryLeft, tileWidth) : centerX;
          platform.boundaryRight = boundaryRight !== undefined ? resolveBoundaryValue(boundaryRight, tileWidth) : centerX;
          platform.boundaryBottom = boundaryBottom !== undefined ? resolveBoundaryValue(boundaryBottom, tileHeight) : centerY;
          platform.boundaryTop = boundaryTop !== undefined ? resolveBoundaryValue(boundaryTop, tileHeight) : centerY;

          platform.deltaX = 0;
          platform.deltaY = 0;
        }
      }
    }
  }

  updateMovingPlatforms(time, delta) {
    if (!this.movingPlatforms) return;

    if (delta === undefined && time !== undefined) {
      delta = time;
    }
    const dt = (delta !== undefined) ? delta / 1000 : 1 / 60;

    this.movingPlatforms.getChildren().forEach(platform => {
      const oldX = platform.x;
      const oldY = platform.y;

      platform.floatX += platform.speedX * dt;
      platform.floatY += platform.speedY * dt;

      // Clamp + flip speed on boundaries matching Python coordinates:
      if (platform.speedX > 0 && platform.floatX >= platform.boundaryRight) {
        platform.floatX = platform.boundaryRight;
        platform.speedX *= -1;
        platform.changeX *= -1;
      } else if (platform.speedX < 0 && platform.floatX <= platform.boundaryLeft) {
        platform.floatX = platform.boundaryLeft;
        platform.speedX *= -1;
        platform.changeX *= -1;
      }

      if (platform.speedY > 0 && platform.floatY >= platform.boundaryTop) {
        platform.floatY = platform.boundaryTop;
        platform.speedY *= -1;
        platform.changeY *= -1;
      } else if (platform.speedY < 0 && platform.floatY <= platform.boundaryBottom) {
        platform.floatY = platform.boundaryBottom;
        platform.speedY *= -1;
        platform.changeY *= -1;
      }

      platform.x = Math.round(platform.floatX);
      platform.y = Math.round(platform.floatY);
      platform.body.updateFromGameObject();

      platform.deltaX = platform.x - oldX;
      platform.deltaY = platform.y - oldY;

      if (this.player && this.player.ridingPlatform === platform) {
        if (platform.deltaX !== 0) {
          this.player.x += platform.deltaX;
          this.player.body.position.x += platform.deltaX;
        }
        if (platform.deltaY !== 0) {
          let canMoveY = true;
          if (platform.deltaY < 0 && (this.player.body.blocked.up || this.player.body.touching.up)) {
            canMoveY = false;
          }
          if (canMoveY) {
            this.player.y += platform.deltaY;
            this.player.body.position.y += platform.deltaY;
          }
        }
      }
    });
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(this.cursors, this.keys, this.touchState);
    }
    if (this.fpsText && this.game) {
      const fps = Math.round(this.game.loop.actualFps);
      this.fpsText.setText(`FPS: ${fps}`);
      if (fps < 50) {
        this.fpsText.setColor('#ff3333');
      } else if (fps < 58) {
        this.fpsText.setColor('#ffff33');
      } else {
        this.fpsText.setColor('#33ff33');
      }
    }
  }

  createCheckpointAnims() {
    if (!this.anims.exists('start-moving-anim')) {
      this.anims.create({
        key: 'start-moving-anim',
        frames: this.anims.generateFrameNumbers('start-moving', { start: 0, end: 16 }),
        frameRate: 20,
        repeat: -1
      });
    }

    if (!this.anims.exists('checkpoint-flag-out-anim')) {
      this.anims.create({
        key: 'checkpoint-flag-out-anim',
        frames: this.anims.generateFrameNumbers('checkpoint-flag-out', { start: 0, end: 25 }),
        frameRate: 20,
        repeat: 0
      });
    }

    if (!this.anims.exists('checkpoint-flag-idle-anim')) {
      this.anims.create({
        key: 'checkpoint-flag-idle-anim',
        frames: this.anims.generateFrameNumbers('checkpoint-flag-idle', { start: 0, end: 9 }),
        frameRate: 20,
        repeat: -1
      });
    }

    if (!this.anims.exists('end-pressed-anim')) {
      this.anims.create({
        key: 'end-pressed-anim',
        frames: this.anims.generateFrameNumbers('end-pressed', { start: 0, end: 7 }),
        frameRate: 20,
        repeat: 0
      });
    }
  }

  createInteractiveObjects(map) {
    const scale = 1.5;

    // 1. Create Start flag (cosmetic only)
    const startLayer = map.getObjectLayer('Start');
    if (startLayer && startLayer.objects.length > 0) {
      const startObj = startLayer.objects[0];
      const w = startObj.width || 64;
      const h = startObj.height || 64;
      const x = (startObj.x + w / 2) * scale;
      const y = (startObj.y - h / 2) * scale;
      
      const startFlag = this.add.sprite(x, y, 'start-idle').setScale(scale);
      startFlag.play('start-moving-anim');
    }

    // 2. Create End flag
    this.endFlags = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    const endLayer = map.getObjectLayer('End');
    if (endLayer && endLayer.objects.length > 0) {
      const endObj = endLayer.objects[0];
      const w = endObj.width || 64;
      const h = endObj.height || 64;
      const x = (endObj.x + w / 2) * scale;
      const y = (endObj.y - h / 2) * scale;

      const flag = this.endFlags.create(x, y, 'end-idle');
      flag.setScale(scale);
      flag.body.setSize(w * 0.5, h);
      flag.body.setOffset(w * 0.25, 0);
      flag.activated = false;
    }

    // 3. Create Checkpoint flags
    this.checkpoints = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    const checkpointLayer = map.getObjectLayer('Checkpoints');
    if (checkpointLayer && checkpointLayer.objects.length > 0) {
      checkpointLayer.objects.forEach(cpObj => {
        const w = cpObj.width || 64;
        const h = cpObj.height || 64;
        const x = (cpObj.x + w / 2) * scale;
        const y = (cpObj.y - h / 2) * scale;

        const flag = this.checkpoints.create(x, y, 'checkpoint-no-flag');
        flag.setScale(scale);
        flag.body.setSize(w * 0.5, h);
        flag.body.setOffset(w * 0.25, 0);
        flag.activated = false;
      });
    }

    // 4. Overlap callbacks
    this.physics.add.overlap(this.player, this.checkpoints, (player, flag) => {
      if (!flag.activated) {
        flag.activated = true;
        
        // Play checkpoint sound
        this.soundManager.playEffect(this, 'checkpoint', 0.82);

        // Play flag-out (rising) animation, then chain to idle
        flag.play('checkpoint-flag-out-anim');
        flag.once('animationcomplete-checkpoint-flag-out-anim', () => {
          flag.play('checkpoint-flag-idle-anim');
        });

        // Set player respawn point to this checkpoint's coordinates
        this.respawnX = flag.x;
        this.respawnY = flag.y - 16; // Spawn slightly above to avoid clipping
        console.log(`[CHECKPOINT] Activated at x: ${this.respawnX}, y: ${this.respawnY}`);
      }
    });

    this.physics.add.overlap(this.player, this.endFlags, (player, flag) => {
      if (!flag.activated) {
        flag.activated = true;

        // Disable player input and physics movement
        player.body.enable = false;
        player.setVelocity(0, 0);

        // Play finish sound
        this.soundManager.playEffect(this, 'finish', 0.85);

        // Play end flag animation
        flag.play('end-pressed-anim');

        // Play player disappearing animation and advance level
        player.playDisappear(() => {
          this.advanceLevel();
        });
      }
    });
  }

  createFruitItems(map) {
    const scale = 1.5;
    const tileWidth = map.tileWidth || 16;
    const tileHeight = map.tileHeight || 16;
    const width = map.width;
    const height = map.height;

    const occupiedTiles = new Set();
    const hazardTiles = new Set();

    const addLayerTiles = (layerName, targetSet) => {
      if (!map.getLayer(layerName)) {
        return;
      }

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const tile = map.getTileAt(x, y, true, layerName);
          if (tile && tile.index !== -1) {
            targetSet.add(`${x},${y}`);
          }
        }
      }
    };

    addLayerTiles('Ground', occupiedTiles);
    addLayerTiles('Solid Floating Platforms', occupiedTiles);
    addLayerTiles('Boundary Walls', occupiedTiles);
    addLayerTiles('Hazards', hazardTiles);

    const startLayer = map.getObjectLayer('Start');
    const endLayer = map.getObjectLayer('End');
    const invalidXZones = new Set();

    const addInvalidZone = (centerX) => {
      const gx = Math.floor(centerX / (tileWidth * scale));
      for (let i = gx - 15; i <= gx + 15; i++) {
        invalidXZones.add(i);
      }
    };

    if (startLayer && startLayer.objects.length > 0) {
      const startObj = startLayer.objects[0];
      const w = startObj.width || 64;
      addInvalidZone((startObj.x + w / 2) * scale);
    }

    if (endLayer && endLayer.objects.length > 0) {
      const endObj = endLayer.objects[0];
      const w = endObj.width || 64;
      addInvalidZone((endObj.x + w / 2) * scale);
    }

    const candidatePositions = [];
    const seen = new Set();

    const pushCandidate = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
      }

      if (invalidXZones.has(x)) {
        return;
      }

      const key = `${x},${y}`;
      if (occupiedTiles.has(key) || hazardTiles.has(key) || seen.has(key)) {
        return;
      }

      seen.add(key);
      candidatePositions.push({ x, y });
    };

    const sourceLayers = ['Ground', 'Solid Floating Platforms'];
    for (const layerName of sourceLayers) {
      if (!map.getLayer(layerName)) {
        continue;
      }

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const tile = map.getTileAt(x, y, true, layerName);
          if (!tile || tile.index === -1) {
            continue;
          }

          pushCandidate(x, y - 1);
        }
      }
    }

    if (!candidatePositions.length) {
      return;
    }

    const shuffled = Phaser.Utils.Array.Shuffle(candidatePositions);
    const targetTotal = Math.min(shuffled.length, Phaser.Math.Between(12, 18));
    const chosenPositions = shuffled.slice(0, targetTotal);

    this.fruits = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    if (!this.anims.exists('apple-spin')) {
      const appleTexture = this.textures.get('apple');
      const sourceImage = appleTexture && appleTexture.source ? appleTexture.source[0] : null;
      const frameCount = sourceImage ? Math.max(1, Math.floor(sourceImage.width / 32)) : 1;

      this.anims.create({
        key: 'apple-spin',
        frames: this.anims.generateFrameNumbers('apple', { start: 0, end: frameCount - 1 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    chosenPositions.forEach(({ x, y }) => {
      const centerX = (x * tileWidth + tileWidth / 2) * scale;
      const centerY = (y * tileHeight + tileHeight / 2) * scale;
      const fruit = this.fruits.create(centerX, centerY, 'apple');

      fruit.setScale(1.5);
      fruit.play('apple-spin');
      fruit.body.setAllowGravity(false);
      fruit.body.setImmovable(true);
      fruit.body.setSize(fruit.width * 0.6, fruit.height * 0.6);
      fruit.body.setOffset(fruit.width * 0.2, fruit.height * 0.2);
    });

    this.physics.add.overlap(this.player, this.fruits, (player, fruit) => {
      if (!fruit.active) {
        return;
      }

      this.soundManager.playEffect(this, 'collect', 0.72);
      fruit.disableBody(true, true);
    });
  }

  advanceLevel() {
    const nextLevelId = this.level.id + 1;
    const nextLevel = LEVELS.find(l => l.id === nextLevelId);
    if (nextLevel) {
      this.scene.start('GameScene', nextLevel);
    } else {
      // Completed all levels! Go back to menu.
      this.scene.start('MenuScene');
    }
  }
}
