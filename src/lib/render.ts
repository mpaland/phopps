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
// \brief renders an applet for a device, used by the routes and the cron scheduler
//
///////////////////////////////////////////////////////////////////////////////

import { AppletContext, AppletResult } from '../applet/applet.js';
import { getApplet } from '../applet/registry.js';
import { XmlObj } from './xmlobjects.js';
import { Config } from '../provider/config.js';


export interface RenderRequest {
  config:   Config;
  device:   string;                   // device name
  path:     string;                   // applet path in the device template
  applet?:  string;                   // applet name, taken from the applet config if not given
  locale?:  string;
  query?:   Record<string, string>;
  baseUrl:  string;
  root:     string;
  push?:    boolean;
}

const xmlobj = new XmlObj();


export async function renderApplet(req: RenderRequest): Promise<AppletResult> {
  const device = req.config.getDevice(req.device);
  if (!device) {
    console.warn("Device '" + req.device + "' not found in config.json configuration");
    return { status: 404 };
  }
  if (typeof device.model !== 'string') {
    console.error("Device '" + device.name + "' has no model in config.json configuration");
    return { status: 404 };
  }
  const appletCfg = req.config.getApplet(device.name, req.path);
  if (!appletCfg || typeof appletCfg !== 'object') {
    console.warn("No applet configuration at '" + req.path + "' for device '" + device.name + "'");
    return { status: 404 };
  }
  if (req.applet && appletCfg.applet !== req.applet) {
    console.warn("Path '" + req.path + "' of device '" + device.name + "' is no '" + req.applet + "' applet");
    return { status: 404 };
  }
  const name = req.applet ?? appletCfg.applet;
  const applet = typeof name === 'string' ? getApplet(name) : undefined;
  if (!applet) {
    console.warn("Applet '" + name + "' does not exist");
    return { status: 404 };
  }
  if (!xmlobj.isKnownModel(device.model)) {
    console.warn("Unknown model '" + device.model + "' of device '" + device.name + "', using 7975 specs");
  }
  const specs = xmlobj.getModelSpecs(device.model);
  const ctx: AppletContext = {
    config:  req.config,
    device,
    specs,
    vendor:  specs.vendor,
    applet:  { ...appletCfg, opt: appletCfg.opt ?? {} },
    name,
    path:    req.path,
    locale:  req.locale || 'en',
    query:   req.query ?? {},
    baseUrl: req.baseUrl,
    root:    req.root,
    push:    req.push ?? false
  };
  return applet.render(ctx);
}
