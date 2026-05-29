import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder, Pressable } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { Renderer } from "expo-three";

type Atom3D = { el: string; x: number; y: number; z: number };
type Bond3D = { i: number; j: number; order: 1 | 2 | 3; dist: number };

export type Molecule3DData = {
  id?: string;
  name?: string;
  formula?: string;
  atoms: Atom3D[];
};

type Props = {
  molecule: Molecule3DData;
  height?: number;
  backgroundColor?: string;
  autoRotate?: boolean;
  enableUserRotation?: boolean;
  showGestureHint?: boolean;
};

type LabelPoint = { key: string; el: string; left: number; top: number; fontSize: number; depth: number; radiusPx: number };

const ELEMENT_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x2d2d2d,
  O: 0xff3b30,
  N: 0x007aff,
  S: 0xffcc00,
  Cl: 0x34c759,
  F: 0x34c759,
  Br: 0xff9500,
  I: 0xaf52de,
};

const ELEMENT_RADII: Record<string, number> = {
  H: 0.18,
  C: 0.3,
  O: 0.3,
  N: 0.3,
  S: 0.36,
  Cl: 0.34,
  F: 0.28,
  Br: 0.36,
  I: 0.38,
};

function colorFor(el: string): number {
  return ELEMENT_COLORS[el] ?? 0x8e8e93;
}

function radiusFor(el: string): number {
  return ELEMENT_RADII[el] ?? 0.28;
}

function centerAtoms(atoms: Atom3D[]): Atom3D[] {
  if (!atoms.length) return atoms;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const a of atoms) {
    sx += a.x;
    sy += a.y;
    sz += a.z;
  }
  const cx = sx / atoms.length;
  const cy = sy / atoms.length;
  const cz = sz / atoms.length;
  return atoms.map((a) => ({ ...a, x: a.x - cx, y: a.y - cy, z: a.z - cz }));
}

const COVALENT_RADII: Record<string, number> = {
  H: 0.31,
  C: 0.76,
  N: 0.71,
  O: 0.66,
  F: 0.57,
  P: 1.07,
  S: 1.05,
  Cl: 1.02,
  Br: 1.2,
  I: 1.39,
};

const TYPICAL_VALENCE: Record<string, number> = {
  H: 1,
  C: 4,
  N: 3,
  O: 2,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  P: 3,
  S: 2,
};

function parseFormulaCounts(formula?: string): Record<string, number> {
  const out: Record<string, number> = {};
  const src = String(formula ?? "").trim();
  if (!src) return out;
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const el = m[1];
    const n = Number(m[2] || "1");
    out[el] = (out[el] ?? 0) + (Number.isFinite(n) ? n : 1);
  }
  return out;
}

function estimatePiBondsFromFormula(formula?: string): number {
  const c = parseFormulaCounts(formula);
  const C = c.C ?? 0;
  const H = c.H ?? 0;
  const N = c.N ?? 0;
  const X = (c.F ?? 0) + (c.Cl ?? 0) + (c.Br ?? 0) + (c.I ?? 0);
  const dbe = C - (H + X) / 2 + N / 2 + 1;
  if (!Number.isFinite(dbe)) return 0;
  return Math.max(0, Math.round(dbe));
}

