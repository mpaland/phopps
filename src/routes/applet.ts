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
// \brief 'applet' route
//        This route is called when an applet is rendered:
//        /applet/<applet>?name=SEP0026CB3B9369&path=directory.opt.item[3]&locale=de
//
///////////////////////////////////////////////////////////////////////////////

import { FastifyPluginAsync } from 'fastify';
import { renderApplet } from '../lib/render.js';
import { sendResult, baseUrl } from './reply.js';


const appletRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { applet: string }; Querystring: Record<string, string> }>('/applet/:applet', async (request, reply) => {
    const name = request.query.name || request.query.devicename || 'default';
    const path = request.query.path;
    request.log.info(name + ' (' + request.ip + ") requests '" + request.params.applet + "' on path: " + path);
    if (typeof path !== 'string' || path === '') {
      return reply.code(404).send();
    }
    const result = await renderApplet({
      config:  app.config,
      device:  name,
      path,
      applet:  request.params.applet,
      locale:  request.query.locale,
      query:   request.query,
      baseUrl: baseUrl(request),
      root:    app.root
    });
    return sendResult(reply, result);
  });
};

export default appletRoute;
