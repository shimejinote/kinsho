import type { JourneyDirector } from '../JourneyDirector';
import type { JourneyStageDefinition } from '../timeline';

export type JourneyLayerProps = {
  director: JourneyDirector;
  stage: JourneyStageDefinition;
};
