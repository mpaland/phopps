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
// \brief image loading and conversion for the phone displays (sharp based)
//
// convert options:
// direct:   no processing, use the direct img url
// original: original dimensions at top/left
// fit:      the bigger dimension fits, the smaller one has black strips, maintain aspect ratio
// fill:     the smaller dimension fits, the bigger one is cropped, maintain aspect ratio
// stretch:  both dimensions are resized, aspect ratio is distorted
// center:   original dimensions, centered image, bigger parts are cut off
// crop:     { x, y, width, height }, crop the original image before size conversion
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp, { Sharp } from 'sharp';


export interface ConvertOptions {
  convert?: string;
  crop?:    { x?: number; y?: number; width?: number; height?: number };
  enhance?: boolean;
  dither?:  boolean;
  depth?:   number;                   // color depth of the display in bits
}

export interface Size {
  width:  number;
  height: number;
}

// simulate browser access, some sites need this
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';


/**
 * Load an image from a http(s) URL, a file:// URL or a local path
 */
export async function loadImage(src: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(src)) {
    const response = await fetch(src, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      throw new Error('Loading ' + src + ' failed with status ' + response.status);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return fs.readFile(src.startsWith('file:') ? fileURLToPath(src) : src);
}


/**
 * Convert an image for the given screen size, returns a PNG
 */
export async function convertImage(input: Buffer, screen: Size, opt: ConvertOptions = {}): Promise<Buffer> {
  // auto orient according to EXIF data
  let buf = await sharp(input).rotate().toBuffer();
  const meta = await sharp(buf).metadata();
  let size: Size = { width: meta.width ?? 0, height: meta.height ?? 0 };

  // crop original image
  if (opt.crop) {
    const left = clamp(opt.crop.x ?? 0, 0, size.width - 1);
    const top  = clamp(opt.crop.y ?? 0, 0, size.height - 1);
    const region = {
      left,
      top,
      width:  clamp(opt.crop.width  ?? size.width,  1, size.width  - left),
      height: clamp(opt.crop.height ?? size.height, 1, size.height - top)
    };
    buf  = await sharp(buf).extract(region).toBuffer();
    size = { width: region.width, height: region.height };
  }

  let img = sharp(buf);
  if (screen.width > 0 && screen.height > 0) {
    switch (opt.convert) {
      case 'original':
        img = cutout(img, size, screen, 0, 0);
        break;
      case 'fit':
        img = img.resize(screen.width, screen.height, { fit: 'contain', background: '#000000' });
        break;
      case 'fill':
        img = img.resize(screen.width, screen.height, { fit: 'cover' });
        break;
      case 'stretch':
        img = img.resize(screen.width, screen.height, { fit: 'fill' });
        break;
      case 'center':
        img = cutout(img, size, screen, Math.floor((size.width - screen.width) / 2), Math.floor((size.height - screen.height) / 2));
        break;
      default:
        // no resizing
    }
  }

  if (opt.enhance) {
    img = img.normalise();
  }
  const colors = 2 ** (opt.depth ?? 24);
  if (opt.dither && colors <= 256) {
    return img.png({ palette: true, colors, dither: 1.0 }).toBuffer();
  }
  return img.png().toBuffer();
}


/**
 * Create a thumbnail of a PNG
 */
export async function thumbnail(input: Buffer, size: Size): Promise<Buffer> {
  return sharp(input).resize(Math.max(1, Math.round(size.width)), Math.max(1, Math.round(size.height)), { fit: 'fill' }).normalise().png().toBuffer();
}


// cut out a screen sized region at x/y, areas outside the image are black
function cutout(img: Sharp, size: Size, screen: Size, x: number, y: number): Sharp {
  const left   = Math.max(0, x);
  const top    = Math.max(0, y);
  const width  = Math.min(screen.width,  size.width  - left);
  const height = Math.min(screen.height, size.height - top);
  return img
    .extract({ left, top, width, height })
    .extend({
      left:   Math.max(0, -x),
      top:    Math.max(0, -y),
      right:  Math.max(0, screen.width  - width  - Math.max(0, -x)),
      bottom: Math.max(0, screen.height - height - Math.max(0, -y)),
      background: '#000000'
    });
}


function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
