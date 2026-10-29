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
// \brief minimal WMS 1.3.0 client (GetMap in EPSG:3857, layer time) with caching
//
///////////////////////////////////////////////////////////////////////////////

import NodeCache from 'node-cache';
import { BBox } from './geo.js';


export interface MapRequest {
  url:    string;                     // WMS endpoint like https://maps.dwd.de/geoserver/ows
  layers: string;                     // comma separated layer names
  bbox:   BBox;
  width:  number;
  height: number;
}

const mapCache  = new NodeCache({ stdTTL: 300, useClones: false });
const timeCache = new NodeCache({ stdTTL: 300 });


/**
 * Get a transparent PNG of the given layers
 */
export async function getMap(req: MapRequest): Promise<Buffer> {
  const params = new URLSearchParams({
    SERVICE:     'WMS',
    VERSION:     '1.3.0',
    REQUEST:     'GetMap',
    LAYERS:      req.layers,
    STYLES:      '',
    CRS:         'EPSG:3857',
    BBOX:        req.bbox.map(v => v.toFixed(1)).join(','),
    WIDTH:       Math.round(req.width).toString(),
    HEIGHT:      Math.round(req.height).toString(),
    FORMAT:      'image/png',
    TRANSPARENT: 'true'
  });
  const url = req.url + (req.url.includes('?') ? '&' : '?') + params.toString();
  const cached = mapCache.get<Buffer>(url);
  if (cached) {
    return cached;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.startsWith('image/')) {
    const reason = /<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/.exec(body.toString())?.[1]?.trim();
    throw new Error('WMS ' + req.url + ' layers ' + req.layers + ' failed: ' + (reason ?? 'status ' + response.status + ' ' + type));
  }
  mapCache.set(url, body);
  return body;
}


/**
 * Get the current time of a layer from the 'time' dimension of its capabilities,
 * uses the layer specific GeoServer endpoint '<base>/<workspace>/<layer>/ows'
 * @returns the time or undefined if unknown
 */
export async function layerTime(url: string, layer: string): Promise<Date | undefined> {
  const key = url + '|' + layer;
  const cached = timeCache.get<number>(key);
  if (cached !== undefined) {
    return cached ? new Date(cached) : undefined;
  }
  let time: Date | undefined;
  try {
    const [workspace, name] = layer.includes(':') ? layer.split(':') : ['', layer];
    const base = url.split('?')[0].replace(/\/(ows|wms)$/i, '');
    const capsUrl = base + (workspace ? '/' + workspace : '') + '/' + name + '/ows?service=WMS&version=1.3.0&request=GetCapabilities';
    const response = await fetch(capsUrl, { signal: AbortSignal.timeout(10000) });
    time = parseTimeDimension(await response.text());
  }
  catch {
    time = undefined;
  }
  timeCache.set(key, time ? time.getTime() : 0);
  return time;
}


/**
 * Parse the current time of a WMS 'time' dimension: the default value if it is a date,
 * otherwise the last date of the value list or range ('start/end/period')
 */
export function parseTimeDimension(capabilities: string): Date | undefined {
  const match = /<Dimension[^>]*name="time"[^>]*>([^<]*)</.exec(capabilities);
  if (!match) {
    return undefined;
  }
  const dflt = /default="([^"]*)"/.exec(match[0])?.[1] ?? '';
  const iso = /^\d{4}-\d\d-\d\dT[\d:.]+Z$/;
  if (iso.test(dflt)) {
    return new Date(dflt);
  }
  const dates = match[1].split(/[,/]/).map(v => v.trim()).filter(v => iso.test(v));
  return dates.length > 0 ? new Date(dates[dates.length - 1]) : undefined;
}


/**
 * Clear the map and time caches (tests)
 */
export function clearWmsCache(): void {
  mapCache.flushAll();
  timeCache.flushAll();
}
