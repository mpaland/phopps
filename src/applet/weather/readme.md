Weather

Satellite weather map for a GPS position on the phone display.

- Clouds: EUMETSAT Meteosat Third Generation GeoColour (true colour by day, IR clouds and city lights by night, 10 min updates)
- Rain: DWD precipitation radar (Germany and surroundings, 5 min updates, the magenta line is the radar coverage edge)
- Temperatures: current temperature per place from open-meteo.com, a blue drop marks rain
- Overlays: country borders and coast lines, crosshair at the GPS position, time of the satellite image

All data sources are free and need no API key.

```jsonc
{
  "applet": "weather",
  "name"  : "Wetter Hannover",
  "opt"   : {
    "title" : "Hannover",
    "lat"   : 52.3759,          // GPS position of the map center (required)
    "lon"   : 9.7320,
    "zoom"  : 6,                // 3 (continent) .. 10 (city), web map zoom levels, default 7
    "mode"  : "wide",           // 'wide' = full display, 'normal' = image area, default 'wide'
    "places": [                 // labeled places, default: the center labeled with 'title'
      { "name": "Hannover", "lat": 52.3759, "lon": 9.7320 },
      { "name": "Bremen",   "lat": 53.0793, "lon": 8.8017 }
    ],
    "marker"     : true,        // crosshair at lat/lon
    "temperature": true,        // temperature labels
    "timestamp"  : true,        // time of the satellite image
    "dither"     : false,       // reduce colors to the display depth
    "sources"    : [            // WMS layers drawn bottom up, default:
      { "url": "https://view.eumetsat.int/geoserver/ows", "layers": "mtg_fd:rgb_geocolour,backgrounds:ne_10m_coastline,backgrounds:ne_boundary_lines_land" },
      { "url": "https://maps.dwd.de/geoserver/ows",       "layers": "dwd:Niederschlagsradar" }
    ]
  }
}
```

Places outside the visible map and labels that would overlap are skipped.
The map covers the display size at the zoom level: on a Cisco 7975 (320x168) in Germany zoom 6 shows
about 480 x 250 km, zoom 5 about 960 x 500 km. Each zoom step halves the covered distance.

Other useful layers: `msg_fes:ir108` (EUMETSAT infrared clouds), `dwd:RBSN_T2m` (DWD station temperatures),
`dwd:Satellite_meteosat_1km_euat_rgb_day_hrv_and_night_ir108_3h` (DWD satellite, 3 h updates).

Phones without graphic display get the temperatures as text.
WMS maps are cached for 5 minutes and temperatures for 10 minutes.
