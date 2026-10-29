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
// \brief applet 'image'
//        Displays an image of an URL, see lib/imaging.ts for the convert options
//        and lib/macros.ts for the URL macros
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Applet, AppletContext, AppletResult } from '../applet.js';
import { expandMacros } from '../../lib/macros.js';
import { convertImage, loadImage } from '../../lib/imaging.js';


class Image extends Applet {

  async render(ctx: AppletContext): Promise<AppletResult> {
    const opt  = ctx.applet.opt;
    const x    = opt.x || 0;
    const y    = opt.y || 0;
    const mode = opt.mode || 'normal';

    if (typeof opt.url !== 'string') {
      return this.notFound("Image applet at '" + ctx.path + "' has no url");
    }
    const url = expandMacros(opt.url, opt.timeoffset || 0);

    if (opt.convert === 'direct') {
      // set direct image URL
      return this.xml(ctx, this.xmlobj.IPPhoneImageFile(ctx.vendor, opt.title, opt.prompt, mode, x, y, url));
    }

    const screen = {
      width:  mode === 'wide' ? ctx.specs.w : ctx.specs.imgw,
      height: ctx.specs.imgh
    };
    let png: Buffer;
    try {
      png = await convertImage(await loadImage(url), screen, { ...opt, depth: ctx.specs.dep });
    }
    catch (e) {
      return this.notFound('Image ' + url + ' failed: ' + e);
    }

    const file = ctx.device.name + '-image.png';
    await fs.mkdir(path.join(ctx.root, 'public', 'tmp'), { recursive: true });
    await fs.writeFile(path.join(ctx.root, 'public', 'tmp', file), png);
    const imgUrl = ctx.baseUrl + '/tmp/' + file + '?t=' + Date.now();
    return this.xml(ctx, this.xmlobj.IPPhoneImageFile(ctx.vendor, opt.title, opt.prompt, mode, x, y, imgUrl));
  }
}

// export the image applet
export default new Image();
