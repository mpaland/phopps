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
// \brief applet 'image'
//
///////////////////////////////////////////////////////////////////////////////

import { Applet } from '../applet';
import * as request from 'request';
import * as path from 'path';
import * as gm from 'gm';
import * as glob from 'glob';
import * as NodeCache from 'node-cache';
import xdate from 'xdate';


class Background extends Applet {

  // cache
  cache: NodeCache = new NodeCache();

  render(req: any, res: any, name: string, apppath: string): void {
    // get device and applet
    const device: any = this.getDevice(name);
    const applet: any = this.getApplet(name, apppath);
    if (!device || !applet) {
      res.status(404).end();
      return;
    }

    // convert options:
    // direct:   no processing, use the direct img url
    // original: original dimensions at top/left
    // fit:      the bigger dimension fits, the smaller one has black strips, maintain aspect ratio
    // fill:     the smaller dimension fits, the bigger one is cropped, maintain aspect ratio
    // stretch:  both dimensions are resized, aspect ratio is distorted
    // center:   original dimensions, centered image, bigger parts are cut off

    // crop:     { x, y, width, height}, crop the original image before size conversion

    // URL or file?
    let url: string;
    if (typeof applet.opt.dir !== 'undefined') {
      // dir is given
      const files: string[] = glob.sync(applet.opt.dir);

      let idx: number = this.cache.get('dir-idx') || 0;
      if (files.length > 1) {
        switch (applet.opt.order || 'random') {
          case 'random' :
            let rnd: number;
            do {
              rnd = Math.floor(Math.random() * files.length);
            } while (idx === rnd);
            idx = rnd;
            break;
          case 'decend' :
            if (idx > 0) {
              idx--;
            }
            else {
              idx = files.length - 1;
            }
            break;
          case 'ascend' :
          default :
            if (idx < files.length - 1) {
              idx++;
            }
            else {
              idx = 0;
            }
        }
      }
      this.cache.set('dir-idx', idx);
      url = files[idx];
    }
    else {
      // url is given
      url = applet.opt.url || '';
    }

    // process the URL
    // $NOW()  // local date
    // $GMT()  // GMT date
    // replace 'md' by 00, 10, 20, 30, 40, 50
    // replace 'mq' by 00, 15, 30, 45
    // replace 'mh' by 00, 30
    const time = (new xdate()).addSeconds(applet.opt.timeoffset || 0);
    const time_md = Math.floor(time.getMinutes() / 10) * 10;
    const time_mq = Math.floor(time.getMinutes() / 15) * 15;
    const time_mh = Math.floor(time.getMinutes() / 30) * 30;

    url = url.replace(/\$NOW\(.*md.*\)/g, (match) =>
      match.replace(/md/g, time_md === 0 ? "00" : time_md.toString())
    );
    url = url.replace(/\$NOW\(.*mq.*\)/g, (match) =>
      match.replace(/mq/g, time_mq === 0 ? "00" : time_mq.toString())
    );
    url = url.replace(/\$NOW\(.*mh.*\)/g, (match) =>
      match.replace(/mh/g, time_mh === 0 ? "00" : time_mh.toString())
    );
    let format = url.match(/\$NOW\(.*\)/g);
    if (format !== null) {
      url = url.replace(/\$NOW\(.*\)/g, time.toString(format[0].replace("$NOW(", "").replace(")", "")));
    }
    // URL GMT time conversion
    url = url.replace(/\$GMT\(.*md.*\)/g, (match) =>
      match.replace(/md/g, time_md === 0 ? "00" : time_md.toString())
    );
    url = url.replace(/\$GMT\(.*mq.*\)/g, (match) =>
      match.replace(/mq/g, time_mq === 0 ? "00" : time_mq.toString())
    );
    url = url.replace(/\$GMT\(.*mh.*\)/g, (match) =>
      match.replace(/mh/g, time_mh === 0 ? "00" : time_mh.toString())
    );
    url = url.replace(/\$GMT\((.*?)\)/g, (match) =>
      time.toUTCString(match.replace("$GMT(", "").replace(")", ""))
    );

    let img: any = {};
    try {
      const options = {
        headers: {
          // simulate browser access, some sites needs this
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36',
        }
      };
      img = gm(<any>request(url, options));   // open image
    }
    catch (e) {
      // error opening image
      return;
    }

    const screen = {
      width:  this.xmlobj.getModelSpecs(device.model).w,
      height: this.xmlobj.getModelSpecs(device.model).h
    };
    let resize = {
      width:  0,
      height: 0
    };

    // get image size
    img.size({bufferStream: true}, (err: any, size: any) => {
      // crop original image
      if (typeof applet.opt.crop !== 'undefined') {
      img.crop(applet.opt.crop.width  || size.width,
               applet.opt.crop.height || size.height,
               applet.opt.crop.x || 0,
               applet.opt.crop.y || 0
              );
      }

      switch (applet.opt.convert) {
        case 'original':
          // original dimensions at top/left
          img.crop(screen.width, screen.height, 0, 0);
          break;
        case 'fit':
          // the bigger dimension fits, the smaller one has black strips, maintain aspect ratio
          if (screen.height >= size.height * screen.width / size.width) {
            resize.width  = screen.width;
            resize.height = size.height * screen.width / size.width;
          }
          else {
            resize.height = screen.height;
            resize.width  = size.width * screen.height / size.height;
          }
          img.autoOrient().resizeExact(resize.width, resize.height);
          break;
        case 'fill':
          // the smaller dimension fits, the bigger one is cropped, maintain aspect ratio
          if (screen.height < size.height * screen.width / size.width) {
            resize.width  = screen.width;
            resize.height = size.height * screen.width / size.width;
          }
          else {
            resize.height = screen.height;
            resize.width  = size.width * screen.height / size.height;
          }
          img.autoOrient().resizeExact(resize.width, resize.height);
          break;
        case 'stretch':
          // both dimensions are resized, aspect ratio is distorted
          img.autoOrient().resizeExact(screen.width, screen.height);
          break;
        case 'center':
          // original dimensions, centered image, bigger parts are cut off
          img.crop(screen.width, screen.height, (size.width - screen.width) / 2, (size.height - screen.height) / 2);
          break;
        default :
          // no resizing
      }

      // img.compose('Copy').gravity('Center').extent(screen.width, screen.height).background("black");
      if (applet.opt.enhance) {
        img.enhance();
      }
      if (applet.opt.dither) {
        img.dither(true).colors(Math.pow(2, this.xmlobj.getModelSpecs(device.model).dep));
      }
      img.write(path.join(req.app.get('root'), "public", "tmp", device.name + "-bg.png"), (err2: any) => {
        if (!err2) {
          // create thumbnail
          const thumb = gm(path.join(req.app.get('root'), "public", "tmp", device.name + "-bg.png"));  // open image
          thumb.autoOrient().resize(screen.width / 4, screen.height / 4);
          thumb.enhance();
          thumb.dither(true).colors(Math.pow(2, this.xmlobj.getModelSpecs(device.model).dep));
          thumb.write(path.join(req.app.get('root'), "public", "tmp", device.name + "-tn.png"), (err3) => {
            if (!err3) {
              // both images are ready
              const xml = this.xmlobj.CiscoSetBackground(req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/tmp/" + device.name + "-bg.png",
                                                         req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/tmp/" + device.name + "-tn.png");

              const cron = false;
              if (cron) {
                // cron job, push it
//                this.xmlobj.push(this.xmlobj.getModelSpecs(device.model).vendor, device.ip, xml, device.username, device.password);
              }
              else {
                // app, send it
//                res.set('Content-Type', 'text/xml; charset=UTF-8').send(xml);
              }
            }
            else {
              console.error(err, url);
              res.status(404).end();
            }
          });
        }
        else {
          console.error(err, url);
          res.status(404).end();
        }
      });
    });
  }
}

// export the background applet
export default new Background();
