# Allchemist Server Profile

Date: 2026-07-02
Profile command: `node tools/profile-server.mjs`
Server path: `/root/synapse`

## Server Summary

- OS: Ubuntu 22.04.2 LTS
- Kernel: 5.15.0-73-generic
- Virtualization: KVM VM
- Container: not detected
- CPU: Intel Xeon Processor (Cooperlake)
- Logical threads: 3
- Load average during profile: 0.17, 0.64, 0.60
- RAM total: 5.79 GiB
- RAM available during profile: 2.92 GiB
- Swap total: 1.00 GiB
- Swap free during profile: 0.00 GiB
- Disk: `/dev/vda1`, ext4, 79G total, 57G used, 19G free, 76% used
- GPU: not detected; `nvidia-smi` unavailable
- Node: v20.20.2
- npm: 10.8.2
- Python: 3.10.12

## Disk Smoke

The reusable profile tool wrote and read a 64 MiB file in `/tmp`:

- Write: 64 MiB copied in 0.199923 s, about 336 MB/s.
- Read: 64 MiB copied in 0.00900497 s, about 7.5 GB/s.

This is only a light smoke check. It is enough to detect obvious disk problems, not enough for storage benchmarking.

## Suitability

- Current Next.js `apps/web` and `apps/admin` foundation: suitable.
- Current TypeScript and contract checks: suitable.
- Current Playwright smoke checks: suitable when run sequentially.
- Future Rive/Lottie: suitable if animations are lazy-loaded and not batch-rendered server-side.
- Future lightweight Three.js scenes: suitable for client-rendered previews and smoke checks with low concurrency.
- Future heavy 3D scenes: not suitable as a server-side rendering or high-concurrency preview host.
- Screenshot generation: suitable at low concurrency.
- Parallel builds/tests: limited; avoid running both Next builds plus Playwright plus mobile installs at the same time.

## Bottlenecks

1. CPU is small: 3 logical threads. Next builds and Playwright can saturate it quickly.
2. RAM is moderate: 5.79 GiB total, about 2.9 GiB available during profiling.
3. Swap exists but was fully used during profiling; treat swap as unavailable for planning.
4. Disk has only about 19G free. Repeated clean workspaces, `.next` builds, mobile installs, and screenshots can consume it quickly.
5. No GPU is available. Heavy 3D validation should not be expected to run well on this server.

## Recommended Limits

- Parallel verification workers: 1 main verification job at a time.
- Next builds: run `apps/web` and `apps/admin` sequentially.
- Playwright workers: 1.
- Screenshot concurrency: 1 by default, 2 only when no builds or installs are running.
- Vitest workers: current tiny API-client suite is fine as-is; avoid increasing concurrency until the suite grows.
- Mobile install/build checks: do not run concurrently with Next builds.
- Heavy 3D previews on this server: disabled.
- Lightweight Three.js previews: allowed only behind lazy loading and small scene budgets.
- Rive/Lottie: lazy-load aggressively; avoid autoplaying many instances on admin dashboards.
- Design preview generation: keep lightweight; prefer static screenshots and small smoke coverage over high-volume rendering.

## Suggested UI / Animation Defaults

- Prefer progressive disclosure for media-heavy admin panels.
- Use static or CSS-only placeholders in dashboard shells until real visualization contracts are connected.
- Lazy-load Rive/Lottie/Three.js modules at route or widget boundary.
- Cap simultaneous animated widgets to 1-2 on low-end preview paths.
- Keep scientific 3D scenes optional in smoke tests; use deterministic lightweight scene checks rather than full heavy rendering.
- Store generated screenshots outside the repository or clean them after verification unless they are promoted to intentional baselines.

## Reusable Command

Run:

```bash
cd /root/synapse
node tools/profile-server.mjs
```

The command prints a Markdown-formatted profile and performs a safe 64 MiB `/tmp` disk smoke.
