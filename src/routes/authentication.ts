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
// \brief 'authentication' route
//        This route is called when the device requests authentication
//
///////////////////////////////////////////////////////////////////////////////

import { Router, Request, Response, NextFunction } from 'express';
import { Config } from '../provider/config';


/**
 * This is URL is needed for xmlpush-service authentification
 * The default user/pass used by xmlwidgets::push is 'cmeext'
 * This URL should return 'ERROR', 'UN-AUTHORIZED' or 'AUTHORIZED'
 */
export class Authentication {
  router: Router;

  constructor() {
    this.router = Router();
    // create route
    this.router.get('/', (req: Request, res: Response, next: NextFunction) => {
      const config = new Config();
      const name = req.query.name || req.query.devicename || 'default';
      console.log(name + " (" + req.ip + ") requests authentication");
      // get device
      const device = config.getDevice(name);
      if (typeof device !== 'object') {
        // device does not exist
        console.log(name + " not found in config.json configuration");
        res.send("UN-AUTHORIZED");
        return;
      }
      const user = req.query.UserID;
      const password = req.query.Password;
      if ((user === device.username) && (password === device.password)) {
        console.log("Access authorized");
        res.send("AUTHORIZED");
      }
      else {
        // wrong user/pass
        console.log("Access denied");
        res.send("UN-AUTHORIZED");
      }
    });
  }
}
