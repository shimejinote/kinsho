# Journey asset inventory

This directory contains the deliberately small, license-vetted asset set for the cinematic world journey. Runtime code should treat `manifest.json` as the canonical inventory and source record.

## Included assets

- Earth: NASA Blue Marble daytime color map and Black Marble nighttime lights map.
- Sky: Poly Haven Kloppenheim 06 Pure Sky 1K HDRI.
- City: Poly Haven Canary Wharf 1K HDRI.
- Nature: Poly Haven Mossy Forest 1K HDRI.
- Terrain: Poly Haven Forest Ground 01 and Aerial Grass Rock 1K diffuse, OpenGL normal, and roughness maps.

There are 11 binary assets totaling **11,920,865 bytes (11.37 MiB)**. Textures are limited to 1K except NASA's already compact 2K/3.6K equirectangular maps. The included HDRIs retain HDR range for environment lighting; the PBR maps use the source JPEGs to avoid adding a conversion tool or generated intermediates.

## Licensing

- NASA imagery is generally not subject to copyright in the United States unless otherwise noted. Follow the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and retain the credits recorded in `manifest.json`. NASA identifiers, insignia, and recognizable people are not included here.
- Every Poly Haven asset is released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Attribution is not required, but source and creator details are retained in `manifest.json`.

The exact source page, direct download URL, creator, license, file size, dimensions, and SHA-256 digest are recorded for every binary file in `manifest.json`.

## Intentional procedural gaps

The following categories are intentionally not represented by downloaded binaries:

- Space, stars, nebulae, Sun, Mars, atmospheric entry, and volumetric clouds: procedural shaders/particles are smaller and more controllable. The sphere-ready public-domain Mars dataset found in this pass was impractically large; compact NASA images were orthographic rather than texture maps.
- City geometry: use instanced project-authored silhouettes with the Canary Wharf environment.
- People and animals: use project-authored impostors or low-detail silhouettes. No compact, cohesive, rigged CC0 set with reliable direct downloads was verified.
- Trees and grass geometry: reuse the project's existing licensed tree set and generate grass blades procedurally.
- Mushrooms: use parametric cap/stem geometry and emissive procedural materials. No suitable model existed in the prioritized CC0 library.

These placeholders are machine-readable in the `proceduralPlaceholders` section of `manifest.json`.
