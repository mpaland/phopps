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
// \brief Fastify application factory
//
///////////////////////////////////////////////////////////////////////////////

import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import * as path from 'node:path';

import { Config } from './provider/config.js';
import indexRoute from './routes/index.js';
import authenticationRoute from './routes/authentication.js';
import appletRoute from './routes/applet.js';
import serviceRoute, { SERVICES } from './routes/service.js';


export interface AppOptions {
  config?: Config;
  root?:   string;                    // project root, contains 'public'
  logger?: FastifyServerOptions['logger'];
}

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    root:   string;
  }
}


export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? true });

  app.decorate('config', opts.config ?? new Config());
  app.decorate('root', path.resolve(opts.root ?? process.cwd()));

  // static files
  await app.register(fastifyStatic, { root: path.join(app.root, 'public') });
  // form bodies (phone input objects)
  await app.register(fastifyFormbody);

  // routes
  await app.register(indexRoute);
  await app.register(authenticationRoute);
  await app.register(appletRoute);
  for (const service of SERVICES) {
    await app.register(serviceRoute, { service });
  }

  app.setNotFoundHandler((request, reply) => {
    request.log.warn('Route not found: ' + request.url);
    reply.code(404).send('Oops! Something is wrong, check the route');
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.code((error as any).statusCode ?? 500).send('Oops! Something is wrong, check the route');
  });

  return app;
}
