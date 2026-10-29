import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import sharp from 'sharp';
import { convertImage, loadImage, thumbnail } from '../src/lib/imaging.js';


const SOURCE = path.resolve('public', 'img', 'Desktops', 'Fountain.png');
const screen = { width: 298, height: 168 };


describe('convertImage', () => {
  for (const convert of ['original', 'fit', 'fill', 'stretch', 'center']) {
    it('converts with ' + convert + ' to the screen size', async () => {
      const png  = await convertImage(await loadImage(SOURCE), screen, { convert });
      const meta = await sharp(png).metadata();
      expect(meta.format).toBe('png');
      expect({ width: meta.width, height: meta.height }).toEqual(screen);
    });
  }

  it('crops before converting and dithers to the display depth', async () => {
    const png  = await convertImage(await loadImage('file:///' + SOURCE.replace(/\\/g, '/')), screen, { convert: 'stretch', crop: { x: 10, y: 10, width: 50, height: 40 }, dither: true, depth: 4 });
    const meta = await sharp(png).metadata();
    expect({ width: meta.width, height: meta.height }).toEqual(screen);
    expect(meta.isPalette).toBe(true);
    expect(meta.bitsPerSample).toBeLessThanOrEqual(4);
  });

  it('creates thumbnails', async () => {
    const png  = await thumbnail(await convertImage(await loadImage(SOURCE), { width: 320, height: 216 }, { convert: 'fill' }), { width: 80, height: 54 });
    const meta = await sharp(png).metadata();
    expect({ width: meta.width, height: meta.height }).toEqual({ width: 80, height: 54 });
  });
});
