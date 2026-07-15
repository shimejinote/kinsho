import * as THREE from 'three';
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js';

export type TreePack = {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
};

/**
 * Normalize parts for merge, then weld + smooth normals so canopies aren't faceted.
 */
function preparePart(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  if (flat !== geo) geo.dispose();

  flat.deleteAttribute('normal');
  flat.deleteAttribute('uv');
  flat.deleteAttribute('uv1');
  flat.deleteAttribute('uv2');
  flat.clearGroups();

  const pos = flat.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const box = new THREE.Box3().setFromBufferAttribute(pos);
  const h = Math.max(0.001, box.max.y - box.min.y);

  for (let i = 0; i < count; i++) {
    const uplift = (pos.getY(i) - box.min.y) / h;
    const c = color.clone().offsetHSL(0, 0, uplift * 0.06 - 0.03);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

function trunk(height: number, rBot: number, rTop: number, color: THREE.Color) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, height, 16, 4);
  geo.translate(0, height * 0.5, 0);
  return preparePart(geo, color);
}

function foliageLobe(
  radius: number,
  pos: THREE.Vector3,
  color: THREE.Color,
  detail = 2,
) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  geo.translate(pos.x, pos.y, pos.z);
  geo.scale(1.05, 0.85, 1.05);
  return preparePart(geo, color);
}

function pineStack(levels: number, baseY: number, color: THREE.Color) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < levels; i++) {
    const t = i / Math.max(1, levels - 1);
    const r = THREE.MathUtils.lerp(1.05, 0.28, t);
    const h = THREE.MathUtils.lerp(1.1, 0.55, t);
    const y = baseY + i * 0.72;
    // More radial segments + a mid ring → softer cones once normals are welded
    const cone = new THREE.ConeGeometry(r, h, 20, 2);
    cone.translate(0, y + h * 0.35, 0);
    const shade = color.clone().offsetHSL(0.01 * Math.sin(i), 0.04, -0.03 * t);
    parts.push(preparePart(cone, shade));
  }
  return parts;
}

/** Mid-poly game trees — denser silhouettes, smooth shaded. */
export function buildTreePack(kind: 'pine' | 'fir' | 'oak' | 'maple'): TreePack {
  const parts: THREE.BufferGeometry[] = [];
  const bark = new THREE.Color('#5c4030');
  const barkDark = new THREE.Color('#3d2a1e');

  if (kind === 'pine') {
    parts.push(trunk(2.4, 0.16, 0.07, bark));
    parts.push(...pineStack(6, 1.15, new THREE.Color('#2f6b3a')));
  } else if (kind === 'fir') {
    parts.push(trunk(2.8, 0.14, 0.06, barkDark));
    parts.push(...pineStack(7, 1.0, new THREE.Color('#245c36')));
  } else if (kind === 'oak') {
    parts.push(trunk(1.7, 0.22, 0.12, bark));
    const leaf = new THREE.Color('#4a8f3c');
    parts.push(foliageLobe(0.95, new THREE.Vector3(0, 2.35, 0), leaf, 2));
    parts.push(
      foliageLobe(0.7, new THREE.Vector3(0.55, 2.1, 0.15), leaf.clone().offsetHSL(0.02, 0, 0.04), 2),
    );
    parts.push(
      foliageLobe(
        0.65,
        new THREE.Vector3(-0.5, 2.15, -0.2),
        leaf.clone().offsetHSL(-0.01, 0.05, -0.02),
        2,
      ),
    );
    parts.push(
      foliageLobe(
        0.55,
        new THREE.Vector3(0.1, 2.7, -0.35),
        leaf.clone().offsetHSL(0.03, -0.02, 0.05),
        2,
      ),
    );
  } else {
    parts.push(trunk(2.0, 0.15, 0.08, bark.clone().offsetHSL(0.02, -0.05, 0.05)));
    const leaf = new THREE.Color('#6aa84f');
    parts.push(foliageLobe(0.75, new THREE.Vector3(0, 2.4, 0), leaf, 2));
    parts.push(
      foliageLobe(
        0.5,
        new THREE.Vector3(0.45, 2.55, 0.25),
        leaf.clone().offsetHSL(0.04, 0.05, 0.06),
        2,
      ),
    );
    parts.push(
      foliageLobe(
        0.48,
        new THREE.Vector3(-0.4, 2.5, 0.1),
        leaf.clone().offsetHSL(-0.02, 0, -0.03),
        2,
      ),
    );
    parts.push(foliageLobe(0.42, new THREE.Vector3(0.15, 2.9, -0.2), new THREE.Color('#8fbc5a'), 2));
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  if (!merged) throw new Error('tree merge failed');

  // Weld duplicates so computeVertexNormals averages across faces (smooth)
  const smooth = mergeVertices(merged, 1e-3);
  if (smooth !== merged) merged.dispose();
  smooth.computeVertexNormals();

  return {
    geometry: smooth,
    material: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.02,
      flatShading: false,
      envMapIntensity: 0.55,
    }),
  };
}

export const TREE_KINDS = ['pine', 'fir', 'oak', 'maple'] as const;
