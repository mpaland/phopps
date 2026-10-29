///////////////////////////////////////////////////////////////////////////////
// \author (c) Marco Paland (info@paland.com)
//             2016, PALANDesign Hannover, Germany
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
// \brief 'applet' route
//        This route is called when an applet is rendered
//        The path arg of the route has the format: path=phone['SEP0026CB3B9369'].directory.opt.item[3]
//        The name arg of the route is:             name=SEP0026CB3B936G
//
///////////////////////////////////////////////////////////////////////////////

import { Router, Request, Response, NextFunction } from 'express';

export class Applet {
  router: Router;

  constructor() {
    this.router = Router();
    // create route
    this.router.get('/', (req: Request, res: Response, next: NextFunction) => {
      const name = req.query.name || req.query.devicename || "default";
      const appletpath = req.query.path;
      const appletname = req.baseUrl.substr(8); // cutoff '/applet/'
      console.log(name + " (" + req.ip + ") requests '" + appletname + "' on path: " + appletpath);
      require("../applet/" + appletname + "/index").render(req, res, req.query.locale, name, appletpath);
    });
  }
}
