# Mario Remake Mobile

Repo này dùng để thực hành môi trường Node.js và port game Mario Remake từ Python Arcade sang Phaser.js + Capacitor.

## Mục Tiêu

- Học cách dùng Node.js, npm, package.json và Vite.
- Port game platformer từ Python Arcade sang Phaser.js theo từng bước nhỏ.
- Chạy game trên web trước, sau đó đóng gói thành APK Android bằng Capacitor.

## Công Nghệ

- Node.js
- Vite
- Phaser.js
- Capacitor Android

## Cách Chạy Web

```powershell
npm install
npm run dev
```

Mở link local mà Vite hiện trong terminal, thường là:

```text
http://localhost:5173/
```

## Build Thử

```powershell
npm run build
```

## Đóng Gói Android

Khi bản web đã ổn:

```powershell
npm run build
npx cap sync android
npx cap open android
```

Sau đó build APK trong Android Studio.

## Cấu Trúc Chính

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

## Trạng Thái Hiện Tại

- Đã có menu chọn màn.
- Đã load map Tiled dạng `.tmj`.
- Đã có player di chuyển, nhảy và collision cơ bản.
- Đã có checkpoint, end point, sound và moving platform ban đầu.
- Đây vẫn là bản prototype, chưa phải bản port hoàn chỉnh của game Python.

## Lưu Ý Tiled Map

Phaser không đọc được layer bị nén `zstd`. Nếu map bị mất layer, mở Tiled và export lại:

```text
Tile Layer Format: CSV
Compression: None
```

Nên test Map 1 trước, sau đó mới port logic cho các map còn lại.
