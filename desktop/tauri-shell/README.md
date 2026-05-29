# AllChemist Desktop (Tauri shell)

This folder contains a production-ready desktop shell plan for AllChemist.

## Goals

- Desktop icon launch (Windows/macOS/Linux)
- Native installer generation
- Auto-update channel support
- Reuse web UI from current project

## Quick start

1. Build web bundle from mobile/web app:

```bash
cd ../../mobile
npm run web:export
```

2. Build desktop app:

```bash
cd ../desktop/tauri-shell
npm install
npm run tauri:build
```

## Notes

- `distDir` points to `../../mobile/dist`.
- Add icons into `src-tauri/icons/` (`icon.icns`, `icon.ico`, PNG set).
- Configure updater endpoints in `src-tauri/tauri.conf.json` before release.
