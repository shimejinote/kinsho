/**
 * Compatibility entry point for forest code that previously owned a mutable,
 * module-level clock. Journey state now belongs to one JourneyDirector
 * instance per mounted experience.
 */
export { JourneyDirector } from '../journey/JourneyDirector';
export * from '../journey/timeline';
