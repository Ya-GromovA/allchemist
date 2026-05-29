import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, PanResponder, Text, Pressable } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";

type AtomLike = { el?: string; element?: string; x: number; y: number; z?: number };
type Bond2D = { i: number; j: number; order: 1 | 2 | 3; dist: number };

export type Molecule2DData = {
  atoms: AtomLike[];
  formula?: string;
};

type Props = {
  molecule: Molecule2DData;
  height?: number;
  backgroundColor?: string;
};

const ELEMENT_COLORS: Record<string, string> = {
  H: "#ffffff",
  C: "#2d2d2d",
  O: "#ff3b30",
  N: "#007aff",
  S: "#ffcc00",
  Cl: "#34c759",
  F: "#34c759",
  Br: "#ff9500",
  I: "#a78bfa",
};

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

function getEl(a: AtomLike): string {
  return String(a.el ?? a.element ?? "").trim() || "X";
}

function center(atoms: AtomLike[]): AtomLike[] {
  if (!atoms.length) return atoms;
  let sx = 0;
  let sy = 0;
  for (const a of atoms) {
    sx += a.x;
    sy += a.y;
  }
  const cx = sx / atoms.length;
  const cy = sy / atoms.length;
  return atoms.map((a) => ({ ...a, x: a.x - cx, y: a.y - cy }));
}

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

