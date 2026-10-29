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
// \brief 'generic' route for all phone services (directory, messages, ...)
//
///////////////////////////////////////////////////////////////////////////////

import { FastifyPluginAsync } from 'fastify';
import { renderApplet } from '../lib/render.js';
import { sendResult, baseUrl } from './reply.js';


export const SERVICES = ['idle', 'messages', 'directory', 'information', 'services', 'help'] as const;

const serviceRoute: FastifyPluginAsync<{ service: string }> = async (app, opts) => {
  const service = opts.service;

  app.get<{ Querystring: Record<string, string> }>('/' + service, async (request, reply) => {
    const name = request.query.name || request.query.devicename || 'default';
    request.log.info(name + ' (' + request.ip + ") requests service '" + service + "'");

    const tmpl = app.config.getTemplate(name);
    if (!tmpl || typeof tmpl[service]?.applet !== 'string') {
      request.log.warn("No '" + service + "' applet in template configuration of " + name);
      return reply.code(404).send();
    }
    if (service === 'directory' && tmpl.directory.applet !== 'menu') {
      request.log.warn("You should use the 'menu' applet as directory service, phone will only render IPPhoneMenu");
    }
    const result = await renderApplet({
      config:  app.config,
      device:  name,
      path:    service,
      locale:  request.query.locale,
      query:   request.query,
      baseUrl: baseUrl(request),
      root:    app.root
    });
    return sendResult(reply, result);
  });
};

export default serviceRoute;
