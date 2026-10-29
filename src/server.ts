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
// \brief server, main entry
//
///////////////////////////////////////////////////////////////////////////////

import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as cronParser from 'cron-parser';
import * as path from 'path';
import * as http from 'http';
import * as ip from 'ip';

// import * as gm from 'gm';

// routes
import { Index } from './routes/index';
import { Applet } from './routes/applet';
import { Authentication } from './routes/authentication';
import { Service } from './routes/service';

// config
import { Config } from './provider/config';


const app    = express();
const config = new Config();

app.set('env', 'development');
app.set('root', path.resolve(process.cwd()));
app.set('host', config.getHost().host || ip.address()); // use config port or own IP
app.set('port', config.getHost().port || process.env.PORT); // get port from environment and store in express

console.log("Root path is '" + app.get('root') + "'");
app.use(logger('dev'));

// view engine setup
app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'pug');

// static files
app.use('/', express.static(path.join(process.cwd(), 'public')));

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// load and attach special routes to the application
app.use('/applet*', (new Applet()).router);
app.use('/authenticate', (new Authentication).router);

// default route
app.use('/', (new Index()).router);

// route for XML push
// app.use('/push', (new Push()).router);

// services
app.use('/idle', (new Service('idle')).router);
app.use('/messages', (new Service('messages')).router);
app.use('/directory', (new Service('directory')).router);
app.use('/information', (new Service('information')).router);
app.use('/services', (new Service('services')).router);

// catch any unhandled routes and forward to error handler
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const err: any = new Error('Route not Found');
  err.status = 404;
  next(err);
});

// error handlers
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // send back a 500 with a generic message
  console.error(err);
  res.status(err.status || 500).send('Oops! Something is wrong, check the route');
});

// production error handler
// no stacktraces leaked to user
/*
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: { }
  });
});
*/

// create HTTP server
const server = http.createServer(app);
const port = app.get('port');
server.listen(port);
server.on('error', (error: any) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

server.on('listening', () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : app.get('host') + ':' + addr.port;
  console.log('Server listening on ' + bind);
});

/*
gm()
.in('-geometry', '+0+0')
.in('./img/img1.png')
.in('-geometry', '300x300+100+200')
.in('./img/img2.png')
.flatten()
.write('resultGM.png', function (err) {
  if (err) console.log(err);
});
*/

// start cron jobs
// # ┌────────────── second (0 - 59, optional)
// # │ ┌──────────── minute (0 - 59)
// # │ │ ┌────────── hour (0 - 23)
// # │ │ │ ┌──────── day of month (1 - 31)
// # │ │ │ │ ┌────── month (1 - 12)
// # │ │ │ │ │ ┌──── day of week (0 - 7) (0 or 7 is Sun)
// # │ │ │ │ │ │
// # │ │ │ │ │ │
// # * * * * * *
function cronjob(job: any) {
  const delay = job.interval.next().getTime() - (new Date()).getTime();
  setTimeout((arg: any) => {
    // execute job
    console.log('Executing cron [' + job.path + "] of device '" + job.device.name + "'");
    const req = {
      app,
      query: {
        push: 'true'
      }
    };
    const res = {
      status(err: any) {
        console.warn('Result error: ' + err.toString());
        return {
          end() { }
        };
      }
    };
    require('./applet/' + job.tmpl.cron[job.path].applet.toString() + '/index').render(req, res, job.device.name, 'cron[' + job.path + ']');
    // console.log("cron: " + job.device + " " + job.path);
    cronjob(arg);
  }, delay, job);
}

for (let dev = 0;; dev++) {
  const device = config.getDeviceByIdx(dev);
  if (!device) {
    break;
  }
  const tmpl = config.getTemplate(device.name);
  if (tmpl && typeof tmpl.cron !== 'undefined') {
    for (let i = 0; i < tmpl.cron.length; i++) {
      // start cron job
      cronjob({
        device,
        tmpl,
        path: i,
        interval: cronParser.parseExpression(tmpl.cron[i].time, { currentDate: new Date() })
      });
    }
  }
  console.log(device.name);
}
