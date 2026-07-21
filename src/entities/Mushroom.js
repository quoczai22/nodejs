import Phaser from 'phaser';

export default class Mushroom extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'mushroom-walk');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(1.5);
    this.setCollideWorldBounds(true);
    
    // Physics properties
    this.body.setGravityY(1000);
    this.body.setSize(20, 20);
    this.body.setOffset(6, 12); // Push body box down to feet

    // AI Patrol properties
    this.patrolSpeed = 50; 
    this.direction = -1; // -1: Left, 1: Right
    this.isDead = false;

    // Start walk animation
    this.play('mushroom-walk-anim');
    this.setVelocityX(this.direction * this.patrolSpeed);
  }

  update() {
    if (this.isDead) return;

    // Check if hitting wall
    const hittingWall = this.body.blocked.left || this.body.blocked.right;

    // Ledge avoidance (look ahead)
    const nextX = this.x + (this.direction * 12); 
    const nextY = this.y + (this.body.height / 2) + 6; 

    const groundTileAhead = this.scene.map.getTileAtWorldXY(nextX, nextY, true, undefined, this.scene.groundLayer) ||
                            this.scene.map.getTileAtWorldXY(nextX, nextY, true, undefined, this.scene.solidLayer);

    const noGroundAhead = !groundTileAhead || groundTileAhead.index === -1;

    if (hittingWall || noGroundAhead) {
      this.direction *= -1;
      this.flipX = this.direction > 0;
    }

    this.setVelocityX(this.direction * this.patrolSpeed);
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.setVelocity(0, 0);
    this.body.enable = false;

    // Play death animation
    this.play('mushroom-dead-anim');
    this.once('animationcomplete-mushroom-dead-anim', () => {
      this.destroy();
    });
  }
}
