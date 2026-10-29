///////////////////////////////////////////////////////////////////////////////
// \author (c) Marco Paland (info@paland.com)
//             2016-2026, PALANDesign Hannover, Germany
//
// \license The MIT License (MIT)
//
// This file is part of phopps.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// \brief applet 'weather'
//        Satellite weather map for a GPS position: clouds (EUMETSAT Meteosat),
//        precipitation radar (DWD) and current temperatures (open-meteo.com)
//
//        Options:
//          lat, lon     GPS position of the map center (required)
//          zoom         web map zoom level 3 (continent) .. 10 (city), default 7
//          mode         'normal' (image area) or 'wide' (full display), default 'wide'
//          sources      WMS sources drawn in order: [{ "url": "...", "layers": "a,b" }], default see DEFAULT_SOURCES
//          places       labeled positions with temperature: [{ "name", "lat", "lon" }], default the center named by title
//          marker       draw a crosshair at the center position, default true
//          temperature  show current temperatures at the places, default true
//          timestamp    show the time of the satellite image, default true
//          dither       reduce colors to the display depth, default false
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import sharp from 'sharp';
import { format } from 'date-fns';
import { Applet, AppletContext, AppletResult } from '../applet.js';
import { SoftKey } from '../../lib/xmlobjects.js';
import { BBox, bboxForZoom, toPixel } from '../../lib/geo.js';
import { getMap, layerTime } from '../../lib/wms.js';
import { CurrentWeather, currentWeather } from '../../lib/openmeteo.js';
import { convertImage } from '../../lib/imaging.js';


interface Source {
  url:    string;
  layers: string | string[];
}

interface Place {
  name: string;
  lat:  number;
  lon:  number;
}

export const DEFAULT_SOURCES: Source[] = [
  // Meteosat Third Generation GeoColour (true color by day, IR clouds and city lights by night), 10 min updates
  { url: 'https://view.eumetsat.int/geoserver/ows', layers: 'mtg_fd:rgb_geocolour,backgrounds:ne_10m_coastline,backgrounds:ne_boundary_lines_land' },
  // DWD precipitation radar, Germany and surroundings, 5 min updates
  { url: 'https://maps.dwd.de/geoserver/ows', layers: 'dwd:Niederschlagsradar' }
];


function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


function formatTemp(weather?: CurrentWeather): string {
  return weather && Number.isFinite(weather.temperature) ? Math.round(weather.temperature) + '°' : '';
}


class Weather extends Applet {

  async render(ctx: AppletContext): Promise<AppletResult> {
    const opt = ctx.applet.opt;
    const lat = Number(opt.lat);
    const lon = Number(opt.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return this.notFound("Weather applet at '" + ctx.path + "' needs lat and lon");
    }
    const title  = opt.title || ctx.applet.name || 'Weather';
    const zoom   = Math.min(10, Math.max(3, Number(opt.zoom ?? 7)));
    const mode   = opt.mode || 'wide';
    const places: Place[] = Array.isArray(opt.places) ? opt.places : [{ name: opt.title || '', lat, lon }];
    const screen = {
      width:  mode === 'wide' ? ctx.specs.w : ctx.specs.imgw,
      height: ctx.specs.imgh
    };

    // current temperatures, the map is still useful without them
    let weather: CurrentWeather[] = [];
    if (opt.temperature !== false || screen.width === 0 || screen.height === 0) {
      try {
        weather = await currentWeather(places);
      }
      catch (e) {
        console.warn('Weather temperatures failed: ' + e);
      }
    }

    if (screen.width === 0 || screen.height === 0) {
      // phone without graphic display
      const text = places.map((place, i) => place.name + ': ' + (formatTemp(weather[i]) || '-') +
        (weather[i]?.precipitation ? ', ' + weather[i].precipitation + ' mm' : '')).join('\n');
      return this.xml(ctx, this.xmlobj.IPPhoneText(ctx.vendor, title, opt.prompt, text, this.softkeys(ctx)));
    }

    let png: Buffer;
    try {
      png = await this.map(ctx, lat, lon, zoom, screen, places, weather);
    }
    catch (e) {
      console.error('Weather map of ' + ctx.device.name + ' failed: ' + e);
      return this.xml(ctx, this.xmlobj.IPPhoneText(ctx.vendor, title, opt.prompt, 'Weather not available', this.softkeys(ctx)));
    }

    const file = ctx.device.name + '-weather.png';
    await fs.mkdir(path.join(ctx.root, 'public', 'tmp'), { recursive: true });
    await fs.writeFile(path.join(ctx.root, 'public', 'tmp', file), png);
    const url = ctx.baseUrl + '/tmp/' + file + '?t=' + Date.now();
    return this.xml(ctx, this.xmlobj.IPPhoneImageFile(ctx.vendor, title, opt.prompt, mode, 0, 0, url, this.softkeys(ctx)));
  }


