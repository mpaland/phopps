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
// \brief 'generic' route for all services
//
///////////////////////////////////////////////////////////////////////////////

import { Router, Request, Response, NextFunction } from 'express';
import { Config } from '../provider/config';


export class Service {
  private config: Config;
  public  router: Router;

  constructor(service: string) {
    this.router = Router();
    this.config = new Config();

    // create route
    this.router.get('/', (req: Request, res: Response, next: NextFunction) => {
      const name = req.query.name || req.query.devicename || 'default';
      console.info(name + " (" + req.ip + ") requests service '" + service + "'");
      // get device
      const device = this.config.getDevice(name);
      if (typeof device !== 'object') {
        // device does not exist
        console.error(name + " not found in config.json configuration");
        res.status(404).end();
        return;
      }
      // model is mandatory
      if (typeof device.model !== 'string') {
        // model does not exist
        console.error(name + " has no model in config.json configuration");
        res.status(404).end();
        return;
      }
      // get the phone template
      const tmpl = this.config.getTemplate(name);
      if (typeof tmpl !== 'object') {
        // template does not exist
        console.error(name + " has no template in config.json configuration");
        res.status(404).end();
        return;
      }
      // start the according applet
      if (tmpl.hasOwnProperty(service)) {
        // service is defined, start the according applet
        try {
          if ((service === 'directory') && (tmpl.directory.applet !== 'menu')) {
            console.warn("You should use the 'menu' applet as directory service, phone will only render IPPhoneMenu");
          }
          if (typeof tmpl[service].applet === 'undefined') {
            console.error("Service '" + service + "' has no applet defined in config.json configuration");
            res.status(404).end();
            return;
          }
          // render the applet
          require("../applet/" + tmpl[service].applet.toString() + "/index").render(req, res, req.query.locale, name, service);
          return;
        }
        catch (e) {
          // applet not found
          console.log("Applet '" + tmpl[service].applet.toString() + "' error: " + e);
          res.status(404).end();
        }
      }
      else {
        // no according service defined
        console.log("No '" + service + "' entry in template configuration for " + name + " found");
        res.status(404).end();
      }
    });
  }
}
