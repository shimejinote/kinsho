'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/**
 * Clockwork gear button with a black-hole core:
 * solid metal rings keep the tangible button look; the aperture swirls
 * like an accretion vortex with a thin photon ring.
 */
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uHover;
uniform vec2 uRes;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec2(11.0, 7.0);
    a *= 0.5;
  }
  return v;
}

float sat(float x) { return clamp(x, 0.0, 1.0); }

vec3 blackbody(float t) {
  t = sat(t);
  vec3 cold = vec3(0.45, 0.12, 0.04);
  vec3 mid  = vec3(1.0, 0.48, 0.12);
  vec3 hot  = vec3(1.0, 0.88, 0.62);
  vec3 c = mix(cold, mid, smoothstep(0.0, 0.4, t));
  return mix(c, hot, smoothstep(0.4, 1.0, t));
}

float gearTeeth(float ang, float r, float r0, float teeth, float toothLen, float toothW) {
  float a = ang * teeth / TWO_PI;
  float cell = fract(a) - 0.5;
  float onTooth = 1.0 - smoothstep(toothW * 0.45, toothW * 0.55, abs(cell));
  float inLen = smoothstep(r0, r0 + 0.012, r) * smoothstep(r0 + toothLen, r0 + toothLen - 0.014, r);
  return onTooth * inLen;
}

float annulus(float r, float rIn, float rOut, float edge) {
  return smoothstep(rIn - edge, rIn + edge, r) * smoothstep(rOut + edge, rOut - edge, r);
}

float bolt(vec2 uv, vec2 c, float s) {
  vec2 p = (uv - c) / s;
  vec2 q = abs(p);
  float hx = max(q.x * 0.866025 + q.y * 0.5, q.y);
  float body = 1.0 - smoothstep(0.88, 1.02, hx);
  float slot = 1.0 - smoothstep(0.08, 0.16, abs(q.y));
  slot *= smoothstep(0.55, 0.35, length(p));
  return max(body * 0.9 - slot * 0.6, 0.0);
}

// Coverage + approximate surface height for the assembled machine at (r, ang).
void machine(float r, float ang, float spin, float counter, out float cov, out float h, out float matId) {
  cov = 0.0;
  h = 0.0;
  matId = 0.0;

  float flange = annulus(r, 0.82, 0.98, 0.01);
  float flangeLip = annulus(r, 0.96, 0.995, 0.005);
  if (flange > 0.01) {
    cov = max(cov, flange);
    h = max(h, 0.22 * flange + 0.08 * flangeLip);
    matId = 0.0;
  }

  float boltSum = 0.0;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * TWO_PI / 12.0 + 0.12;
    vec2 c = vec2(cos(a), sin(a)) * 0.905;
    vec2 uv = vec2(cos(ang), sin(ang)) * r;
    boltSum = max(boltSum, bolt(uv, c, 0.055));
  }
  boltSum *= flange;
  if (boltSum > 0.01) {
    cov = max(cov, boltSum);
    h = max(h, 0.38 * boltSum);
    matId = 2.0;
  }

  float a0 = ang - spin;
  float outerBody = annulus(r, 0.58, 0.82, 0.008);
  float outerTeeth = gearTeeth(a0, r, 0.78, 48.0, 0.085, 0.55);
  float outer = max(outerBody, outerTeeth);
  float spokeCell = abs(fract((a0 / TWO_PI) * 6.0) - 0.5);
  float spokeCut = smoothstep(0.18, 0.28, spokeCell);
  float webBand = annulus(r, 0.62, 0.76, 0.01);
  outer *= 1.0 - webBand * (1.0 - spokeCut) * 0.92;
  if (outer > 0.01) {
    cov = max(cov, outer);
    float tip = gearTeeth(a0, r, 0.82, 48.0, 0.03, 0.4);
    h = max(h, (0.30 + 0.08 * tip) * outer);
    matId = 1.0;
  }

  float a1 = ang - counter;
  float midBody = annulus(r, 0.36, 0.58, 0.008);
  float midTeethOut = gearTeeth(a1, r, 0.545, 36.0, 0.055, 0.5);
  float midTeethIn = gearTeeth(a1, 1.0 - (r - 0.30), 0.66, 28.0, 0.045, 0.5);
  midTeethIn *= annulus(r, 0.36, 0.42, 0.01);
  float mid = max(midBody, max(midTeethOut, midTeethIn));
  float holeCell = abs(fract((a1 / TWO_PI) * 8.0) - 0.5);
  float holeGate = smoothstep(0.22, 0.12, holeCell);
  float holeBand = annulus(r, 0.43, 0.52, 0.012);
  mid *= 1.0 - holeBand * holeGate * 0.95;
  if (mid > 0.01) {
    cov = max(cov, mid);
    h = max(h, 0.34 * mid);
    matId = 1.0;
  }

  float a2 = ang - spin * 1.7;
  float irisR0 = 0.14;
  float irisR1 = 0.36;
  float bAng = a2 * 10.0 / TWO_PI;
  float bCell = fract(bAng);
  float blade = smoothstep(0.0, 0.08, bCell) * smoothstep(0.55, 0.35, bCell);
  float irisBand = smoothstep(irisR0, irisR0 + 0.02, r) * smoothstep(irisR1, irisR1 - 0.025, r);
  float spiral = fract(bAng + (r - irisR0) * 1.8);
  float bladeLayer = smoothstep(0.0, 0.12, spiral) * smoothstep(0.62, 0.4, spiral);
  float iris = irisBand * max(blade, bladeLayer * 0.85);
  if (iris > 0.01) {
    cov = max(cov, iris);
    h = max(h, (0.26 + 0.1 * bCell) * iris);
    matId = 1.0;
  }

  float hub = annulus(r, 0.105, 0.155, 0.006);
  float hubTeeth = gearTeeth(ang + counter * 0.5, r, 0.145, 16.0, 0.028, 0.4);
  float hubAll = max(hub, hubTeeth * 0.9);
  if (hubAll > 0.01) {
    cov = max(cov, hubAll);
    h = max(h, 0.42 * hubAll);
    matId = 2.0;
  }

  float aperture = smoothstep(0.14, 0.09, r);
  if (aperture > 0.01) {
    cov = max(cov, aperture);
    h = mix(h, -0.55 * aperture, aperture);
  }
}

