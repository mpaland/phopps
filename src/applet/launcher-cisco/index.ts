///////////////////////////////////////////////////////////////////////////////
// \author (c) Marco Paland (info@paland.com)
//             2016-2017, PALANDesign Hannover, Germany
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

import { Applet } from '../applet';
import { Device } from '../../provider/config';


class Launcher extends Applet {

  render(req: any, res: any, name: string, apppath: string): void {
    // get device and applet
    const device: Device = this.getDevice(name);
    const applet: any = this.getApplet(name, apppath);
    if (!device || !applet) {
      res.status(404).end();
      return;
    }

    const items = [];
    for (let i = 0; i < applet.opt.item.length; i++) {
      items[i] = {};
      items[i].name = applet.opt.item[i].name || "";
      items[i].url  = typeof applet.opt.item[i].url !== 'undefined' ? applet.opt.item[i].url :
                      req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.opt.item[i].applet + "?path=" + apppath + ".opt.item[" + i + "]" + "&name=" + name;
    }

    res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneMenu(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title, applet.opt.prompt, items));
  }
}

// export the launcher applet
export = new Launcher();
