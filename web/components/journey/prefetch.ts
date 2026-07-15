import { JOURNEY_ASSETS } from './layers/assets';
import { JOURNEY_STAGES, type JourneyStageId } from './timeline';

const STAGE_ASSET_URLS: Record<JourneyStageId, readonly string[]> = {
  space: [],
  solar: [],
  earth: [JOURNEY_ASSETS.earthDay, JOURNEY_ASSETS.earthNight],
  atmosphere: [],
  sky: [JOURNEY_ASSETS.skyHdr],
  city: [JOURNEY_ASSETS.cityHdr],
  people: [],
  grassland: [...JOURNEY_ASSETS.grassRock, JOURNEY_ASSETS.skyHdr],
  animals: [JOURNEY_ASSETS.skyHdr],
  forest: [JOURNEY_ASSETS.forestHdr, ...JOURNEY_ASSETS.forestGround],
  mycelium: [],
};

const warmed = new Set<string>();
const controllers = new Map<string, AbortController>();

function warmUrl(url: string) {
  if (warmed.has(url) || typeof fetch === 'undefined') return;
  warmed.add(url);
  const controller = new AbortController();
  controllers.set(url, controller);
  void fetch(url, {
    signal: controller.signal,
    cache: 'force-cache',
    credentials: 'same-origin',
  })
    .catch(() => {
      warmed.delete(url);
    })
    .finally(() => {
      controllers.delete(url);
    });
}

export function prefetchStageAssets(id: JourneyStageId) {
  STAGE_ASSET_URLS[id].forEach(warmUrl);
}

/** Prefetch the stage after `next`, keeping only nearby stages hot. */
export function prefetchAroundActive(
  currentId: JourneyStageId,
  nextId: JourneyStageId,
) {
  const ids = JOURNEY_STAGES.map((stage) => stage.id);
  const nextIndex = ids.indexOf(nextId);
  const upcoming = ids[(nextIndex + 1) % ids.length];
  prefetchStageAssets(currentId);
  prefetchStageAssets(nextId);
  prefetchStageAssets(upcoming);
}

export function cancelPrefetch(url: string) {
  const controller = controllers.get(url);
  if (!controller) return;
  controller.abort();
  controllers.delete(url);
  warmed.delete(url);
}
