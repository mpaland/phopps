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
import { Device } from '../../provider/config';
import * as request from 'request';
import * as path from 'path';
import * as gm from 'gm';
import * as xdate from 'xdate';


class Image extends Applet {

  render(req: any, res: any, locale: string, name: string, apppath: string): void {
    // get device and applet
    const device: Device = this.getDevice(name);
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

    // URL local time conversion
    let url = applet.opt.url;
    url = url.replace(/\$NOW\(.*md.*\)/g, (match: string) =>
      match.replace(/md/g, time_md === 0 ? "00" : time_md.toString())
    );
    url = url.replace(/\$NOW\(.*mq.*\)/g, (match: string) =>
      match.replace(/mq/g, time_mq === 0 ? "00" : time_mq.toString())
    );
    url = url.replace(/\$NOW\(.*mh.*\)/g, (match: string) =>
      match.replace(/mh/g, time_mh === 0 ? "00" : time_mh.toString())
    );
    let format = url.match(/\$NOW\(.*\)/g);
    if (format !== null) {
      url = url.replace(/\$NOW\(.*\)/g, time.toString(format[0].replace("$NOW(", "").replace(")", "")));
    }
    // URL GMT time conversion
    url = url.replace(/\$GMT\(.*md.*\)/g, (match: string) =>
      match.replace(/md/g, time_md === 0 ? "00" : time_md.toString())
    );
    url = url.replace(/\$GMT\(.*mq.*\)/g, (match: string) =>
      match.replace(/mq/g, time_mq === 0 ? "00" : time_mq.toString())
    );
    url = url.replace(/\$GMT\(.*mh.*\)/g, (match: string) =>
      match.replace(/mh/g, time_mh === 0 ? "00" : time_mh.toString())
    );
    url = url.replace(/\$GMT\((.*?)\)/g, (match: string) =>
      time.toUTCString(match.replace("$GMT(", "").replace(")", ""))
    );

    let img: any = {};
    try {
      const options = {
        headers: {
          // simulate browser access, some sites need this
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36',
         }
      };
      img = gm(<any>request(url, options));   // open image
    }
    catch (e) {
      // error opening image
      return;
    }

    const x      = applet.opt.x || 0;
    const y      = applet.opt.y || 0;
    const mode   = applet.opt.mode || "normal";
    const screen = {
      width:  mode === "wide" ? this.xmlobj.getModelSpecs(device.model).w : this.xmlobj.getModelSpecs(device.model).imgw,
      height: this.xmlobj.getModelSpecs(device.model).imgh
    };
    let resize = {
      width:  0,
      height: 0
    };

    // get image size
    img.size({bufferStream: true}, (err: any, size: { width: number; height: number; }) => {
      // crop original image
      if (!err && typeof applet.opt.crop !== 'undefined') {
      img.crop(applet.opt.crop.width  || size.width,
               applet.opt.crop.height || size.height,
               applet.opt.crop.x || 0,
               applet.opt.crop.y || 0
              );
      }

      switch (applet.opt.convert) {
        case 'direct':
          // set direct image URL
          res.set('Content-Type', 'text/xml; charset=UTF-8').send(this.xmlobj.IPPhoneImageFile(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title, applet.opt.prompt, mode, x, y, url));
          return;
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
      if (applet.opt.dither) {
        img.dither(true).colors(Math.pow(2, this.xmlobj.getModelSpecs(device.model).dep));
      }
      img.write(path.join(req.app.get('root'), "public", "tmp", name + "-image.png"), (err: any) => {
        if (!err) {
          url = req.protocol + "://" + req.hostname + ":" + this.config.getHost().port + "/tmp/" + name + "-image.png";
          const xml = this.xmlobj.IPPhoneImageFile(this.xmlobj.getModelSpecs(device.model).vendor, applet.opt.title, applet.opt.prompt, mode, x, y, url);

          if ((req.query.push || 'false') === 'true') {
            // push
            this.xmlobj.push(this.xmlobj.getModelSpecs(device.model).vendor, device.ip, xml, device.username, device.password);
          }
          else {
            // response
            res.set('Content-Type', 'text/xml; charset=UTF-8').send(xml);
          }
        }
        else {
          console.error(err, url);
          res.status(404).end();
        }
      });
    });
  }
}

// export the image applet
export = new Image();
