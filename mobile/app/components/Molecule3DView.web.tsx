import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Atom3D = { el: string; x: number; y: number; z: number };

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

export default function Molecule3DView({ molecule, height = 280, backgroundColor = "#0b1220" }: Props) {
  const atoms = Array.isArray(molecule?.atoms) ? molecule.atoms.length : 0;
  const formula = molecule?.formula || "";
  const name = molecule?.name || "";

  return (
    <View style={[styles.wrap, { height, backgroundColor }]}> 
      <Text style={styles.title}>3D preview is available in mobile app</Text>
      <Text style={styles.meta}>{name || "Molecule"}</Text>
      <Text style={styles.meta}>{formula}</Text>
      <Text style={styles.meta}>Atoms: {atoms}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 6,
  },
  title: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: "#94a3b8",
    fontSize: 13,
  },
});
