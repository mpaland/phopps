///////////////////////////////////////////////////////////////////////////////
// \author (c) Marco Paland (info@paland.com)
//             2016-2019, PALANDesign Hannover, Germany
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
// \brief applet 'voicemail'
//
///////////////////////////////////////////////////////////////////////////////

import { Applet } from '../applet';
import { SoftKey } from '../../lib/xmlobjects';
import * as fs from 'fs';
import * as os from 'os';
import * as glob from 'glob';
import * as ini from 'ini';


class Voicemail extends Applet {

  render(req: any, res: any, locale: string, name: string, apppath: string): void {
    // get device and applet
    const device: any = this.getDevice(name);
    const applet: any = this.getApplet(name, apppath);
    if (!device || !applet) {
      res.status(404).end();
      return;
    }

    // check mailbox dir
    if (typeof applet.opt.incoming_dir !== 'string') {
      // no incoming dir given
      console.error('No incoming dir given');
      res.status(404).end();
      return;
    }

    // on asterisk, we have different mailboxes
    // dir -- INBOX
    //      - Old
    //      - Work
    //      - tmp
    // we support INBOX and Old here

    if (typeof req.query.mailbox === 'undefined') {
      // create the mailbox list

      const items: any = [];
      for (let i = 0; i < applet.opt.mailbox.length; i++) {
        // get the txt-file list
        const files: string[] = glob.sync('**/*.txt', { cwd: applet.opt.incoming_dir + '/' + applet.opt.mailbox[i] });

        items[i] = {};
        items[i].name = applet.opt.mailbox[i] + " (" + files.length.toString() + ")";
        items[i].url  = req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.applet + "?locale=" + locale + "&name=" + name + "&path=" + apppath + "&mailbox=" + applet.opt.mailbox[i];
      }
      res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneMenu(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title || '', applet.opt.prompt || '', items));
    }
    else if (typeof req.query.play === 'undefined') {
      // create the message list

      // get mailbox name
      const mailbox: string = req.query.mailbox;

      // get the txt-file list
      const files: string[] = glob.sync("**/*.txt", { cwd: applet.opt.incoming_dir + "/" + mailbox });

      // iterate through the text files
      const items: any = [];
      for (let i = 0; i < files.length; i++) {
        const msg: any = ini.parse(fs.readFileSync(applet.opt.incoming_dir + "/" + mailbox + "/" + files[i], 'utf-8'));
        const callername: any = [];
        items[i] = {};
// TBD: format the list here
        items[i].name = msg.message.callerid;
        items[i].url  = req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.applet + "?locale=" + locale + "&name=" + name + "&path=" + apppath + "&mailbox=" + mailbox + "&item=" + i.toString() + "&play";
      }

      const softkeys: SoftKey[] = [
        {
          name:      "Play",
          url:       "SoftKey:Select",    // select/play the message
          position:  1
        },
        {
          name:      "Delete",
          url:       req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.applet + "?locale=" + locale + "&name=" + name + "&path=" + apppath + "&item=" + req.query.item + "&delete",
          position:  2
        },
        {
          name:      "Exit",
          url:       "SoftKey:Exit",      // force application to close
          position:  3
        }
      ];

      res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneMenu(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title || '', applet.opt.prompt || '', items, softkeys));
    }
    else {
      // play the message

      // get mailbox name
      const mailbox: string = req.query.mailbox;

      // get the msg-file list
      const files: string[] = glob.sync("**/*.txt", { cwd: applet.opt.incoming_dir + "/" + mailbox });

      // create a tmp call filename
      const filename: string = (Math.floor(Math.random() * 9000) + 1000).toString() + ".call";

      // create the file in tmpdir and move it when writing has comleted
      fs.writeFileSync(os.tmpdir() + "/" + filename, "Channel: " + applet.opt.outgoing_channel + "\n" +
                                                     "Callerid: <msg02>\n" +
                                                     "Application: Playback\n" +
                                                     "Data: " + applet.opt.incoming_dir + "/" + mailbox + "/" + files[req.query.item].slice(0, -4) + "\n" +
                                                     "AlwaysDelete: Yes");
      // this is done by creating a playback request and copy it to the 'outgoing' directory of asterisk
      fs.renameSync(os.tmpdir() + "/" + filename, applet.opt.outgoing_dir + "/" + filename);

      // generate the msg display
      const text: string = "Playback";
      const softkeys: SoftKey[] = [
        {
          name:      "Back",
          url:       req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.applet + "?locale=" + locale + "&name=" + name + "&path=" + apppath,
          position:  1
        },
        {
          name:      "Delete",
          url:       req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.applet + "?locale=" + locale + "&name=" + name + "&path=" + apppath + "&item=" + req.query.item + "&delete",
          position:  2
        },
        {
          name:      "Prev",
          url:       req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.applet + "?locale=" + locale + "&name=" + name + "&path=" + apppath + "&item=" + (req.query.item - 1).toString() + "&play",
          position:  4
        },
        {
          name:      "Next",
          url:       req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/applet/" + applet.applet + "?locale=" + locale + "&name=" + name + "&path=" + apppath + "&item=" + (req.query.item + 1).toString() + "&play",
          position:  5
        }
      ];

      res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneText(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title || '', applet.opt.prompt || '', text, softkeys));
    }
  }
}

// export the menu applet
export default new Voicemail();
