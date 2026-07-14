# Design Implementation Checklist

Before coding any screen:

- Confirm the screen has an approved Figma reference.
- Confirm the reference comes from node `2:7`, `06_APPROVED_FOR_CODEX`.
- Identify matching shared components before creating new ones.
- Use shared sidebar/topbar/bottom-navigation components.
- Keep the locked global web sidebar order.
- Keep the locked mobile bottom navigation order.
- Keep module top-tab order for Chemistry, Physics and Biology.
- Do not create per-screen logo/sidebar/bottom-navigation variants.
- Build real components, not pasted images.
- Use semantic design tokens.
- Check role/access/license impact if the screen exposes gated features.
- Check scientific data/QA impact if the screen displays science content.

Mobile-specific checks:

- Mobile dashboard reference is first viewport only.
- Bottom navigation order is `Главная`, `Модули`, `Задания`, `AI`, `Профиль`.
- Touch targets are at least `44x44px`.
- AI assistant bubble does not overlap bottom navigation.
- Live lesson appears as compact dashboard entry/status, not an embedded dashboard video player.
- Loading screen stages match the approved loading lock.

After implementation:

- Run `node tools/verify-contract-layer.mjs`.
- Run `node tools/verify-ui-foundation.mjs`.
- Capture desktop screenshots for web surfaces.
- Capture mobile screenshots for responsive/mobile surfaces.
- Compare screenshots against Figma references.
- Document deviations.
- Do not switch production routes until approved.
