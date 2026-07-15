/** Paths under `web/public/assets/journey` from the asset-pipeline worker. */
export const JOURNEY_ASSETS = {
  earthDay: '/assets/journey/earth/blue-marble-2048.png',
  earthNight: '/assets/journey/earth/black-marble-2012-3600.jpg',
  skyHdr: '/assets/journey/environments/sky-kloppenheim-06-1k.hdr',
  cityHdr: '/assets/journey/environments/city-canary-wharf-1k.hdr',
  forestHdr: '/assets/journey/environments/forest-mossy-1k.hdr',
  forestGround: [
    '/assets/journey/nature/forest-ground-diffuse-1k.jpg',
    '/assets/journey/nature/forest-ground-normal-gl-1k.jpg',
    '/assets/journey/nature/forest-ground-roughness-1k.jpg',
  ] as const,
  grassRock: [
    '/assets/journey/nature/grass-rock-diffuse-1k.jpg',
    '/assets/journey/nature/grass-rock-normal-gl-1k.jpg',
    '/assets/journey/nature/grass-rock-roughness-1k.jpg',
  ] as const,
} as const;
