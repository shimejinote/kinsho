# Earth textures (quantum portal)

Satellite-derived equirectangular maps for the void Earth globe. Switch presets in the warp debug panel (`WarpDebugPanel`).

## Photoreal 8K (default) — `photoreal/`

| File | Role | Source |
|------|------|--------|
| `day-bmng-8k.jpg` | Cloud-free surface + topo/bathy (8192×4096) | [NASA BMNG July 2004](https://visibleearth.nasa.gov/images/73751/july-blue-marble-next-generation-w-topography-and-bathymetry) |
| `night-blackmarble-8k.jpg` | City lights (unused in current full-day shading) | [NASA Black Marble 2016](https://visibleearth.nasa.gov/images/144898/earth-at-night-black-marble-2016-color-maps) |
| `clouds-8k.jpg` | Cloud opacity | [NASA Blue Marble clouds](https://visibleearth.nasa.gov/images/57747/blue-marble-clouds) |
| `specular-8k.jpg` | Ocean / water mask | [NASA SVS land–sea mask](https://svs.gsfc.nasa.gov/3487) |
| `height-8k.jpg` | Elevation (reference bake) | [NASA GEBCO elevation](https://visibleearth.nasa.gov/images/73934/topography) (`gebco_08_rev_elev_21600x10800.png`) |
| `normal-8k.jpg` | OpenGL tangent-space normals from GEBCO | Same (Sobel bake, strength 4.5) |

## Quantum 8K — folder root

| File | Role | Source |
|------|------|--------|
| `day-base-8k.jpg` | Cloud-free surface | [NASA Blue Marble land/ocean/ice](https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography) |
| `night-8k.jpg` / `clouds-8k.jpg` / `specular-8k.jpg` | Night / clouds / water | [Live Cloud Maps](https://clouds.matteason.co.uk/) (NASA-derived, CC0) |

Normals reuse `photoreal/normal-8k.jpg`.

## Journey 2K

See `web/public/assets/journey/earth/`. Normals reuse Photoreal GEBCO bake.

---

NASA imagery is generally not subject to U.S. copyright; credit **NASA Earth Observatory** / **NASA SVS** where appropriate. Live Cloud Maps redistributes under CC0.

Baked locally with [sharp](https://sharp.pixelplumbing.com/). Full-resolution GEBCO source is not kept in the repo.
