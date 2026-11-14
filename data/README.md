# Data

Large terrain files are **not stored in Git**. Download them from NASA PGDA and pass their
path to the scripts. The site catalogue is in [`sites/sites.json`](sites/sites.json).

## LOLA south-pole elevation models available to the team

Source: NASA GSFC PGDA, LOLA south polar products. The `LDEM_80S_*` files come from
<https://pgda.gsfc.nasa.gov/products/90> (Barker et al. 2023). **To verify:** the exact product
page and citation for `LDEM_83S_10MPP_ADJ` and the `*_60S_240MPP_*` files.
All are polar stereographic, float32, tiled GeoTIFFs with overviews (read with rasterio
on 2026-11-14); elevations in metres relative to a 1737.4 km sphere.

| File | Pixel | Grid (px) | Extent from pole | Size | Notes |
|---|---|---|---|---|---|
| `LDEM_80S_80MPP_ADJ.tiff` | 80 m | 7 600² | ±304 km (to ~80° S) | 189 MB | used for all validated results so far |
| `LDEM_80S_40MPP_ADJ.tiff` | 40 m | 15 200² | ±304 km | 716 MB | |
| `LDEM_80S_20MPP_ADJ.tiff` | 20 m | 30 400² | ±304 km | 2.7 GB | not yet tested |
| `LDEM_83S_10MPP_ADJ.tiff` | 10 m | 43 280² | ±216 km (to ~83° S) | 5.1 GB | not yet tested |
| `LDEM_60S_240MPP_ADJ.tiff` | 240 m | 7 760² | ±931 km (to ~60° S) | 219 MB | wide context / 3D globe |
| `LDEC_60S_240MPP_ADJ.tiff` | 240 m | 7 760² | ±931 km | 137 MB | **counts** (observations per pixel), not elevations — data-quality layer |

Extents are the square bounds of each grid; the latitude in brackets is approximate.

### How the resolutions could be used (to be decided)

- **Horizon mask**: the distant skyline (up to 150 km) does not need fine pixels; the near
  terrain does. A future option is to combine a fine DEM near the site with the 80 m DEM far away.
- **3D terrain view**: downsample a small window (a few km) from the 20 m or 10 m file.
- **Global view**: 240 m file, heavily downsampled.
- **Data-quality indicator**: the `LDEC` counts file.

## Official feature coordinates (site catalogue, `iau_*` sites)

Source: IAU / USGS *Gazetteer of Planetary Nomenclature*, file `MOON_nomenclature_center_pts.zip`
(<https://planetarynames.wr.usgs.gov/shapefiles/MOON_nomenclature_center_pts.zip>, 23.8 MB,
downloaded 2026-11-14). Metadata: "Planetary Nomenclature of the Moon", origin International Astronomical
Union (IAU) and USGS, use constraints "Public domain".

- Values used: `center_lat`, `center_lon` (east longitude 0–360 in the file, converted to −180..180).
- A crater's centre point is on the crater **floor**, not the rim. No official rim or landing-region
  coordinates were found (Nobile Rim 1, de Gerlache Rim 2, Shackleton connecting ridge), so none were added.
- Amundsen (−84.4398°, 83.0691°) was not added: the 150 km terrain horizon does not fit in the 80 m map there.

## NASA polar illumination maps (validation only)

`AVGVISIB_85S_060M_201608.TIF` (Sun) and `AVGVISIB_85S_060M_201608_EARTH.TIF` (Earth),
<https://pgda.gsfc.nasa.gov/products/69> (Mazarico et al. 2011), about 60 MB together.
Used by [`../validation/verify_illumination.py`](../validation/verify_illumination.py).
