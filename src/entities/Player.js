import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, characterName = 'Pink Man') {
    const characterKey = characterName.toLowerCase().replace(/\s+/g, '_');
    super(scene, x, y, `${characterKey}_idle`);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.characterName = characterName;
    this.characterKey = characterKey;
    this.normalScale = 1.7;

    // Set scaling and physical dimensions
    this.setScale(this.normalScale);
    this.setCollideWorldBounds(true);

    // Player state flags
    this.isBig = false;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.isHit = false;
    this.isAppearing = false;
    this.isDisappearing = false;
    this.isDying = false;
    this.ridingPlatform = null;

    // Movement speeds
    this.walkSpeed = 240; // 4 px/frame * 60 FPS
    this.runSpeed = 420;  // 7 px/frame * 60 FPS
    this.jumpSpeed = -1020; // -17 px/frame * 60 FPS
    this.setMaxVelocity(420, 1500);

    // Initialize animations
    this.createAnimations();

    // Trigger spawn animation
    this.playAppear();
  }

  createAnimations() {
    const key = this.characterKey;

    const addAnim = (animKey, spriteSheetKey, frameCount, frameRate = 20, repeat = -1) => {
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: this.scene.anims.generateFrameNumbers(spriteSheetKey, { start: 0, end: frameCount - 1 }),
          frameRate,
          repeat
        });
      }
    };

    // Load character animations
    addAnim(`${key}_idle`, `${key}_idle`, 11, 20, -1);
    addAnim(`${key}_run`, `${key}_run`, 12, 22, -1);
    addAnim(`${key}_jump`, `${key}_jump`, 1, 20, 0);
    addAnim(`${key}_fall`, `${key}_fall`, 1, 20, 0);
    addAnim(`${key}_hit`, `${key}_hit`, 7, 20, 0);

    // Load global effects
    if (!this.scene.anims.exists('appearing')) {
      this.scene.anims.create({
        key: 'appearing',
        frames: this.scene.anims.generateFrameNumbers('appearing', { start: 0, end: 6 }),
        frameRate: 20,
        repeat: 0
      });
    }

    if (!this.scene.anims.exists('disappearing')) {
      this.scene.anims.create({
        key: 'disappearing',
        frames: this.scene.anims.generateFrameNumbers('disappearing', { start: 0, end: 6 }),
        frameRate: 20,
        repeat: 0
      });
    }
  }

  playAppear() {
    this.isAppearing = true;
    this.setVelocity(0, 0);
    this.body.enable = false;

    // Play spawn sound
    this.scene.soundManager.playEffect(this.scene, 'spawn', 0.65);

    // Play appearing animation
    this.setTexture('appearing');
    this.play('appearing');

    this.once('animationcomplete-appearing', () => {
      this.isAppearing = false;
      this.body.enable = true;
      this.setTexture(`${this.characterKey}_idle`);
      this.play(`${this.characterKey}_idle`);
    });
  }

  playDisappear(callback) {
    this.isDisappearing = true;
    this.setVelocity(0, 0);
    this.body.enable = false;

    this.setTexture('disappearing');
    this.play('disappearing');

    this.once('animationcomplete-disappearing', () => {
      this.isDisappearing = false;
      if (callback) callback();
    });
  }

  hurt() {
    if (this.isInvincible || this.isDying || this.isAppearing || this.isDisappearing) return;

    if (this.isBig) {
      this.isBig = false;
      
      // Scale down player back to normal size
      this.setScale(this.normalScale);
      
      // Trigger temporary invincibility
      this.isInvincible = true;
      this.invincibleTimer = 1.5;

      // Play hit animation
      this.isHit = true;
      this.play(`${this.characterKey}_hit`);
      this.once(`animationcomplete-${this.characterKey}_hit`, () => {
        this.isHit = false;
      });

      // Play hurt sound
      this.scene.soundManager.playEffect(this.scene, 'hurt', 0.78);
    } else {
      this.die();
    }
  }

  die() {
    this.isDying = true;
    this.setVelocity(0, 0);
    this.body.enable = false;

    // Play die sound
    this.scene.soundManager.playEffect(this.scene, 'die', 0.75);

    // Play disappearing animation and trigger scene restart on end
    this.playDisappear(() => {
      this.scene.respawnPlayer();
    });
  }

  growBig() {
    if (this.isBig) return;
    this.isBig = true;
    // Scale up player by 1.3
    this.setScale(this.normalScale * 1.3);
  }

  update(cursors, keys, touchState) {
    if (this.isAppearing || this.isDisappearing || this.isDying) return;

    // Check if still riding the platform
    if (this.ridingPlatform) {
      const px = this.body.x + this.body.width / 2;
      const platX = this.ridingPlatform.body.x + this.ridingPlatform.body.width / 2;
      const platW = this.ridingPlatform.body.width; // Use the physics body width directly (which will be shrunk to 80%)

      // Player center must be within the platform's physics body
      const horizOverlap = (px >= platX - platW / 2) && (px <= platX + platW / 2);
      const vertTouch = Math.abs(this.body.bottom - this.ridingPlatform.body.top) < 10;

      const stillRiding = this.body.touching.down && horizOverlap && vertTouch && this.body.velocity.y >= 0;
      if (!stillRiding) {
        this.ridingPlatform = null;
      }
    }

    // Check fall out of bounds
    if (this.y > this.scene.physics.world.bounds.height + 100) {
      this.die();
      return;
    }

    // Determine target horizontal velocity
    const isRunning = cursors.shift && cursors.shift.isDown;
    const speed = isRunning ? this.runSpeed : this.walkSpeed;

    let targetVelocityX = 0;
    if (cursors.left.isDown || keys.A.isDown || touchState.left) {
      targetVelocityX = -speed;
      this.flipX = true;
    } else if (cursors.right.isDown || keys.D.isDown || touchState.right) {
      targetVelocityX = speed;
      this.flipX = false;
    }

    this.setVelocityX(targetVelocityX);

    // Jump handling
    const jumpPressed = cursors.up.isDown || keys.W.isDown || keys.SPACE.isDown || touchState.jump;
    const isOnGround = this.body.blocked.down || this.body.touching.down;
    if (jumpPressed && isOnGround) {
      this.setVelocityY(this.jumpSpeed);
      this.scene.soundManager.playEffect(this.scene, 'jump', 0.72);
      this.ridingPlatform = null; // Clear immediately on jump
    }

    // Animation state machine (only change anims if we aren't currently locked in a hit frame)
    if (!this.isHit) {
      if (!isOnGround) {
        // In the air
        if (this.body.velocity.y < 0) {
          this.play(`${this.characterKey}_jump`, true);
        } else {
          this.play(`${this.characterKey}_fall`, true);
        }
      } else {
        // On ground - check input targetVelocityX to prevent running animation when standing on moving platforms
        if (targetVelocityX !== 0) {
          this.play(`${this.characterKey}_run`, true);
        } else {
          this.play(`${this.characterKey}_idle`, true);
        }
      }
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    // Handle invincibility timer blinking
    if (this.isInvincible) {
      this.invincibleTimer -= (delta / 1000);
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.setAlpha(1.0);
      } else {
        const flash = Math.floor(this.invincibleTimer * 10) % 2 === 0;
        this.setAlpha(flash ? 0.4 : 1.0);
      }
    }
  }

  setScale(x, y) {
    super.setScale(x, y);
    if (this.body) {
      this.body.setSize(14, 24);
      this.body.setOffset(9, 8);
    }
    return this;
  }
}
