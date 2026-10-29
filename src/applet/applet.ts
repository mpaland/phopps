///////////////////////////////////////////////////////////////////////////////
// \author (c) Marco Paland (info@paland.com)
//             2016-2018, PALANDesign Hannover, Germany
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
// \brief applet base class
//
///////////////////////////////////////////////////////////////////////////////

import * as resolvePath from 'object-resolve-path';
import { XmlObj } from '../lib/xmlobjects';
import { Config, Device } from '../provider/config';


export class Applet {
  xmlobj: XmlObj;
  config: Config;

  constructor() {
    this.config = new Config();
    this.xmlobj = new XmlObj();
  }


  // wrapper to get the device
  getDevice(name: string): Device | undefined {
    return this.config.getDevice(name);
  }


  // wrapper to get the phone template
  getTemplate(name: string) {
    return this.config.getTemplate(name);
  }


  // wrapper to get the applet
  getApplet(name: string, apppath: string): any {
    const tmpl = this.getTemplate(name);
    if (tmpl) {
      return resolvePath(tmpl, apppath);
    }
    return undefined;
  }
}
