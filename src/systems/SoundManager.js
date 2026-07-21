class SoundManager {
  constructor() {
    this.bgm = null;
  }

  playEffect(scene, key, volume = 0.75) {
    try {
      scene.sound.play(key, { volume });
    } catch (e) {
      console.warn(`Could not play sound effect: ${key}`, e);
    }
  }

  playMenuMusic(scene, volume = 0.5) {
    try {
      if (!this.bgm) {
        this.bgm = scene.sound.add('menusound', { loop: true, volume });
        this.bgm.play();
      } else if (!this.bgm.isPlaying) {
        this.bgm.play();
      }
    } catch (e) {
      console.warn('Could not play menu background music', e);
    }
  }

  stopMenuMusic() {
    if (this.bgm && this.bgm.isPlaying) {
      try {
        this.bgm.stop();
      } catch (e) {
        console.warn('Could not stop menu background music', e);
      }
    }
  }

  stopAll(scene) {
    try {
      scene.sound.stopAll();
    } catch (e) {
      console.warn('Could not stop all sounds', e);
    }
    this.bgm = null;
  }
}

export default new SoundManager();
