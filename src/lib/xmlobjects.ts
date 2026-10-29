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
// \brief Cisco / Snom XML object generator
//
///////////////////////////////////////////////////////////////////////////////

import * as http from 'node:http';


// icon item resources (Cisco internal icons)
export enum IconItemResource {
  Connected         = 'Resource:Icon.Connected',
  AuthenticatedCall = 'Resource:Icon.AuthenticatedCall',
  SecureCall        = 'Resource:Icon.SecureCall',
  OnHook            = 'Resource:Icon.OnHook',
  OffHook           = 'Resource:Icon.OffHook',
  Messages          = 'Resource:Icon.Messages',
  InUse             = 'Resource:Icon.InUse',
  Headset           = 'Resource:Icon.Headset',
  Handset           = 'Resource:Icon.Handset',
  Speaker           = 'Resource:Icon.Speaker',
  Locked            = 'Resource:Icon.Locked',
  UnLocked          = 'Resource:Icon.UnLocked',
  Checked           = 'Resource:Icon.Checked',
  UnChecked         = 'Resource:Icon.UnChecked',
  RadioButtonOn     = 'Resource:Icon.RadioButtonOn',
  RadioButtonOff    = 'Resource:Icon.RadioButtonOff',
  Ringin            = 'Resource:AnimatedIcon.Ringin',
  Hold              = 'Resource:AnimatedIcon.Hold',
  MessageWaiting    = 'Resource:AnimatedIcon.MessageWaiting',
  StreamingRx       = 'Resource:AnimatedIcon.StreamingRx',
  StreamingTx       = 'Resource:AnimatedIcon.StreamingTx',
  StreamRxTx        = 'Resource:AnimatedIcon.StreamRxTx',
  Throbber          = 'Resource:AnimatedIcon.Throbber'
}


export type Vendor = 'Cisco' | 'Snom';

export interface ModelSpecs {
  vendor: Vendor;     // vendor like 'Cisco' or 'Snom'
  w:      number;     // total width of the display
  h:      number;     // total height of the display
  imgw:   number;     // width of the image area, 0 if a status area is not available
  imgh:   number;     // height of the image area, 0 if a status area is not available
  sw:     number;     // width of the status area, 0 if a status area is not available
  sh:     number;     // height of the status area, 0 if a status area is not available
  color:  boolean;    // true for a color display
  dep:    number;     // color depth of the display in bits
  keys:   number;     // number of available softkeys
}

export interface SoftKey {
  name:     string;   // displayed label
  url:      string;   // URL or URI (Cisco: 'SoftKey:Exit', 'Dial:123', 'QueryStringParam:a=b', ...)
  position: number;   // 1-based softkey position
  urldown?: string;   // Cisco only: URI for the press event
  softkey?: string;   // Snom only: built-in softkey function like 'F_ABORT'
}

export interface MenuItem {
  name:     string;
  url:      string;
  icon?:    number;   // icon index for icon menus
  touch?: {
    top:    number;
    left:   number;
    right:  number;
    bottom: number;
  };
}

export interface IconItem {
  index:    number;
  url:      string;
}

export interface InputItem {
  name:     string;
  param:    string;
  default?: string;
  flags?:   string;
}

export interface DirectoryItem {
  name:     string;
  phone:    string;
}


/**
 * Phone model hardware data
 */
