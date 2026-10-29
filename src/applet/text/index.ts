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
// \brief 'text' applet
//
///////////////////////////////////////////////////////////////////////////////

import { Applet } from '../applet';
import { Device } from '../../provider/config';
import * as request from 'request';
import * as htmlToText from 'html-to-text';


class Text extends Applet {

  render(req: any, res: any, locale: string, name: string, apppath: string): void {
    // get device and applet
    const device: Device = this.getDevice(name);
    const applet: any = this.getApplet(name, apppath);
    if (!device || !applet) {
      res.status(404).end();
      return;
    }

    // check if URL is given
    if (typeof applet.opt.url !== 'undefined') {
      // get the content and convert it
      try {
        const options = {
          headers: {
            // simulate browser access, some sites needs this
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36'
          }
        };
        request(applet.opt.url, options, (error: any, response: any, body: any = '') => {
          if (error || (response.statusCode !== 200)) {
            // error opening URL
            res.status(response.statusCode).end();
            return;
          }

          // get title
          const title = applet.opt.title || body.match(/<title>(.*?)<\/title>/gi)[0].replace(/<\/?title>/g, "") || '';
          // get text
          const text = htmlToText.fromString(body);

          res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneText(this.xmlobj.getModelSpecs(device.model).vendor, title, applet.opt.prompt, text));
        });
      }
      catch (e) {
        // error opening URL
        res.status(404).end();
        return;
      }

    }
    else {
      // text is given in config
      res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneText(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title, applet.opt.prompt, applet.opt.text));
    }
  }
}

// export the text applet
export = new Text();