function estimateBondOrders(atoms: AtomLike[], formula?: string): Bond2D[] {
  const bonds: Bond2D[] = [];

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const ai = atoms[i];
      const aj = atoms[j];
      const ei = getEl(ai);
      const ej = getEl(aj);
      const dx = ai.x - aj.x;
      const dy = ai.y - aj.y;
      const dz = (ai.z ?? 0) - (aj.z ?? 0);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const ri = COVALENT_RADII[ei] ?? 0.8;
      const rj = COVALENT_RADII[ej] ?? 0.8;
      const max = ri + rj + 0.45;
      if (d > 0.3 && d <= max) bonds.push({ i, j, order: 1, dist: d });
    }
  }

  const valenceDeficit = atoms.map((a) => TYPICAL_VALENCE[getEl(a)] ?? 0);
  for (const b of bonds) {
    valenceDeficit[b.i] -= 1;
    valenceDeficit[b.j] -= 1;
  }

  let piNeeded = estimatePiBondsFromFormula(formula);
  const heavyCandidates = bonds
    .filter((b) => getEl(atoms[b.i]) !== "H" && getEl(atoms[b.j]) !== "H")
    .sort((a, b) => a.dist - b.dist);

  while (piNeeded > 0) {
    let changed = false;
    for (const b of heavyCandidates) {
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

export default function Molecule2DView({ molecule, height = 320, backgroundColor = "#050816" }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });

  const atoms0 = useMemo(() => center(molecule?.atoms ?? []), [molecule?.atoms]);
  const bonds = useMemo(() => estimateBondOrders(atoms0, molecule?.formula), [atoms0, molecule?.formula]);

  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0, pinchDist: 0 });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: (_evt, g) => {
          dragRef.current.startX = g.x0;
          dragRef.current.startY = g.y0;
          dragRef.current.baseX = offsetRef.current.x;
          dragRef.current.baseY = offsetRef.current.y;
          dragRef.current.pinchDist = 0;
        },
        onPanResponderMove: (evt, g) => {
          const touches = (evt?.nativeEvent as any)?.touches ?? [];
          if (touches.length >= 2) {
            const t1 = touches[0];
            const t2 = touches[1];
            const dx2 = Number(t1?.pageX ?? 0) - Number(t2?.pageX ?? 0);
            const dy2 = Number(t1?.pageY ?? 0) - Number(t2?.pageY ?? 0);
            const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            if (dragRef.current.pinchDist > 0) {
              const delta = (dist - dragRef.current.pinchDist) * 0.004;
              setZoom((z) => Math.max(0.6, Math.min(2.6, z + delta)));
            }
            dragRef.current.pinchDist = dist;
            return;
          }

          dragRef.current.pinchDist = 0;
          const next = { x: dragRef.current.baseX + g.dx, y: dragRef.current.baseY + g.dy };
          offsetRef.current = next;
          setOffset(next);
        },
      }),
    []
  );

  const { pts, w, h } = useMemo(() => {
    const w = 360;
    const h = height;
    if (!atoms0.length) return { pts: [], w, h };

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const a of atoms0) {
      minX = Math.min(minX, a.x);
      maxX = Math.max(maxX, a.x);
      minY = Math.min(minY, a.y);
      maxY = Math.max(maxY, a.y);
    }

    const pad = 0.6;
    const dx = Math.max(0.001, maxX - minX);
    const dy = Math.max(0.001, maxY - minY);
    const scale = Math.min((w * 0.72) / (dx + pad), (h * 0.72) / (dy + pad)) * zoom;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const pts = atoms0.map((a) => {
      const px = w / 2 + (a.x - cx) * scale + offset.x;
      const py = h / 2 + (a.y - cy) * scale + offset.y;
      return { ...a, px, py };
    });

    return { pts, w, h };
  }, [atoms0, height, zoom, offset]);

  if (!atoms0.length) {
    return (
      <View style={[styles.empty, { height, backgroundColor }]}>
        <Text style={styles.emptyText}>Нет данных для 2D</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height, backgroundColor }]} {...pan.panHandlers}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
        {bonds.map((b, idx) => {
          const p1 = pts[b.i] as any;
          const p2 = pts[b.j] as any;
          const dx = p2.px - p1.px;
          const dy = p2.py - p1.py;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const off = 3.2;

          const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
          if (b.order === 1) {
            lines.push({ x1: p1.px, y1: p1.py, x2: p2.px, y2: p2.py });
          } else if (b.order === 2) {
            lines.push({ x1: p1.px + nx * off, y1: p1.py + ny * off, x2: p2.px + nx * off, y2: p2.py + ny * off });
            lines.push({ x1: p1.px - nx * off, y1: p1.py - ny * off, x2: p2.px - nx * off, y2: p2.py - ny * off });
          } else {
            lines.push({ x1: p1.px, y1: p1.py, x2: p2.px, y2: p2.py });
            lines.push({ x1: p1.px + nx * (off + 1), y1: p1.py + ny * (off + 1), x2: p2.px + nx * (off + 1), y2: p2.py + ny * (off + 1) });
            lines.push({ x1: p1.px - nx * (off + 1), y1: p1.py - ny * (off + 1), x2: p2.px - nx * (off + 1), y2: p2.py - ny * (off + 1) });
          }

          return lines.map((ln, i) => (
            <Line
              key={`b-${idx}-${i}`}
              x1={ln.x1}
              y1={ln.y1}
              x2={ln.x2}
              y2={ln.y2}
              stroke="rgba(255,255,255,0.42)"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          ));
        })}

        {pts.map((a: any, idx: number) => {
          const el = getEl(a);
          const color = ELEMENT_COLORS[el] ?? "#94a3b8";
          const r = el === "H" ? 10 : 14;

          return (
            <React.Fragment key={`a-${idx}`}>
              <Circle cx={a.px} cy={a.py} r={r + 1.5} fill="rgba(0,0,0,0.35)" />
              <Circle cx={a.px} cy={a.py} r={r} fill={color} />
              <SvgText
                x={a.px}
                y={a.py + 4}
                fontSize={11}
                fontWeight="700"
                fill={el === "C" ? "#e5e7eb" : "#0b1020"}
                textAnchor="middle"
              >
                {el}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View pointerEvents="none" style={styles.hintRow}>
        <Text style={styles.hint}>Один палец: перемещение, два пальца: масштаб</Text>
      </View>

      <View style={styles.zoomRow}>
        <Pressable onPress={() => setZoom((z) => Math.max(0.6, z - 0.2))} style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>-</Text>
        </Pressable>
        <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
        <Pressable onPress={() => setZoom((z) => Math.min(2.6, z + 0.2))} style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
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
  empty: { borderRadius: 16, alignItems: "center", justifyContent: "center", padding: 12 },
  emptyText: { color: "#9ca3af", textAlign: "center" },
});
