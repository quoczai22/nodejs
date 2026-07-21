# Mario Remake Mobile

Repo nay dung de thuc hanh moi truong Node.js va port game Mario Remake tu Python Arcade sang Phaser.js + Capacitor.

## Muc Tieu

- Hoc cach dung Node.js, npm, package.json va Vite.
- Port game platformer tu Python Arcade sang Phaser.js theo tung buoc nho.
- Chay game tren web truoc, sau do dong goi thanh APK Android bang Capacitor.

## Cong Nghe

- Node.js
- Vite
- Phaser.js
- Capacitor Android

## Cach Chay Web

```powershell
npm install
npm run dev
```

Mo link local ma Vite hien trong terminal, thuong la:

```text
http://localhost:5173/
```

## Build Thu

```powershell
npm run build
```

## Dong Goi Android

Khi ban web da on:

```powershell
npm run build
npx cap sync android
npx cap open android
```

Sau do build APK trong Android Studio.

## Cau Truc Chinh

```text
src/
  config.js
  main.js
  scenes/
    BootScene.js
    MenuScene.js
    GameScene.js
  entities/
    Player.js
    Mushroom.js
  systems/
    SoundManager.js
public/assets/
  Free/
  images/
  maps/
  sounds/
android/
```

## Trang Thai Hien Tai

- Da co menu chon man.
- Da load map Tiled dang `.tmj`.
- Da co player di chuyen, nhay va collision co ban.
- Da co checkpoint, end point, sound va moving platform ban dau.
- Day van la ban prototype, chua phai ban port hoan chinh cua game Python.

## Luu Y Tiled Map

Phaser khong doc duoc layer bi nen `zstd`. Neu map bi mat layer, mo Tiled va export lai:

```text
Tile Layer Format: CSV
Compression: None
```

Nen test Map 1 truoc, sau do moi port logic cho cac map con lai.
