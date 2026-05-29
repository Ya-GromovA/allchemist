#!/usr/bin/env python3
import argparse
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ELEMENTS = {
    1: "H", 2: "He", 3: "Li", 4: "Be", 5: "B", 6: "C", 7: "N", 8: "O", 9: "F", 10: "Ne",
    11: "Na", 12: "Mg", 13: "Al", 14: "Si", 15: "P", 16: "S", 17: "Cl", 18: "Ar", 19: "K", 20: "Ca",
    21: "Sc", 22: "Ti", 23: "V", 24: "Cr", 25: "Mn", 26: "Fe", 27: "Co", 28: "Ni", 29: "Cu", 30: "Zn",
    31: "Ga", 32: "Ge", 33: "As", 34: "Se", 35: "Br", 36: "Kr", 37: "Rb", 38: "Sr", 39: "Y", 40: "Zr",
    41: "Nb", 42: "Mo", 43: "Tc", 44: "Ru", 45: "Rh", 46: "Pd", 47: "Ag", 48: "Cd", 49: "In", 50: "Sn",
    51: "Sb", 52: "Te", 53: "I", 54: "Xe", 55: "Cs", 56: "Ba", 57: "La", 58: "Ce", 59: "Pr", 60: "Nd",
    61: "Pm", 62: "Sm", 63: "Eu", 64: "Gd", 65: "Tb", 66: "Dy", 67: "Ho", 68: "Er", 69: "Tm", 70: "Yb",
    71: "Lu", 72: "Hf", 73: "Ta", 74: "W", 75: "Re", 76: "Os", 77: "Ir", 78: "Pt", 79: "Au", 80: "Hg",
    81: "Tl", 82: "Pb", 83: "Bi", 84: "Po", 85: "At", 86: "Rn", 87: "Fr", 88: "Ra", 89: "Ac", 90: "Th",
    91: "Pa", 92: "U", 93: "Np", 94: "Pu", 95: "Am", 96: "Cm", 97: "Bk", 98: "Cf", 99: "Es", 100: "Fm",
}

HALOGENS = {"F", "Cl", "Br", "I", "At"}
METALS = {"Li", "Na", "K", "Rb", "Cs", "Fr", "Be", "Mg", "Ca", "Sr", "Ba", "Ra", "Al", "Fe", "Cu", "Zn", "Ag", "Au", "Ni", "Co", "Cr", "Mn", "Ti", "V", "Sn", "Pb", "Hg"}


def fetch_json(url: str, timeout: int = 25):
    req = urllib.request.Request(url, headers={"User-Agent": "synapse-molecules-generator/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_props(cids):
    ids = ",".join(str(x) for x in cids)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{ids}/property/Title,MolecularFormula/JSON"
    try:
        doc = fetch_json(url)
        return doc.get("PropertyTable", {}).get("Properties", [])
    except Exception:
        return []


def fetch_3d(cid: int):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/record/JSON?record_type=3d"
    try:
        doc = fetch_json(url)
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None

    compounds = doc.get("PC_Compounds") or []
    if not compounds:
        return None
    c0 = compounds[0]

    atoms = ((c0.get("atoms") or {}).get("element") or [])
    coords = c0.get("coords") or []
    if not atoms or not coords:
        return None

    conformers = (coords[0].get("conformers") or [])
    if not conformers:
        return None
    conf = conformers[0]
    xs = conf.get("x") or []
    ys = conf.get("y") or []
    zs = conf.get("z") or []

    n = min(len(atoms), len(xs), len(ys), len(zs))
    if n == 0:
        return None

    out = []
    for i in range(n):
        el = ELEMENTS.get(int(atoms[i]), "X")
        out.append({"el": el, "x": float(xs[i]), "y": float(ys[i]), "z": float(zs[i])})
    return out


def classify_branch(name: str, formula: str, atoms):
    nm = (name or "").lower()
    frm = formula or ""
    els = {a.get("el") for a in atoms if isinstance(a, dict)}

    if any(k in nm for k in ["amino", "protein", "peptide", "glucose", "sucrose", "dna", "rna", "adenosine"]):
        return "biochemistry"
    if any(k in nm for k in ["benz", "eth", "meth", "prop", "but", "acet", "alcohol", "amine", "ester", "ketone", "aldehyde"]):
        return "organic"
    if any(k in nm for k in ["titration", "indicator", "buffer", "reagent", "chromat"]):
        return "analytical"
    if any(k in nm for k in ["enthalpy", "entropy", "gibbs", "kinetic", "rate constant"]):
        return "physical"
    if els & METALS or els & HALOGENS:
        return "inorganic"
    if re.search(r"[A-Z][a-z]?\d", frm):
        return "general"
    return "general"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=5000)
    ap.add_argument("--start-cid", type=int, default=1)
    ap.add_argument("--max-cid", type=int, default=600000)
    ap.add_argument("--batch", type=int, default=80)
    ap.add_argument("--sleep", type=float, default=0.02)
    ap.add_argument("--version", type=int, default=1)
    ap.add_argument("--out", default="/root/synapse/content_packs/chemistry_molecules_5000_v1.json")
    args = ap.parse_args()

    molecules = []
    seen = set()
    cid = max(1, args.start_cid)

    while len(molecules) < args.target and cid <= args.max_cid:
        batch = list(range(cid, min(cid + args.batch, args.max_cid + 1)))
        cid = batch[-1] + 1

        props = fetch_props(batch)
        for pr in props:
            if len(molecules) >= args.target:
                break

            c = int(pr.get("CID") or 0)
            if not c or c in seen:
                continue
            seen.add(c)

            atoms = fetch_3d(c)
            if not atoms:
                continue

            title = str(pr.get("Title") or f"CID {c}")
            formula = str(pr.get("MolecularFormula") or "")
            branch = classify_branch(title, formula, atoms)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            molecules.append(
                {
                    "id": f"mol_pc_{c}",
                    "name": title,
                    "formula": formula,
                    "branch": branch,
                    "atoms": atoms,
                    "updated_at": now,
                }
            )

            if len(molecules) % 100 == 0:
                print(f"[progress] {len(molecules)} molecules")

            time.sleep(args.sleep)

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    pack = {
        "pack_id": "chemistry_molecules_5000",
        "version": args.version,
        "generated_at": now,
        "updated_at": now,
        "modules": ["chemistry"],
        "molecules": molecules,
    }

    outp = Path(args.out)
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[done] wrote {len(molecules)} molecules -> {outp}")


if __name__ == "__main__":
    from pathlib import Path
    main()
