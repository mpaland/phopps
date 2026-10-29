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
// \brief applet base class and the framework independent applet contract
//
///////////////////////////////////////////////////////////////////////////////

import { XmlObj, ModelSpecs, Vendor } from '../lib/xmlobjects.js';
import { Config, Device } from '../provider/config.js';


/**
 * Everything an applet needs to render, independent of the HTTP framework.
 * Built from a Fastify request or by the cron scheduler.
 */
export interface AppletContext {
  config:  Config;
  device:  Device;
  specs:   ModelSpecs;
  vendor:  Vendor;
  applet:  any;                       // the applet configuration from the template
  name:    string;                    // applet name like 'voicemail'
  path:    string;                    // applet path in the template like 'directory.opt.item[3]'
  locale:  string;
  query:   Record<string, string>;    // request query parameters
  baseUrl: string;                    // like 'http://192.168.2.125:1080'
  root:    string;                    // project root directory
  push:    boolean;                   // true if the result is pushed to the phone (cron)
}

export interface AppletResult {
  status?:      number;
  contentType?: string;
  body?:        string | Buffer;
}


export abstract class Applet {
  readonly xmlobj = new XmlObj();

  abstract render(ctx: AppletContext): Promise<AppletResult>;


  /**
   * Build the URL of an applet route, the device name, locale and path are always added
   * @param ctx Current context
   * @param applet Applet name
   * @param path Applet path in the template
   * @param params Additional query parameters
   */
  url(ctx: AppletContext, applet: string, path: string, params: Record<string, string | number> = {}): string {
    const query = new URLSearchParams({ name: ctx.device.name, locale: ctx.locale, path });
    for (const [key, value] of Object.entries(params)) {
      query.set(key, value.toString());
    }
    return ctx.baseUrl + '/applet/' + encodeURIComponent(applet) + '?' + query.toString();
  }


  /**
   * Return a XML result, or push it to the phone in push mode
   */
  async xml(ctx: AppletContext, xml: string): Promise<AppletResult> {
    if (ctx.push) {
      if (!ctx.device.ip) {
        throw new Error("Device '" + ctx.device.name + "' has no IP, push not possible");
      }
      await this.xmlobj.push(ctx.vendor, ctx.device.ip, xml, ctx.device.username, ctx.device.password);
      return { status: 200 };
    }
    return { contentType: 'text/xml; charset=utf-8', body: xml };
  }


  notFound(reason: string): AppletResult {
    console.warn(reason);
    return { status: 404 };
  }
}
