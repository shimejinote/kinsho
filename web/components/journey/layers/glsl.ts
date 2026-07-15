import { glslNoise } from '../../quantum/noise.glsl';

/** Shared simplex noise + a light fbm wrapper for journey shaders. */
export const journeyNoise = /* glsl */ `
${glslNoise}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p = p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}
`;
