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
// \brief applet 'launcher-cisco'
//
///////////////////////////////////////////////////////////////////////////////

import { Applet, AppletContext, AppletResult } from '../applet.js';
import { menuItems } from '../menu/index.js';


class Launcher extends Applet {

  async render(ctx: AppletContext): Promise<AppletResult> {
    if (!Array.isArray(ctx.applet.opt.item)) {
      return this.notFound("Launcher at '" + ctx.path + "' has no items");
    }
    return this.xml(ctx, this.xmlobj.IPPhoneMenu(ctx.vendor, ctx.applet.opt.title, ctx.applet.opt.prompt, menuItems(this, ctx)));
  }
}

// export the launcher applet
export default new Launcher();
