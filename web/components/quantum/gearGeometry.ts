import * as THREE from 'three';

/** Spur-gear outline with trapezoid teeth → extruded mesh. */
export function createGearGeometry({
  radius = 1,
  teeth = 24,
  toothLength = 0.12,
  toothWidth = 0.42,
  bore = 0.22,
  thickness = 0.12,
  holeCount = 0,
  holeRadius = 0.08,
  holeOrbit = 0.55,
}: {
  radius?: number;
  teeth?: number;
  toothLength?: number;
  toothWidth?: number;
  bore?: number;
  thickness?: number;
  holeCount?: number;
  holeRadius?: number;
  holeOrbit?: number;
}) {
  const shape = new THREE.Shape();
  const pts: THREE.Vector2[] = [];

  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + toothWidth * 0.22) / teeth) * Math.PI * 2;
    const a2 = ((i + toothWidth * 0.78) / teeth) * Math.PI * 2;
    const a3 = ((i + toothWidth) / teeth) * Math.PI * 2;
    const a4 = ((i + 1) / teeth) * Math.PI * 2;
    const tip = radius + toothLength;
    const root = radius * 0.98;

    pts.push(
      new THREE.Vector2(Math.cos(a0) * root, Math.sin(a0) * root),
      new THREE.Vector2(Math.cos(a1) * tip, Math.sin(a1) * tip),
      new THREE.Vector2(Math.cos(a2) * tip, Math.sin(a2) * tip),
      new THREE.Vector2(Math.cos(a3) * root, Math.sin(a3) * root),
      new THREE.Vector2(Math.cos(a4) * root, Math.sin(a4) * root),
    );
  }

  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath();

  if (bore > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  for (let i = 0; i < holeCount; i++) {
    const a = (i / holeCount) * Math.PI * 2 + 0.15;
    const h = new THREE.Path();
    h.absarc(
      Math.cos(a) * holeOrbit,
      Math.sin(a) * holeOrbit,
      holeRadius,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(h);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.18,
    bevelSize: Math.min(toothLength * 0.35, thickness * 0.16),
    bevelSegments: 3,
    curveSegments: 4,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}
