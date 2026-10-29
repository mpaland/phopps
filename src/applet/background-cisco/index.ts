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
// \brief applet 'background-cisco'
//        Sets the background image of a Cisco phone, typically used as cron job.
//        IMPORTANT: <phonePersonalization>1</phonePersonalization> must be set in the phone config
//
///////////////////////////////////////////////////////////////////////////////

import { Applet, AppletContext, AppletResult } from '../applet.js';
import { renderBackground } from '../../lib/background.js';


class BackgroundCisco extends Applet {

  async render(ctx: AppletContext): Promise<AppletResult> {
    let urls: { image: string; thumbnail: string };
    try {
      urls = await renderBackground(ctx, 'background-cisco');
    }
    catch (e) {
      return this.notFound('Background of ' + ctx.device.name + ' failed: ' + e);
    }
    return this.xml(ctx, this.xmlobj.CiscoSetBackground(urls.image, urls.thumbnail));
  }
}

// export the background applet
export default new BackgroundCisco();
