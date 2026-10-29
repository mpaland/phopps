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
// \brief applet 'menu'
//
///////////////////////////////////////////////////////////////////////////////

import { Applet } from '../applet';
import { Device } from '../../provider/config';
import * as ldap from 'ldapjs';


class Phonebook extends Applet {

  render(req: any, res: any, name: string, apppath: string): void {
    // get device and applet
    const device: Device = this.getDevice(name);
    const applet: any = this.getApplet(name, apppath);
    if (!device || !applet) {
      res.status(404).end();
      return;
    }

    const client = ldap.createClient({
      url: applet.opt.url
    });
    client.on('connect', () => {
      client.bind(applet.opt.binddn || '', applet.opt.password || '', (err) => {
        if (!err) {
          console.log("connected");

          const opts = {
            filter: '(&(uid=*))',
            scope: 'sub',
//            attributes: ['dn', 'sn', 'cn']
          };
          client.search('dc=example,dc=com', opts, (err, res) => {
            res.on('searchEntry', (entry) => {
              console.log('entry: ' + JSON.stringify(entry.object));
            });
            res.on('searchReference', (referral) => {
              console.log('referral: ' + referral.uris.join());
            });
            res.on('error', (err) => {
              console.error('error: ' + err.message);
            });
            res.on('end', (result) => {
              console.log('status: ' + result.status);
            });
          });


        }
        else {
          console.log("bound");
        }
      });
    });


//    res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneMenu(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title, applet.opt.prompt, items));
    
//    var inp = xmlobj.IPPhoneInput(xmlobj.phone[config.phone[device].model].vendor, "inp title", "inp prompt", "http://192.168.2.125:1080/next", [{ name: "Suche", param: "str" }]);
//    var xml = xmlobj.IPPhoneDirectory(xmlobj.phone[config.phone[device].model].vendor, app.opt.title, app.opt.prompt, items);
//  res.set("Refresh", "url=" + req.protocol + "://" + req.hostname + ":" + config.port + "/app/phonebook?path=" + path + "&name=" + device + "&page=" + (page + 1));
  }
}

// export the phonebook applet
export = new Phonebook();
