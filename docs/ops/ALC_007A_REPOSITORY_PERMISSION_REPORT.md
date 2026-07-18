# ALC-007A repository permission report

Before: `/root/synapse`, UID/GID 1000, mode `0777`; parent `/root` mode `0700`. After: `root:root 0750`. No recursive rewrite occurred. Verified consumers were root maintenance/Git and root Docker bind mounts; backend retained RW access to `backend/data` and read access to content packs. Verdict: PASS.