const MODELS: Record<string, ModelSpecs> = {
  // Cisco SPA500 models
  'SPA525': { vendor: 'Cisco', w: 320, h: 240, imgw: 100, imgh: 160, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
  // Cisco 6900 models
  '6921': { vendor: 'Cisco', w: 0, h: 0, imgw: 396, imgh: 81, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
  '6941': { vendor: 'Cisco', w: 0, h: 0, imgw: 396, imgh: 162, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
  '6945': { vendor: 'Cisco', w: 0, h: 0, imgw: 396, imgh: 162, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
  '6961': { vendor: 'Cisco', w: 0, h: 0, imgw: 396, imgh: 81, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
  // Cisco 7800 models
  '7811': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7821': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7832': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7841': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7861': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  // Cisco 7900 models
  '7905': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7906': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7911': { vendor: 'Cisco', w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7912': { vendor: 'Cisco', w: 0, h: 0, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7920': { vendor: 'Cisco', w: 0, h: 0, imgw: 128, imgh: 59, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7921': { vendor: 'Cisco', w: 0, h: 0, imgw: 176, imgh: 140, sw: 150, sh: 50, color: true, dep: 16, keys: 2 },
  '7925': { vendor: 'Cisco', w: 0, h: 0, imgw: 176, imgh: 140, sw: 150, sh: 50, color: true, dep: 16, keys: 2 },
  '7926': { vendor: 'Cisco', w: 0, h: 0, imgw: 176, imgh: 140, sw: 150, sh: 50, color: true, dep: 16, keys: 2 },
  '7931': { vendor: 'Cisco', w: 0, h: 0, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
  '7937': { vendor: 'Cisco', w: 0, h: 0, imgw: 255, imgh: 128, sw: 133, sh: 65, color: false, dep: 2, keys: 2 },
  '7940': { vendor: 'Cisco', w: 320, h: 196, imgw: 133, imgh: 65, sw: 106, sh: 21, color: false, dep: 2, keys: 4 },
  '7941': { vendor: 'Cisco', w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
  '7942': { vendor: 'Cisco', w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
  '7945': { vendor: 'Cisco', w: 320, h: 212, imgw: 298, imgh: 156, sw: 252, sh: 50, color: true, dep: 16, keys: 4 },
  '7960': { vendor: 'Cisco', w: 320, h: 196, imgw: 133, imgh: 65, sw: 106, sh: 21, color: false, dep: 2, keys: 4 },
  '7961': { vendor: 'Cisco', w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
  '7962': { vendor: 'Cisco', w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
  '7965': { vendor: 'Cisco', w: 320, h: 212, imgw: 298, imgh: 156, sw: 252, sh: 50, color: true, dep: 16, keys: 4 },
  '7970': { vendor: 'Cisco', w: 320, h: 212, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 12, keys: 5 },
  '7971': { vendor: 'Cisco', w: 320, h: 212, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 12, keys: 5 },
  '7975': { vendor: 'Cisco', w: 320, h: 216, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 16, keys: 5 },
  'comm': { vendor: 'Cisco', w: 320, h: 212, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 24, keys: 5 },
  // Cisco 8800 models
  '8811': { vendor: 'Cisco', w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: false, dep: 10, keys: 5 },
  '8821': { vendor: 'Cisco', w: 640, h: 480, imgw: 240, imgh: 215, sw: 262, sh: 50, color: true, dep: 24, keys: 5 },
  '8831': { vendor: 'Cisco', w: 640, h: 480, imgw: 396, imgh: 162, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
  '8832': { vendor: 'Cisco', w: 640, h: 480, imgw: 480, imgh: 128, sw: 262, sh: 50, color: true, dep: 24, keys: 5 },
  '8841': { vendor: 'Cisco', w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
  '8845': { vendor: 'Cisco', w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
  '8851': { vendor: 'Cisco', w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
  '8861': { vendor: 'Cisco', w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
  '8865': { vendor: 'Cisco', w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
  // Cisco 8900 models
  '8941': { vendor: 'Cisco', w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
  '8945': { vendor: 'Cisco', w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
  '8961': { vendor: 'Cisco', w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
  // Cisco 9900 models
  '9951': { vendor: 'Cisco', w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
  '9971': { vendor: 'Cisco', w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
  // Snom models
  '760': { vendor: 'Snom', w: 320, h: 240, imgw: 320, imgh: 240, sw: 262, sh: 50, color: true, dep: 16, keys: 4 },
  '765': { vendor: 'Snom', w: 320, h: 240, imgw: 320, imgh: 240, sw: 262, sh: 50, color: true, dep: 16, keys: 4 }
};

// Snom equivalents of the Cisco softkey URIs
const SNOM_SOFTKEY: Record<string, string> = {
  'SoftKey:Exit':   'F_ABORT',
  'SoftKey:Back':   'F_CANCEL',
  'SoftKey:Cancel': 'F_CANCEL',
  'SoftKey:Select': 'F_ENTER'
};


export class XmlObj {

  // use UTF-8 as default encoding
  private readonly encoding = '<?xml version="1.0" encoding="utf-8" ?>';


  /**
   * Returns the model specifications, unknown models fall back to a Cisco 7975
   * @param name Model name
   */
  getModelSpecs(name: string): ModelSpecs {
    return MODELS[name] ?? MODELS['7975'];
  }


  /**
   * Returns true if the model is known
   */
  isKnownModel(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(MODELS, name);
  }


  /**
   * IPPhoneText
   * Displays ordinary text on the phone display.
   */
  IPPhoneText(vendor: Vendor, title: string = '', prompt: string = '', text: string = '', softkeys?: SoftKey[]): string {
    return this.encoding + this.xml(vendor + 'IPPhoneText', '', this.header(title, prompt) +
           this.xml('Text', text) +
           this.SoftKeyItem(vendor, softkeys));
  }


  /**
   * IPPhoneMenu
   * A menu on the phone comprises a list of text items, one per line.
   */
  IPPhoneMenu(vendor: Vendor, title: string = '', prompt: string = '', items: MenuItem[] = [], softkeys?: SoftKey[]): string {
    let xml = this.header(title, prompt);
    for (const item of items) {
      xml += this.xml('MenuItem', '', this.xml('Name', item.name) + this.xml('URL', item.url));
    }
    xml += this.SoftKeyItem(vendor, softkeys);
    return this.encoding + this.xml(vendor + 'IPPhoneMenu', '', xml);
  }


  /**
   * IPPhoneIconFileMenu - Cisco only
   * Like IPPhoneMenu, but uses color PNG icons (max. 18x18 pixels) referenced by URL.
   */
  IPPhoneIconFileMenu(vendor: Vendor, title: string = '', prompt: string = '', items: MenuItem[] = [], icons: IconItem[] = [], softkeys?: SoftKey[]): string {
    let xml = this.header(title, prompt);
    for (const item of items) {
      xml += this.xml('MenuItem', '', (typeof item.icon === 'number' ? this.xml('IconIndex', item.icon.toString()) : '') +
             this.xml('Name', item.name) +
             this.xml('URL', item.url));
    }
    xml += this.SoftKeyItem(vendor, softkeys);
    for (const icon of icons) {
      xml += this.xml('IconItem', '', this.xml('Index', icon.index.toString()) + this.xml('URL', icon.url));
    }
    return this.encoding + this.xml(vendor + 'IPPhoneIconFileMenu', '', xml);
  }


  /**
   * IPPhoneInput
   * Input form, a maximum of five items are allowed.
   * InputFlags: A ASCII, T telephone, N numeric, E equation, U uppercase, L lowercase, P password
   */
  IPPhoneInput(vendor: Vendor, title: string = '', prompt: string = '', url: string, items: InputItem[], softkeys?: SoftKey[]): string {
    let xml = this.header(title, prompt) + this.xml('URL', url);
    for (const item of items.slice(0, 5)) {
      const flags = item.flags || 'A';
      xml += this.xml('InputItem', '', this.xml('DisplayName', item.name) +
             this.xml('QueryStringParam', item.param) +
             this.xml('DefaultValue', item.default || '') +
             this.xml('InputFlags', vendor === 'Cisco' ? flags : flags.toLowerCase()));
    }
    xml += this.SoftKeyItem(vendor, softkeys);
    return this.encoding + this.xml(vendor + 'IPPhoneInput', '', xml);
  }


  /**
   * IPPhoneDirectory, max. 32 entries
   */
  IPPhoneDirectory(vendor: Vendor, title: string = '', prompt: string = '', items: DirectoryItem[] = [], softkeys?: SoftKey[]): string {
    let xml = this.header(title, prompt);
    for (const item of items.slice(0, 32)) {
      xml += this.xml('DirectoryEntry', '', this.xml('Name', item.name) + this.xml('Telephone', item.phone));
    }
    xml += this.SoftKeyItem(vendor, softkeys);
    return this.encoding + this.xml(vendor + 'IPPhoneDirectory', '', xml);
  }


  /**
   * IPPhoneImageFile
   * Displays a PNG image referenced by URL. The server must deliver it as image/png.
   */
  IPPhoneImageFile(vendor: Vendor, title: string = '', prompt: string = '', mode: string, x: number, y: number, url: string, softkeys?: SoftKey[]): string {
    return this.encoding + this.xml(vendor + 'IPPhoneImageFile', '', this.header(title, prompt) +
           this.xml('LocationX', x.toString()) +
           this.xml('LocationY', y.toString()) +
           this.xml('URL', url) +
           this.SoftKeyItem(vendor, softkeys), mode === 'wide' ? 'WindowMode="Wide"' : 'WindowMode="Normal"');
  }


  /**
   * CiscoIPPhoneGraphicFileMenu - Cisco only
   * PNG background with touch areas.
   */
  IPPhoneGraphicFileMenu(title: string = '', prompt: string = '', mode: string, x: number, y: number, url: string, items: MenuItem[], softkeys?: SoftKey[]): string {
    let menu = '';
    for (const item of items) {
      const touch = item.touch ?? { left: 0, top: 0, right: 0, bottom: 0 };
      menu += this.xml('MenuItem', '', this.xml('Name', item.name) +
              this.xml('URL', item.url) +
              this.xml('TouchArea', '', '', 'X1="' + touch.left + '" Y1="' + touch.top + '" X2="' + touch.right + '" Y2="' + touch.bottom + '"'));
    }
    return this.encoding + this.xml('CiscoIPPhoneGraphicFileMenu', '', this.header(title, prompt) +
           this.xml('LocationX', x.toString()) +
           this.xml('LocationY', y.toString()) +
           this.xml('URL', url) +
           menu +
           this.SoftKeyItem('Cisco', softkeys), mode === 'wide' ? 'WindowMode="Wide"' : 'WindowMode="Normal"');
  }


  /**
   * IPPhoneStatusFile - Cisco only
   * Status object with PNG image, displayed on the call plane.
   */
  IPPhoneStatusFile(vendor: Vendor, text: string = '', url: string = '', x: number, y: number, timer?: number): string {
    return this.encoding + this.xml(vendor + 'IPPhoneStatusFile', '', (text !== '' ? this.xml('Text', text) : '') +
           (typeof timer === 'number' ? this.xml('Timer', timer.toString()) : '') +
           this.xml('LocationX', x.toString()) +
           this.xml('LocationY', y.toString()) +
           this.xml('URL', url));
  }


  /**
   * IPPhoneExecute
   * Execution requests, limit to 3 items (max. one URL).
   * priority: 0 = immediately, 1 = when idle, 2 = if idle
   */
  IPPhoneExecute(vendor: Vendor, items: Array<{ priority?: number; url: string }>): string {
    let xml = '';
    for (const item of items) {
      xml += '<ExecuteItem Priority="' + (item.priority ?? 0) + '" URL="' + this.quote(item.url) + '" />';
    }
    return this.encoding + '<' + vendor + 'IPPhoneExecute>' + xml + '</' + vendor + 'IPPhoneExecute>';
  }


  /**
   * SoftKeyItem - Custom softkeys
   * Cisco: <SoftKeyItem><Name/><URL/><URLDown/><Position/></SoftKeyItem>
   * Snom:  <SoftKeyItem><Name>F1</Name><Label/><URL/> or <SoftKey/></SoftKeyItem>
   */
  SoftKeyItem(vendor: Vendor, softkeys: SoftKey[] = []): string {
    let xml = '';
    for (const key of softkeys) {
      if (vendor === 'Cisco') {
        xml += this.xml('SoftKeyItem', '', this.xml('Name', key.name) +
               (key.url ? this.xml('URL', key.url) : '') +
               (key.urldown ? this.xml('URLDown', key.urldown) : '') +
               this.xml('Position', key.position.toString()));
      }
      else {
        // Snom uses the function key name and either a URL or a built-in softkey function
        const builtin = key.softkey ?? SNOM_SOFTKEY[key.url];
        if (!builtin && !/^https?:/i.test(key.url)) {
          // Cisco specific URI without Snom equivalent
          continue;
        }
        xml += this.xml('SoftKeyItem', '', this.xml('Name', 'F' + key.position) +
               this.xml('Label', key.name) +
               (builtin ? this.xml('SoftKey', builtin) : this.xml('URL', key.url)));
      }
    }
    return xml;
  }


  /**
   * setBackground - Cisco only
   * Undocumented object to set the background of a Cisco phone
   * IMPORTANT: <phonePersonalization>1</phonePersonalization> must be set in the phone config
   */
  CiscoSetBackground(image: string, thumbnail: string): string {
    return '<setBackground><background>' +
           this.xml('image', image) +
           this.xml('icon', thumbnail) +
           '</background></setBackground>';
  }


  /**
   * Quote a string according to the XML specification
   */
  quote(text: string): string {
    return text.toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }


  /**
   * Generate a XML tag and quote the content. The subtag is not quoted and assumed to be already quoted
   */
  xml(tag: string, text: string, subtag?: string, attr?: string): string {
    return '<' + tag + (attr ? ' ' + attr : '') + '>' + this.quote(text.toString()) + (subtag ?? '') + '</' + tag + '>';
  }


  /**
   * Push a XML object to the given phone (Cisco /CGI/Execute)
   */
  push(vendor: Vendor, host: string, xml: string, username: string = '', password: string = ''): Promise<string> {
    if (vendor !== 'Cisco') {
      return Promise.reject(new Error('XML push is only supported for Cisco phones'));
    }
    const body = 'XML=' + encodeURIComponent(xml);
    return new Promise((resolve, reject) => {
      const req = http.request({
        host,
        path:    '/CGI/Execute',
        port:    80,
        method:  'POST',
        auth:    username + ':' + password,
        timeout: 10000,
        headers: {
          'Connection':     'close',
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (response) => {
        let str = '';
        response.on('data', (chunk) => { str += chunk; });
        response.on('end', () => resolve(str));
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Push to ' + host + ' timed out')));
      req.write(body);
      req.end();
    });
  }


  private header(title: string, prompt: string): string {
    return (title ? this.xml('Title', title) : '') + (prompt ? this.xml('Prompt', prompt) : '');
  }
}
