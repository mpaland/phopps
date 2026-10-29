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
// \brief server, main entry
//
///////////////////////////////////////////////////////////////////////////////

import { buildApp } from './app.js';
import { startCron } from './lib/cron.js';
import { localAddress } from './lib/net.js';


const app = await buildApp();
const { host, port } = app.config.getHost();
const publicHost = host || localAddress();   // use config host or own IP

app.log.info("Root path is '" + app.root + "'");

try {
  await app.listen({ host: '0.0.0.0', port });
  app.log.info('Phopps listening on ' + publicHost + ':' + port);
}
catch (error: any) {
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      app.log.error('Port ' + port + ' requires elevated privileges');
      break;
    case 'EADDRINUSE':
      app.log.error('Port ' + port + ' is already in use');
      break;
    default:
      app.log.error(error);
  }
  process.exit(1);
}

// start cron jobs
const stopCron = startCron({ config: app.config, baseUrl: 'http://' + publicHost + ':' + port, root: app.root, log: app.log });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    stopCron();
    await app.close();
    process.exit(0);
  });
}
