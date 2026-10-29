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
// \brief applet 'phonebook'
//        source 'ldap': url, binddn, password, basedn, filter, name_attr, phone_attr
//        source 'xml':  file or url of a Cisco/Snom IPPhoneDirectory XML file
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'node:fs/promises';
import { Client } from 'ldapts';
import { Applet, AppletContext, AppletResult } from '../applet.js';
import { DirectoryItem } from '../../lib/xmlobjects.js';


const MAX_ENTRIES = 32;


function decodeXml(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}


class Phonebook extends Applet {

  async render(ctx: AppletContext): Promise<AppletResult> {
    const opt = ctx.applet.opt;
    let items: DirectoryItem[];
    try {
      items = opt.source === 'ldap' ? await this.ldap(opt) : await this.xmlFile(opt);
    }
    catch (e) {
      return this.notFound('Phonebook ' + (opt.title || ctx.path) + ' failed: ' + e);
    }
    return this.xml(ctx, this.xmlobj.IPPhoneDirectory(ctx.vendor, opt.title, opt.prompt, items.slice(0, MAX_ENTRIES)));
  }


  private async ldap(opt: any): Promise<DirectoryItem[]> {
    const url = /^ldaps?:\/\//i.test(opt.url) ? opt.url : 'ldap://' + opt.url;
    const nameAttr  = opt.name_attr  || 'cn';
    const phoneAttr = opt.phone_attr || 'telephoneNumber';
    const client = new Client({ url, timeout: 10000, connectTimeout: 10000 });
    try {
      if (opt.binddn) {
        await client.bind(opt.binddn, opt.password || '');
      }
      // without basedn, the domain components of the bind DN are used
      const basedn = opt.basedn ?? String(opt.binddn ?? '').split(',').filter(rdn => /^\s*dc=/i.test(rdn)).join(',');
      const { searchEntries } = await client.search(basedn, {
        scope:      'sub',
        filter:     opt.filter || '(' + phoneAttr + '=*)',
        attributes: [nameAttr, phoneAttr],
        sizeLimit:  MAX_ENTRIES
      });
      return searchEntries
        .map(entry => ({ name: String([entry[nameAttr]].flat()[0] ?? ''), phone: String([entry[phoneAttr]].flat()[0] ?? '') }))
        .filter(item => item.phone !== '')
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    finally {
      await client.unbind().catch(() => undefined);
    }
  }


  private async xmlFile(opt: any): Promise<DirectoryItem[]> {
    let xml: string;
    if (typeof opt.file === 'string') {
      xml = await fs.readFile(opt.file, 'utf-8');
    }
    else {
      const url = /^https?:\/\//i.test(opt.url) ? opt.url : 'http://' + opt.url;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        throw new Error('Loading ' + url + ' failed with status ' + response.status);
      }
      xml = await response.text();
    }
    const items: DirectoryItem[] = [];
    for (const match of xml.matchAll(/<DirectoryEntry>([\s\S]*?)<\/DirectoryEntry>/g)) {
      const name  = /<Name>([\s\S]*?)<\/Name>/.exec(match[1])?.[1] ?? '';
      const phone = /<Telephone>([\s\S]*?)<\/Telephone>/.exec(match[1])?.[1] ?? '';
      items.push({ name: decodeXml(name.trim()), phone: decodeXml(phone.trim()) });
    }
    return items;
  }
}

// export the phonebook applet
export default new Phonebook();