// Accretion vortex inside the aperture (additive color, no extra coverage).
vec3 vortexGlow(float r, float ang, float t, float hover) {
  float spin = t * (1.1 + hover * 0.8);
  // Log spiral coordinates — matter spiraling into the hole
  float sr = max(r, 0.001);
  float sang = ang + log(sr * 12.0 + 0.15) * 2.8 - spin;
  float arms = 0.55 + 0.45 * sin(sang * 3.0);
  float turb = fbm(vec2(sang * 1.4, sr * 14.0 - t * 1.6));
  float band = smoothstep(0.145, 0.12, r) * smoothstep(0.0, 0.05, r);
  // Doppler-ish: one side hotter
  float beam = pow(sat(0.55 + 0.7 * cos(ang - spin * 0.35)), 1.7);
  float temp = (0.35 + 0.75 * arms * turb) * beam * (1.0 + hover * 0.35);
  temp *= smoothstep(0.02, 0.08, r); // fades at true center
  vec3 disk = blackbody(temp) * temp * band * (0.55 + 0.9 * turb);

  // Photon ring — thin bright collar just inside the hub
  float ring = exp(-pow((r - 0.118) * 70.0, 2.0));
  float ringAsym = 0.6 + 0.55 * cos(ang - 0.3);
  vec3 photon = vec3(1.0, 0.9, 0.7) * ring * ringAsym * (0.9 + hover * 0.5);

  // Secondary faint lens ring
  photon += vec3(1.0, 0.55, 0.22) * exp(-pow((r - 0.095) * 55.0, 2.0)) * 0.35 * ringAsym;

  // Soft corona haze
  float haze = exp(-r * 9.0) * (0.12 + 0.1 * hover);
  vec3 corona = vec3(1.0, 0.45, 0.12) * haze;

  return disk + photon + corona;
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uRes.x / uRes.y;

  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float mask = smoothstep(1.06, 0.94, r);

  float spin = uTime * (0.35 + uHover * 0.55);
  float counter = -uTime * (0.55 + uHover * 0.7);

  // Mild gravitational pull — warp samples inward near the hole (keeps outer gears solid)
  float pull = 0.12 * pow(sat(1.0 - r / 0.45), 2.2);
  float rw = r * (1.0 + pull);
  float angw = ang + pull * 0.9 * sin(ang * 2.0 + uTime * 0.4);

  float cov, h, matId;
  machine(rw, angw, spin, counter, cov, h, matId);

  // Height-field normal
  float e = 0.012;
  float c1, h1, m1, c2, h2, m2;
  machine(length(uv + vec2(e, 0.0)) * (1.0 + pull), atan(uv.y, uv.x + e) + pull * 0.5, spin, counter, c1, h1, m1);
  machine(length(uv + vec2(0.0, e)) * (1.0 + pull), atan(uv.y + e, uv.x) + pull * 0.5, spin, counter, c2, h2, m2);
  vec3 N = normalize(vec3(h - h1, h - h2, 0.22));

  vec3 Lkey = normalize(vec3(-0.55, 0.75, 0.55));
  vec3 Lfill = normalize(vec3(0.65, -0.2, 0.4));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float diff = sat(dot(N, Lkey));
  float fill = sat(dot(N, Lfill)) * 0.28;
  float wrap = sat(dot(N, Lkey) * 0.5 + 0.5) * 0.2;
  vec3 Hlf = normalize(Lkey + V);
  float spec = pow(sat(dot(N, Hlf)), 48.0);
  float fres = pow(1.0 - sat(dot(N, V)), 3.0);

  float ao = 0.55 + 0.45 * smoothstep(0.05, 0.55, r);
  ao *= 0.7 + 0.3 * smoothstep(-0.2, 0.35, h);
  float contact = smoothstep(0.16, 0.28, r) * (1.0 - smoothstep(0.28, 0.5, r));
  ao *= 1.0 - contact * 0.35 * (1.0 - sat(h));

  float castShade = smoothstep(0.55, 1.15, length(uv - vec2(0.08, -0.1)));
  castShade = 1.0 - (1.0 - castShade) * 0.55 * mask;

  vec3 gunmetal = vec3(0.15, 0.16, 0.19);
  vec3 steel = vec3(0.32, 0.34, 0.38);
  vec3 brass = vec3(0.58, 0.42, 0.18);
  vec3 brassHi = vec3(0.92, 0.74, 0.38);
  vec3 voidCol = vec3(0.004, 0.005, 0.008);

  vec3 albedo = gunmetal;
  if (matId > 0.5 && matId < 1.5) albedo = mix(gunmetal, brass, 0.62);
  if (matId > 1.5) albedo = mix(brass, brassHi, 0.35);

  float grain = noise(uv * 40.0 + ang);
  albedo *= 0.88 + 0.14 * grain;

  float carve = annulus(r, 0.655, 0.668, 0.003) + annulus(r, 0.88, 0.895, 0.003);
  albedo *= 1.0 - carve * 0.45;

  vec3 lit = albedo * (0.12 + diff * 0.85 + fill + wrap) * ao;
  lit += mix(vec3(0.55), brassHi, sat(matId)) * spec * 0.55 * ao;
  lit += brass * fres * 0.18 * (0.5 + 0.5 * uHover);

  // Event horizon void + swirling accretion
  float aperture = smoothstep(0.145, 0.095, r);
  vec3 vortex = vortexGlow(r, ang, uTime, uHover);
  vec3 hole = voidCol + vortex;
  // True center stays black (event horizon)
  hole = mix(hole, voidCol, smoothstep(0.055, 0.0, r) * 0.95);

  float lipShade = smoothstep(0.09, 0.18, r) * (1.0 - smoothstep(0.18, 0.28, r));
  lit *= 1.0 - lipShade * 0.55;
  // Warm spill from the vortex onto nearby metal
  lit += brass * vortex.r * 0.15 * (1.0 - aperture) * smoothstep(0.28, 0.12, r);

  vec3 col = mix(lit, hole, aperture);

  float rimLight = pow(sat(1.0 - abs(r - 0.97) * 28.0), 2.0) * (0.35 + 0.4 * diff);
  col += steel * rimLight * 0.35;

  col *= castShade;
  col = mix(col, col * vec3(1.1, 1.04, 0.92), uHover * 0.3);

  float shadowRing = smoothstep(1.05, 0.92, r) * (1.0 - smoothstep(0.92, 0.78, r));
  float alpha = max(cov, aperture) * mask;
  float glowAlpha = sat(length(vortex) * 0.55) * smoothstep(0.22, 0.08, r);
  alpha = max(alpha, glowAlpha * mask);
  alpha = max(alpha, shadowRing * 0.25);

  col = mix(vec3(0.0), col, sat(alpha * 1.2));

  gl_FragColor = vec4(clamp(col, 0.0, 1.6), alpha);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function BlackHoleButton({
  href = '/apps',
  label = 'Enter',
}: {
  href?: string;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef(0);
  const targetHover = useRef(0);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uHover = gl.getUniformLocation(prog, 'uHover');
    const uRes = gl.getUniformLocation(prog, 'uRes');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvas.clientWidth;
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const t0 = performance.now();
    const tick = (now: number) => {
      hoverRef.current += (targetHover.current - hoverRef.current) * 0.08;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (now - t0) * 0.001);
      gl.uniform1f(uHover, hoverRef.current);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    setReady(true);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <Link
      href={href}
      aria-label={label}
      className="group relative block size-[min(22vw,110px)] sm:size-[120px] outline-none"
      onPointerEnter={() => {
        targetHover.current = 1;
      }}
      onPointerLeave={() => {
        targetHover.current = 0;
      }}
      onFocus={() => {
        targetHover.current = 1;
      }}
      onBlur={() => {
        targetHover.current = 0;
      }}
    >
      {/* Ground contact shade */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[8%] top-[14%] size-[84%] rounded-full opacity-80 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 45%, transparent 72%)',
          filter: 'blur(10px)',
          transform: 'translate(6px, 10px)',
        }}
      />
      {/* Warm under-light rim */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-10%] rounded-full opacity-50 transition-opacity duration-500 group-hover:opacity-90"
        style={{
          background:
            'radial-gradient(circle, rgba(160,110,40,0.22) 0%, transparent 62%)',
          filter: 'blur(4px)',
        }}
      />
      <canvas
        ref={canvasRef}
        className={`relative size-full rounded-full transition-transform duration-500 ease-out group-hover:scale-[1.06] group-focus-visible:scale-[1.06] ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          filter:
            'drop-shadow(0 10px 14px rgba(0,0,0,0.55)) drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
        }}
      />
      <span className="pointer-events-none absolute inset-0 flex items-end justify-center pb-[12%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="font-mono text-[8px] tracking-[0.4em] text-amber-200/75 uppercase">
          {label}
        </span>
      </span>
    </Link>
  );
}
