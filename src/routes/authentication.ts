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
// \brief 'authentication' route
//        This route is called when the device requests authentication
//        It is needed for the Cisco xmlpush-service authentication,
//        the URL must return 'ERROR', 'UN-AUTHORIZED' or 'AUTHORIZED'
//
///////////////////////////////////////////////////////////////////////////////

import { FastifyPluginAsync } from 'fastify';


interface AuthQuery {
  name?:       string;
  devicename?: string;
  UserID?:     string;
  Password?:   string;
}

const authenticationRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: AuthQuery }>('/authenticate', async (request, reply) => {
    const name = request.query.name || request.query.devicename || 'default';
    request.log.info(name + ' (' + request.ip + ') requests authentication');
    reply.type('text/plain');

    const device = app.config.getDevice(name);
    if (!device) {
      request.log.warn(name + ' not found in config.json configuration');
      return 'UN-AUTHORIZED';
    }
    if (device.username !== undefined && request.query.UserID === device.username && request.query.Password === device.password) {
      return 'AUTHORIZED';
    }
    request.log.warn('Access denied for ' + name);
    return 'UN-AUTHORIZED';
  });
};

export default authenticationRoute;
