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
// \brief current weather of GPS positions from open-meteo.com (free, no API key)
//
///////////////////////////////////////////////////////////////////////////////

import NodeCache from 'node-cache';


export interface Position {
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  temperature:   number;              // °C
  precipitation: number;              // mm
}

const API = 'https://api.open-meteo.com/v1/forecast';
const cache = new NodeCache({ stdTTL: 600 });


/**
 * Current temperature and precipitation of all positions, in one request
 */
export async function currentWeather(points: Position[]): Promise<CurrentWeather[]> {
  if (points.length === 0) {
    return [];
  }
  const params = new URLSearchParams({
    latitude:  points.map(p => p.lat.toFixed(4)).join(','),
    longitude: points.map(p => p.lon.toFixed(4)).join(','),
    current:   'temperature_2m,precipitation'
  });
  const url = API + '?' + params.toString();
  const cached = cache.get<CurrentWeather[]>(url);
  if (cached) {
    return cached;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error('open-meteo failed with status ' + response.status);
  }
  const json = await response.json() as any;
  // a single position returns an object, several an array
  const result = [json].flat().map((entry: any): CurrentWeather => ({
    temperature:   Number(entry?.current?.temperature_2m),
    precipitation: Number(entry?.current?.precipitation) || 0
  }));
  cache.set(url, result);
  return result;
}


/**
 * Clear the weather cache (tests)
 */
export function clearWeatherCache(): void {
  cache.flushAll();
}