function estimateBonds(atoms: Atom3D[], formula?: string): Bond3D[] {
  const bonds: Bond3D[] = [];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const dx = atoms[i].x - atoms[j].x;
      const dy = atoms[i].y - atoms[j].y;
      const dz = atoms[i].z - atoms[j].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const ei = atoms[i].el;
      const ej = atoms[j].el;
      const max = (COVALENT_RADII[ei] ?? 0.8) + (COVALENT_RADII[ej] ?? 0.8) + 0.45;
      if (d > 0.35 && d < max) bonds.push({ i, j, order: 1, dist: d });
    }
  }

  const valenceDeficit = atoms.map((a) => TYPICAL_VALENCE[a.el] ?? 0);
  for (const b of bonds) {
    valenceDeficit[b.i] -= 1;
    valenceDeficit[b.j] -= 1;
  }

  let piNeeded = estimatePiBondsFromFormula(formula);
  const heavy = bonds
    .filter((b) => atoms[b.i].el !== "H" && atoms[b.j].el !== "H")
    .sort((a, b) => a.dist - b.dist);

  while (piNeeded > 0) {
    let changed = false;
    for (const b of heavy) {
      if (piNeeded <= 0) break;
      if (b.order >= 3) continue;
      if (valenceDeficit[b.i] <= 0 || valenceDeficit[b.j] <= 0) continue;
      b.order = (b.order + 1) as 1 | 2 | 3;
      valenceDeficit[b.i] -= 1;
      valenceDeficit[b.j] -= 1;
      piNeeded -= 1;
      changed = true;
    }
    if (!changed) break;
  }

  return bonds;
}

function perpendicularVector(v: any): any {
  const a = Math.abs(v.x) < 0.7 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(v, a).normalize();
}