  // render the map: WMS layers, then the overlay
  private async map(ctx: AppletContext, lat: number, lon: number, zoom: number, screen: { width: number; height: number },
                    places: Place[], weather: CurrentWeather[]): Promise<Buffer> {
    const opt = ctx.applet.opt;
    const sources: Source[] = Array.isArray(opt.sources) && opt.sources.length > 0 ? opt.sources : DEFAULT_SOURCES;
    const bbox = bboxForZoom(lat, lon, zoom, screen.width, screen.height);

    const layers = (source: Source) => Array.isArray(source.layers) ? source.layers.join(',') : source.layers;
    const maps = await Promise.allSettled(sources.map(source =>
      getMap({ url: source.url, layers: layers(source), bbox, width: screen.width, height: screen.height })));
    maps.forEach(result => {
      if (result.status === 'rejected') {
        console.warn(String(result.reason));
      }
    });
    const images = maps.filter((r): r is PromiseFulfilledResult<Buffer> => r.status === 'fulfilled').map(r => r.value);
    if (images.length === 0) {
      throw new Error('No weather layer available');
    }

    let time: Date | undefined;
    if (opt.timestamp !== false) {
      time = await layerTime(sources[0].url, layers(sources[0]).split(',')[0]) ?? new Date();
    }

    const overlay = this.overlay(screen, bbox, lat, lon, opt.marker !== false, opt.temperature !== false ? places : [], weather, time);
    const composed = await sharp({ create: { width: screen.width, height: screen.height, channels: 4, background: '#000000' } })
      .composite([...images.map(input => ({ input })), { input: Buffer.from(overlay) }])
      .png()
      .toBuffer();
    return convertImage(composed, screen, { dither: opt.dither, depth: ctx.specs.dep });
  }


  // SVG overlay with marker, place labels and timestamp
  private overlay(screen: { width: number; height: number }, bbox: BBox, lat: number, lon: number, marker: boolean,
                  places: Place[], weather: CurrentWeather[], time?: Date): string {
    const { width, height } = screen;
    const fsize   = Math.max(9, Math.round(width / 28));
    const pad  = Math.round(fsize / 3);
    const text = (x: number, y: number, label: string, anchor = 'start') =>
      '<text x="' + x + '" y="' + y + '" font-family="Arial, Helvetica, sans-serif" font-size="' + fsize + '" font-weight="bold" fill="#000" text-anchor="' + anchor + '">' + escape(label) + '</text>';
    const pill = (x: number, y: number, w: number) =>
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (fsize + 2 * pad) + '" rx="' + pad + '" fill="#ffffff" fill-opacity="0.8"/>';
    const used: Array<{ x: number; y: number; w: number; h: number }> = [];
    let svg = '';

    if (marker) {
      const c = toPixel(lat, lon, bbox, width, height);
      const r = Math.round(fsize / 2);
      svg += '<g stroke="#ff2020" stroke-width="2" fill="none"><circle cx="' + c.x + '" cy="' + c.y + '" r="' + r + '"/>' +
             '<path d="M' + (c.x - 2 * r) + ' ' + c.y + 'H' + (c.x - r / 2) + 'M' + (c.x + r / 2) + ' ' + c.y + 'H' + (c.x + 2 * r) +
             'M' + c.x + ' ' + (c.y - 2 * r) + 'V' + (c.y - r / 2) + 'M' + c.x + ' ' + (c.y + r / 2) + 'V' + (c.y + 2 * r) + '"/></g>';
    }

    if (time) {
      const label = format(time, 'HH:mm');
      const w = Math.round(label.length * fsize * 0.6) + 2 * pad;
      const h = fsize + 2 * pad;
      used.push({ x: width - w - 2, y: height - h - 2, w, h });
      svg += pill(width - w - 2, height - h - 2, w) + text(width - 2 - pad, height - 2 - pad - fsize * 0.15, label, 'end');
    }

    places.forEach((place, i) => {
      const p = toPixel(place.lat, place.lon, bbox, width, height);
      if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) {
        return;
      }
      const label = [place.name, formatTemp(weather[i])].filter(Boolean).join(' ');
      if (!label) {
        return;
      }
      const rain = (weather[i]?.precipitation ?? 0) > 0;
      const w    = Math.round(label.length * fsize * 0.6) + 2 * pad + (rain ? fsize : 0);
      const h    = fsize + 2 * pad;
      // label right of the point, left if it does not fit or overlaps, skipped if both overlap
      const y = Math.min(Math.max(0, p.y - h / 2), height - h);
      const fits = (lx: number) => lx >= 0 && lx + w <= width && !used.some(r => lx < r.x + r.w && lx + w > r.x && y < r.y + r.h && y + h > r.y);
      const x = [p.x + fsize / 2, p.x - fsize / 2 - w].find(fits);
      if (x === undefined) {
        return;
      }
      used.push({ x, y, w, h });
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + Math.max(2, fsize / 5) + '" fill="#000" stroke="#fff"/>';
      svg += pill(x, y, w) + text(x + pad, y + pad + fsize * 0.85, label);
      if (rain) {
        // rain drop
        const dx = x + w - pad - fsize / 2;
        const dy = y + pad;
        svg += '<path d="M' + dx + ' ' + dy + 'C' + (dx + fsize * 0.45) + ' ' + (dy + fsize * 0.5) + ' ' + (dx + fsize * 0.35) + ' ' + (dy + fsize) + ' ' + dx + ' ' + (dy + fsize) +
               'C' + (dx - fsize * 0.35) + ' ' + (dy + fsize) + ' ' + (dx - fsize * 0.45) + ' ' + (dy + fsize * 0.5) + ' ' + dx + ' ' + dy + 'Z" fill="#1e64ff"/>';
      }
    });

    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' + svg + '</svg>';
  }


  private softkeys(ctx: AppletContext): SoftKey[] {
    return [
      { name: 'Refresh', url: this.url(ctx, 'weather', ctx.path), position: 1 },
      { name: 'Exit',    url: 'SoftKey:Exit',                       position: 3 }
    ];
  }
}

// export the weather applet
export default new Weather();
