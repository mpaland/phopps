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
// \brief config provider
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cjson from 'comment-json';


export interface Device {
  name:      string;    // phone name like 'SEP002123F01CFA'
  ip?:       string;    // phone IP like '192.168.2.161'
  model:     string;    // phone model like '7975'
  username?: string;    // username for authentication
  password?: string;    // password for authentication
  template:  string;    // template file name for the phone like 'phone_marco'
}

export interface HostConfig {
  host: string;
  port: number;
}

interface ConfigData {
  host?:  string;
  port?:  number | string;
  device: Device[];
}


/**
 * Resolve a path like 'directory.opt.item[3]' or "phone['SEP01'].cron[0]" inside an object.
 * Only own properties are followed, so prototype keys cannot be reached.
 */
export function resolvePath(obj: unknown, objpath: string): any {
  const re = /\[(\d+)\]|\['([^']*)'\]|\["([^"]*)"\]|([^.[\]]+)/g;
  let cur: any = obj;
  let match: RegExpExecArray | null;
  let consumed = 0;
  while ((match = re.exec(objpath)) !== null) {
    // only dots may separate tokens
    if (objpath.slice(consumed, match.index).replace(/\./g, '') !== '') {
      return undefined;
    }
    consumed = match.index + match[0].length;
    const key = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (cur === null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, key)) {
      return undefined;
    }
    cur = cur[key];
  }
  if (consumed !== objpath.length || objpath.length === 0) {
    return undefined;
  }
  return cur;
}


// config provider
export class Config {
  readonly dir: string;
  private data: ConfigData;
  private templates = new Map<string, { mtime: number; data: any }>();

  /**
   * @param dir Config directory containing config.json and the phone templates
   */
  constructor(dir: string = path.resolve('config')) {
    this.dir  = dir;
    this.data = cjson.parse(fs.readFileSync(path.join(dir, 'config.json')).toString()) as unknown as ConfigData;
    if (!Array.isArray(this.data.device)) {
      this.data.device = [];
    }
  }


  getHost(): HostConfig {
    return { host: this.data.host || '',
             port: Number(this.data.port || process.env.PORT || 1080)
           };
  }


  /**
   * Get device by name
   * @param name Device name like SEP089898232
   */
  getDevice(name: string): Device | undefined {
    return this.data.device.find(o => o.name === name);
  }


  /**
   * Get all configured devices
   */
  getDevices(): Device[] {
    return this.data.device;
  }


  /**
   * Get the (cached) template of the given device, the file is re-read when it changed
   * @param name Device name
   */
  getTemplate(name: string): any {
    const device = this.getDevice(name);
    if (!device || typeof device.template !== 'string' || !/^[\w.-]+$/.test(device.template)) {
      return undefined;
    }
    const file = path.join(this.dir, device.template + '.json');
    try {
      const mtime = fs.statSync(file).mtimeMs;
      const cached = this.templates.get(file);
      if (cached && cached.mtime === mtime) {
        return cached.data;
      }
      const data = cjson.parse(fs.readFileSync(file).toString());
      this.templates.set(file, { mtime, data });
      return data;
    }
    catch (e) {
      console.error("Template '" + device.template + "' of device '" + device.name + "' not readable: " + e);
      return undefined;
    }
  }


  /**
   * Get the applet configuration of a device by its path in the template
   * @param name Device name
   * @param apppath Path like 'directory.opt.item[3]'
   */
  getApplet(name: string, apppath: string): any {
    const tmpl = this.getTemplate(name);
    return tmpl ? resolvePath(tmpl, apppath) : undefined;
  }
}
