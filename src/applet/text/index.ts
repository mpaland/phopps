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
// \brief applet 'text'
//
///////////////////////////////////////////////////////////////////////////////

import { Applet, AppletContext, AppletResult } from '../applet.js';
import { convert } from 'html-to-text';


// simulate browser access, some sites need this
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';


class Text extends Applet {

  async render(ctx: AppletContext): Promise<AppletResult> {
    const opt = ctx.applet.opt;

    if (typeof opt.url !== 'string') {
      // text is given in config
      return this.xml(ctx, this.xmlobj.IPPhoneText(ctx.vendor, opt.title, opt.prompt, opt.text ?? ''));
    }

    // get the content and convert it
    let body: string;
    try {
      const response = await fetch(opt.url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        return this.notFound('Loading ' + opt.url + ' failed with status ' + response.status);
      }
      body = await response.text();
    }
    catch (e) {
      return this.notFound('Loading ' + opt.url + ' failed: ' + e);
    }

    const title = opt.title || /<title[^>]*>(.*?)<\/title>/is.exec(body)?.[1]?.trim() || '';
    const text  = convert(body, { wordwrap: false });
    return this.xml(ctx, this.xmlobj.IPPhoneText(ctx.vendor, title, opt.prompt, text));
  }
}

// export the text applet
export default new Text();
