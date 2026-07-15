'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { glslNoise } from './noise.glsl';
import { consumeCrankImpulse, ensureCrankListening } from './crankInput';

/**
 * Fullscreen raymarched clockwork.
 * The scene is a set of *actually meshing* gears (opposite spin, speed inversely
 * proportional to radius) plus a back mounting plate — all pure SDF. The mouse is a
 * hand crank: horizontal motion spins the whole train via angular velocity + inertia
 * (uCrank), and cranking hard heats the brass (uHeat). Dark gunmetal palette, low
 * exposure, no strobing.
 */
const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uCrank; // accumulated rotation (radians)
uniform float uHeat;  // 0..1 crank effort

${glslNoise}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float sdBox(vec3 p, vec3 b){
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCyl(vec3 p, float h, float r){
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

void pModPolar(inout vec2 p, float rep){
  float angle = 6.2831853 / rep;
  float a = atan(p.y, p.x) + angle * 0.5;
  float r = length(p);
  a = mod(a, angle) - angle * 0.5;
  p = vec2(cos(a), sin(a)) * r;
}

// A single spur gear centred at origin, axis along Y.
float sdGear(vec3 p, float R, float H, float teeth, float toothLen){
  float body = sdCyl(p, H, R);              // rim disc
  vec2 q = p.xz;
  pModPolar(q, teeth);
  vec3 tp = vec3(q.x - R, p.y, q.y);
  float tooth = sdBox(tp, vec3(toothLen, H, R * 0.13)); // teeth
  body = min(body, tooth);
  float bore = sdCyl(p, H + 0.2, R * 0.24);  // centre bore
  body = max(body, -bore);
  float hub = sdCyl(p, H * 1.25, R * 0.34);  // raised hub
  float hubBore = sdCyl(p, H * 2.0, R * 0.14);
  body = min(body, max(hub, -hubBore));
  // lightening holes in the web
  vec3 hp = p; vec2 hq = hp.xz; pModPolar(hq, 6.0);
  float holes = sdCyl(vec3(hq.x - R * 0.62, hp.y, hq.y), H + 0.2, R * 0.13);
  body = max(body, -holes);
  return body;
}

// Whole machine. matId: 0 = plate/frame, 1 = gears.
float map(vec3 p, out float matId){
  float ang = uCrank;
  matId = 1.0;

  // back mounting plate (gunmetal)
  float plate = sdBox(p - vec3(0.15, 0.15, -0.55), vec3(2.7, 2.0, 0.09));
  // bolt heads on the plate
  vec3 bp = p - vec3(0.15, 0.15, -0.46);
  bp.xy = mod(bp.xy + 1.3, 2.6) - 1.3;
  float bolts = sdCyl(vec3(bp.x, bp.z, bp.y), 0.04, 0.07);
  plate = min(plate, bolts);

  float d = plate;
  matId = 0.0;

  // Gear train (meshing: distance ~ R1+R2, speed ~ 1/R, opposite signs)
  float g;
  {
    vec3 q = p; q.xz *= rot(ang);
    g = sdGear(q, 1.00, 0.15, 26.0, 0.10);
  }
  if (g < d) { d = g; matId = 1.0; }
  {
    vec3 q = p - vec3(1.58, 0.0, 0.0); q.xz *= rot(-ang * 1.61 + 0.12);
    g = sdGear(q, 0.62, 0.15, 16.0, 0.10);
    if (g < d) { d = g; matId = 1.0; }
  }
  {
    vec3 q = p - vec3(-1.18, 0.92, 0.0); q.xz *= rot(-ang * 2.38 + 0.2);
    g = sdGear(q, 0.42, 0.14, 11.0, 0.09);
    if (g < d) { d = g; matId = 1.0; }
  }
  {
    vec3 q = p - vec3(-1.05, -1.02, 0.02); q.xz *= rot(-ang * 2.0);
    g = sdGear(q, 0.50, 0.14, 13.0, 0.09);
    if (g < d) { d = g; matId = 1.0; }
  }

  return d;
}

vec3 calcNormal(vec3 p){
  const vec2 e = vec2(0.001, 0.0);
  float id;
  return normalize(vec3(
    map(p + e.xyy, id) - map(p - e.xyy, id),
    map(p + e.yxy, id) - map(p - e.yxy, id),
    map(p + e.yyx, id) - map(p - e.yyx, id)
  ));
}

float softShadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.03;
  for (int i = 0; i < 20; i++){
    float id;
    float h = map(ro + rd * t, id);
    res = min(res, 12.0 * h / t);
    t += clamp(h, 0.02, 0.25);
    if (res < 0.004 || t > 8.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for (int i = 0; i < 5; i++){
    float hr = 0.01 + 0.11 * float(i);
    float id;
    float dd = map(p + n * hr, id);
    occ += (hr - dd) * sca;
    sca *= 0.85;
  }
  return clamp(1.0 - 1.4 * occ, 0.0, 1.0);
}

vec3 aces(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main(){
  vec2 uv = (vUv * 2.0 - 1.0);
  uv.x *= uResolution.x / uResolution.y;

  // Calm, slightly angled framing with a very slow drift (no mouse parallax).
  float ct = uTime * 0.04;
  vec3 ro = vec3(0.7 + sin(ct) * 0.35, 0.85, 5.2);
  vec3 ta = vec3(0.15, 0.05, 0.0);
  vec3 f = normalize(ta - ro);
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
  vec3 u = cross(f, r);
  vec3 rd = normalize(uv.x * r + uv.y * u + 1.9 * f);

  float t = 0.0;
  float matId = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++){
    vec3 pos = ro + rd * t;
    float id;
    float d = map(pos, id);
    if (d < 0.0007 * t){ hit = true; matId = id; break; }
    t += d * 0.85;
    if (t > 16.0) break;
  }

  vec3 col;
  if (hit){
    vec3 pos = ro + rd * t;
    vec3 n = calcNormal(pos);
    vec3 v = -rd;

    vec3 key = normalize(vec3(0.5, 0.8, 0.6));
    vec3 fill = normalize(vec3(-0.7, 0.1, 0.4));

    float diff = clamp(dot(n, key), 0.0, 1.0);
    float sh = mix(0.4, 1.0, softShadow(pos + n * 0.02, key));
    float ao = calcAO(pos, n);
    float fillD = clamp(dot(n, fill), 0.0, 1.0) * 0.25;
    vec3 hlf = normalize(key + v);
    float spec = pow(clamp(dot(n, hlf), 0.0, 1.0), 60.0);
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);

    // Metal albedo: gunmetal gears with a faint brass patina; plate is darker steel.
    float patina = snoise(pos * 2.2) * 0.5 + 0.5;
    vec3 gunmetal = vec3(0.19, 0.20, 0.23);
    vec3 brass = vec3(0.42, 0.32, 0.15);
    vec3 metal = mix(gunmetal, brass, patina * 0.45);
    vec3 steel = vec3(0.12, 0.13, 0.15);
    vec3 albedo = mix(steel, metal, matId);

    vec3 lit = albedo * (0.09 + diff * sh + fillD) * ao;
    vec3 specCol = mix(vec3(0.5), vec3(1.0, 0.85, 0.55), matId) * spec * sh * 0.7;
    vec3 rim = vec3(0.4, 0.45, 0.5) * fres * 0.3 * ao;

    col = lit + specCol + rim;

    // Crank effort warms the brass rims (subtle amber, no strobe).
    col += brass * fres * uHeat * 0.8 * matId;
  } else {
    // Dim workshop backdrop: near-black with a faint warm floor glow + vignette.
    float g = smoothstep(1.2, -0.6, uv.y);
    vec3 bg = mix(vec3(0.015, 0.016, 0.022), vec3(0.05, 0.04, 0.03), g * 0.6);
    bg *= 1.0 - 0.5 * dot(uv, uv) * 0.35;
    col = bg;
  }

  col = aces(col * 0.9);
  col = pow(col, vec3(0.4545));
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function RaymarchCore({
  onRotations,
}: {
  onRotations?: (n: number) => void;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();

  const angle = useRef(0);
  const vel = useRef(0);
  const lastReported = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(
          size.width * viewport.dpr,
          size.height * viewport.dpr,
        ),
      },
      uCrank: { value: 0 },
      uHeat: { value: 0 },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    ensureCrankListening();
  }, []);

  useFrame((state, delta) => {
    const m = mat.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);

    // Window-level impulse — works even when HTML overlays sit above the canvas.
    const dpx = consumeCrankImpulse();

    // Mouse crank -> angular velocity with inertia; machine idles otherwise.
    vel.current += dpx * 22.0;
    vel.current *= Math.pow(0.88, dt * 60);
    vel.current = THREE.MathUtils.clamp(vel.current, -18, 18);
    const omega = 0.45 + vel.current;
    angle.current += omega * dt;

    const un = m.uniforms;
    un.uTime.value = state.clock.elapsedTime;
    un.uCrank.value = angle.current;
    un.uHeat.value = THREE.MathUtils.clamp(Math.abs(vel.current) * 0.35, 0, 1);
    un.uResolution.value.set(
      state.size.width * state.viewport.dpr,
      state.size.height * state.viewport.dpr,
    );

    const rot = Math.floor(angle.current / (Math.PI * 2));
    if (rot !== lastReported.current) {
      lastReported.current = rot;
      onRotations?.(rot);
    }
  });

  // Fullscreen triangle-equivalent via a large plane facing the camera.
  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
