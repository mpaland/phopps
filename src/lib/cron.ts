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
// \brief cron scheduler, renders the 'cron' applets of all devices in push mode
//
// # ┌────────────── second (0 - 59, optional)
// # │ ┌──────────── minute (0 - 59)
// # │ │ ┌────────── hour (0 - 23)
// # │ │ │ ┌──────── day of month (1 - 31)
// # │ │ │ │ ┌────── month (1 - 12)
// # │ │ │ │ │ ┌──── day of week (0 - 7) (0 or 7 is Sun)
// # │ │ │ │ │ │
// # * * * * * *
//
///////////////////////////////////////////////////////////////////////////////

import { CronExpression, CronExpressionParser } from 'cron-parser';
import { FastifyBaseLogger } from 'fastify';
import { Config } from '../provider/config.js';
import { renderApplet } from './render.js';


export interface CronOptions {
  config:  Config;
  baseUrl: string;
  root:    string;
  log:     FastifyBaseLogger;
}


/**
 * Start all cron jobs, returns a function to stop them
 */
export function startCron(opts: CronOptions): () => void {
  const timers = new Set<NodeJS.Timeout>();

  const schedule = (device: string, idx: number, interval: CronExpression) => {
    const delay = Math.max(0, interval.next().getTime() - Date.now());
    const timer = setTimeout(async () => {
      timers.delete(timer);
      const path = 'cron[' + idx + ']';
      opts.log.info("Executing cron [" + idx + "] of device '" + device + "'");
      try {
        const result = await renderApplet({ config: opts.config, device, path, baseUrl: opts.baseUrl, root: opts.root, push: true });
        if ((result.status ?? 200) !== 200) {
          opts.log.warn('Cron ' + path + ' of ' + device + ' returned ' + result.status);
        }
      }
      catch (e) {
        opts.log.error(e, 'Cron ' + path + ' of ' + device + ' failed');
      }
      schedule(device, idx, interval);
    }, delay);
    timers.add(timer);
  };

  for (const device of opts.config.getDevices()) {
    const tmpl = opts.config.getTemplate(device.name);
    if (!tmpl || !Array.isArray(tmpl.cron)) {
      continue;
    }
    tmpl.cron.forEach((job: any, idx: number) => {
      try {
        schedule(device.name, idx, CronExpressionParser.parse(job.time, { currentDate: new Date() }));
        opts.log.info("Cron [" + idx + "] '" + job.time + "' of device '" + device.name + "' started");
      }
      catch (e) {
        opts.log.error("Invalid cron time '" + job.time + "' of device '" + device.name + "': " + e);
      }
    });
  }

  return () => {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
  };
}
