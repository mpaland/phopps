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
// \brief Web Mercator (EPSG:3857) helpers
//
///////////////////////////////////////////////////////////////////////////////

const R = 6378137;                          // earth radius of the spherical mercator projection
const MAX_LAT = 85.05112878;

export type BBox = [number, number, number, number];   // minx, miny, maxx, maxy in metres

export interface Pixel {
  x: number;
  y: number;
}


/**
 * Project a GPS position to EPSG:3857 metres
 */
export function mercator(lat: number, lon: number): { x: number; y: number } {
  const phi = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI / 180;
  return {
    x: R * lon * Math.PI / 180,
    y: R * Math.log(Math.tan(Math.PI / 4 + phi / 2))
  };
}


/**
 * Metres per pixel of a web map zoom level (256 px tiles)
 */
export function resolution(zoom: number): number {
  return 2 * Math.PI * R / 256 / 2 ** zoom;
}


/**
 * Bounding box of an image of the given pixel size centered at lat/lon
 */
export function bboxForZoom(lat: number, lon: number, zoom: number, width: number, height: number): BBox {
  const center = mercator(lat, lon);
  const res = resolution(zoom);
  return [center.x - width / 2 * res, center.y - height / 2 * res, center.x + width / 2 * res, center.y + height / 2 * res];
}


/**
 * Pixel position of lat/lon inside an image covering bbox, may be outside the image
 */
export function toPixel(lat: number, lon: number, bbox: BBox, width: number, height: number): Pixel {
  const p = mercator(lat, lon);
  return {
    x: (p.x - bbox[0]) / (bbox[2] - bbox[0]) * width,
    y: (bbox[3] - p.y) / (bbox[3] - bbox[1]) * height
  };
}
