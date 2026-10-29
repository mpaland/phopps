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
// \brief Congig provider
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'fs';
import * as cjson from 'comment-json';


export interface Device {
  name:     string;   // phone name like 'SEP002123F01CFA'
  ip:       string;   // phone IP like '192.168.2.161'
  model:    string;   // phone model like '7975'
  username: string;   // username for authentication
  password: string;   // password for authentication
  template: string;   // template file name for the phone like 'tpl_phone_marco.json'
}


// config provider
export class Config {
  private data: {
    host?:  string;
    port:   string;
    device: Array<Device>;
  }

  constructor() {
    this.data = cjson.parse(fs.readFileSync("./config/config.json").toString());
  }


  getHost(): any {
    return { host: this.data.host || '',
             port: this.data.port
           };
  }


  /**
   * Get device by name
   * @param name Device name like SEP089898232
   */
  getDevice(name: string): Device | undefined {
    const device = this.data.device.find(o => o.name === name);
    if (!device) {
      // device does not exist
      console.warn("Device '" + name + "' not found in config.json configuration");
      return undefined;
    }
    return device;
  }


  /**
   * Get device by index
   * @param idx Device index in config
   */
  getDeviceByIdx(idx: number): Device | undefined {
    const device: Device = this.data.device[idx];
    if (!device) {
      // device does not exist
      return undefined;
    }
    return device;
  }


  getTemplate(name: string) {
    const device = this.getDevice(name);
    if (!device) {
      return undefined;
    }
    try {
      return cjson.parse(fs.readFileSync("./config/" + device.template.toString() + ".json").toString());
    }
    catch (e) {
      console.error("Template '" + device.template + "' of device '" + device.name + "' not found");
      return undefined;
    }
  }
}
