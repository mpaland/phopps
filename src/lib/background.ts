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
// \brief shared logic of the background applets: pick the image source and render background and thumbnail
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import NodeCache from 'node-cache';
import { AppletContext } from '../applet/applet.js';
import { expandMacros } from './macros.js';
import { convertImage, loadImage, thumbnail } from './imaging.js';


const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|tiff?|webp)$/i;
const cache = new NodeCache();


/**
 * Get the image source: next file of 'opt.dir' (order: random, ascend, descend) or 'opt.url'
 */
export async function pickSource(ctx: AppletContext, key: string): Promise<string> {
  const opt = ctx.applet.opt;
  if (typeof opt.dir !== 'string') {
    return expandMacros(opt.url || '', opt.timeoffset || 0);
  }

  // dir may contain a glob pattern, like 'E:\\Fotos\\**\\*'
  const pattern = opt.dir.replace(/\\/g, '/');
  const isGlob  = /[*?[\]{}]/.test(pattern);
  const files: string[] = [];
  for await (const file of fs.glob(isGlob ? pattern : pattern + '/**/*')) {
    if (IMAGE_EXT.test(file)) {
      files.push(file);
    }
  }
  files.sort();
  if (files.length === 0) {
    throw new Error("No images found in '" + opt.dir + "'");
  }

  const cacheKey = ctx.device.name + '-' + key + '-dir-idx';
  let idx = cache.get<number>(cacheKey) ?? -1;
  switch (opt.order || opt.sel || 'random') {
    case 'random':
      if (files.length > 1) {
        let rnd: number;
        do {
          rnd = Math.floor(Math.random() * files.length);
        } while (rnd === idx);
        idx = rnd;
      }
      else {
        idx = 0;
      }
      break;
    case 'descend':
    case 'decend':
      idx = idx > 0 ? idx - 1 : files.length - 1;
      break;
    case 'ascend':
    default:
      idx = idx < files.length - 1 ? idx + 1 : 0;
  }
  cache.set(cacheKey, idx);
  return files[idx];
}


/**
 * Render background and thumbnail into public/tmp, returns their URLs
 */
export async function renderBackground(ctx: AppletContext, key: string): Promise<{ image: string; thumbnail: string }> {
  const src = await pickSource(ctx, key);
  const screen = { width: ctx.specs.w, height: ctx.specs.h };
  const bg = await convertImage(await loadImage(src), screen, { ...ctx.applet.opt, depth: ctx.specs.dep });
  const tn = await thumbnail(bg, { width: screen.width / 4, height: screen.height / 4 });

  const dir = path.join(ctx.root, 'public', 'tmp');
  const bgFile = ctx.device.name + '-' + key + '-bg.png';
  const tnFile = ctx.device.name + '-' + key + '-tn.png';
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, bgFile), bg);
  await fs.writeFile(path.join(dir, tnFile), tn);
  const t = '?t=' + Date.now();
  return { image: ctx.baseUrl + '/tmp/' + bgFile + t, thumbnail: ctx.baseUrl + '/tmp/' + tnFile + t };
}