function buildCylinderBetween(a: any, b: any, r = 0.06, color = 0xb0b0b0) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geom = new THREE.CylinderGeometry(r, r, len, 14, 1, true);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.6 });
  const mesh = new THREE.Mesh(geom, mat);

  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
  mesh.setRotationFromQuaternion(q);

  return mesh;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export default function Molecule3DView({
  molecule,
  height = 320,
  backgroundColor = "#050816",
  autoRotate = true,
  enableUserRotation = true,
  showGestureHint = true,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [labels, setLabels] = useState<LabelPoint[]>([]);
  const [viewSize, setViewSize] = useState({ w: 0, h: height });

  const minZoom = 0.6;
  const maxZoom = 2.4;

  const setZoomSafe = (next: number) => {
    const z = clamp(next, minZoom, maxZoom);
    zoomRef.current = z;
    setZoom(z);
  };

  const atoms = useMemo(() => centerAtoms(molecule?.atoms ?? []), [molecule?.atoms]);
  const bonds = useMemo(() => estimateBonds(atoms, molecule?.formula), [atoms, molecule?.formula]);

  const rafRef = useRef<number | null>(null);

  const ctrl = useRef({
    dragging: false,
    lastDx: 0,
    lastDy: 0,
    pinchDist: 0,
    targetX: 0,
    targetY: 0,
    spinX: 0,
    spinY: 0,
  });

  const pan = useMemo(() => {
    if (!enableUserRotation) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onMoveShouldSetPanResponderCapture: (_evt, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        ctrl.current.dragging = true;
        ctrl.current.lastDx = 0;
        ctrl.current.lastDy = 0;
        ctrl.current.pinchDist = 0;
        ctrl.current.spinX = 0;
        ctrl.current.spinY = 0;
      },
      onPanResponderMove: (evt, g) => {
        const touches = (evt?.nativeEvent as any)?.touches ?? [];
        if (touches.length >= 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          const dx2 = Number(t1?.pageX ?? 0) - Number(t2?.pageX ?? 0);
          const dy2 = Number(t1?.pageY ?? 0) - Number(t2?.pageY ?? 0);
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (ctrl.current.pinchDist > 0) {
            const delta = (dist - ctrl.current.pinchDist) * 0.004;
            setZoomSafe(zoomRef.current + delta);
          }
          ctrl.current.pinchDist = dist;
          return;
        }

        ctrl.current.pinchDist = 0;
        const ddx = g.dx - ctrl.current.lastDx;
        const ddy = g.dy - ctrl.current.lastDy;
        ctrl.current.lastDx = g.dx;
        ctrl.current.lastDy = g.dy;

        ctrl.current.targetY += ddx * 0.012;
        ctrl.current.targetX += ddy * 0.012;
        ctrl.current.targetX = clamp(ctrl.current.targetX, -1.25, 1.25);

        ctrl.current.spinY = ddx * 0.0016;
        ctrl.current.spinX = ddy * 0.0016;
      },
      onPanResponderRelease: () => {
        ctrl.current.dragging = false;
        ctrl.current.pinchDist = 0;
      },
      onPanResponderTerminate: () => {
        ctrl.current.dragging = false;
        ctrl.current.pinchDist = 0;
      },
    });
  }, [enableUserRotation]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!atoms?.length) {
    return (
      <View style={[styles.empty, { height, backgroundColor }]}>
        <Text style={styles.emptyText}>Нет координат атомов для 3D</Text>
      </View>
    );
  }

  return (
    <View
      style={{ height, borderRadius: 16, overflow: "hidden" }}
      onLayout={(e) => setViewSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      {...(pan ? pan.panHandlers : null)}
    >
      <GLView
        style={{ flex: 1, backgroundColor }}
        onContextCreate={async (gl) => {
          const renderer = new Renderer({ gl }) as any;
          renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

          const scene = new THREE.Scene();
          scene.background = new THREE.Color(backgroundColor);

          const camera = new THREE.PerspectiveCamera(50, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000);
          camera.position.set(0, 0, 5);

          scene.add(new THREE.AmbientLight(0xffffff, 0.55));
          const key = new THREE.DirectionalLight(0xffffff, 0.85);
          key.position.set(3, 4, 6);
          scene.add(key);

          const group = new THREE.Group();
          scene.add(group);

          const atomMeshes: Array<{ mesh: any; el: string }> = [];

          for (const a of atoms) {
            const geom = new THREE.SphereGeometry(radiusFor(a.el), 24, 16);
            const mat = new THREE.MeshStandardMaterial({ color: colorFor(a.el), metalness: 0.05, roughness: 0.35 });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(a.x, a.y, a.z);
            group.add(mesh);
            atomMeshes.push({ mesh, el: a.el });
          }

          for (const bond of bonds) {
            const ai = atoms[bond.i];
            const aj = atoms[bond.j];
            const a = new THREE.Vector3(ai.x, ai.y, ai.z);
            const b = new THREE.Vector3(aj.x, aj.y, aj.z);
            const dir = new THREE.Vector3().subVectors(b, a).normalize();
            const n = perpendicularVector(dir);
            const off = 0.085;

            if (bond.order === 1) {
              group.add(buildCylinderBetween(a, b));
            } else if (bond.order === 2) {
              group.add(buildCylinderBetween(a.clone().addScaledVector(n, off), b.clone().addScaledVector(n, off), 0.046));
              group.add(buildCylinderBetween(a.clone().addScaledVector(n, -off), b.clone().addScaledVector(n, -off), 0.046));
            } else {
              group.add(buildCylinderBetween(a, b, 0.04));
              group.add(buildCylinderBetween(a.clone().addScaledVector(n, off * 1.35), b.clone().addScaledVector(n, off * 1.35), 0.036));
              group.add(buildCylinderBetween(a.clone().addScaledVector(n, -off * 1.35), b.clone().addScaledVector(n, -off * 1.35), 0.036));
            }
          }

          const box = new THREE.Box3().setFromObject(group);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const baseCameraZ = Math.max(4.5, maxDim * 2.2);
          camera.position.set(0, 0, baseCameraZ / zoomRef.current);
          camera.lookAt(0, 0, 0);

          const world = new THREE.Vector3();
          const ndc = new THREE.Vector3();

          let frameId = 0;
          const tick = () => {
            const c = ctrl.current;

            if (autoRotate && !c.dragging) {
              c.targetY += 0.003;
              c.targetX += 0.001;
              c.targetX = clamp(c.targetX, -1.15, 1.15);
            } else if (!c.dragging) {
              c.targetY += c.spinY;
              c.targetX += c.spinX;
              c.spinY *= 0.92;
              c.spinX *= 0.92;
              c.targetX = clamp(c.targetX, -1.25, 1.25);
            }

            group.rotation.y += (c.targetY - group.rotation.y) * 0.18;
            group.rotation.x += (c.targetX - group.rotation.x) * 0.18;

            camera.position.z += (baseCameraZ / zoomRef.current - camera.position.z) * 0.22;
            camera.updateMatrixWorld();

            frameId += 1;
            if (frameId % 3 === 0) {
              const vw = viewSize.w || gl.drawingBufferWidth;
              const vh = viewSize.h || gl.drawingBufferHeight;
              const projected: LabelPoint[] = [];

              for (let i = 0; i < atomMeshes.length; i++) {
                const a = atomMeshes[i];
                a.mesh.getWorldPosition(world);
                ndc.copy(world).project(camera);

                if (ndc.z < -1 || ndc.z > 1) continue;

                const px = ((ndc.x + 1) * 0.5) * vw;
                const py = ((1 - ndc.y) * 0.5) * vh;
                const rr = radiusFor(a.el);
                const worldEdge = world.clone().add(new THREE.Vector3(rr, 0, 0));
                const edgeNdc = worldEdge.project(camera);
                const edgePx = ((edgeNdc.x + 1) * 0.5) * vw;
                const radiusPx = Math.max(4, Math.abs(edgePx - px));
                const fontSize = clamp(radiusPx * 0.72, 7, 11);

                projected.push({
                  key: `${i}-${a.el}`,
                  el: a.el,
                  left: px,
                  top: py,
                  fontSize,
                  depth: ndc.z,
                  radiusPx,
                });
              }

              projected.sort((a, b) => a.depth - b.depth);
              const accepted: LabelPoint[] = [];
              for (const p of projected) {
                let blocked = false;
                for (const q of accepted) {
                  const dx = p.left - q.left;
                  const dy = p.top - q.top;
                  const d = Math.sqrt(dx * dx + dy * dy);
                  const minD = Math.max(p.radiusPx * 0.65, q.radiusPx * 0.65);
                  if (d < minD) {
                    blocked = true;
                    break;
                  }
                }
                if (!blocked) accepted.push(p);
              }
              setLabels(accepted);
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
            rafRef.current = requestAnimationFrame(tick);
          };

          tick();
        }}
      />

      {enableUserRotation && showGestureHint ? (
        <View pointerEvents="none" style={styles.hintRow}>
          <Text style={styles.hint}>Один палец: вращение, два пальца: масштаб</Text>
        </View>
      ) : null}

      <View style={styles.zoomRow}>
        <Pressable onPress={() => setZoomSafe(zoomRef.current - 0.2)} style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>-</Text>
        </Pressable>
        <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
        <Pressable onPress={() => setZoomSafe(zoomRef.current + 0.2)} style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
      </View>

      {labels.map((p) => (
        <View
          key={p.key}
          pointerEvents="none"
          style={[
            styles.atomTag,
            {
              left: p.left - p.radiusPx * 0.55,
              top: p.top - p.radiusPx * 0.55,
              width: p.radiusPx * 1.1,
              height: p.radiusPx * 1.1,
            },
          ]}
        >
          <Text style={[styles.atomTagText, { fontSize: p.fontSize }]}>{p.el}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  emptyText: { color: "#9ca3af", textAlign: "center" },
  hintRow: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  hint: { color: "#cbd5e1", fontSize: 11, textAlign: "center" },
  zoomRow: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(2,6,23,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  zoomBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: { color: "#e5e7eb", fontSize: 16, fontWeight: "900" },
  zoomValue: { color: "#cbd5e1", fontSize: 11, fontWeight: "700", minWidth: 42, textAlign: "center" },
  atomTag: { position: "absolute", alignItems: "center", justifyContent: "center" },
  atomTagText: {
    color: "#ffffff",
    fontWeight: "900",
    textShadowColor: "rgba(2,6,23,0.95)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});
