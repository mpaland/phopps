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
// \brief URL macro expansion used by the image applets
//
// $NOW(format)  local date, date-fns format like 'yyyy/MM/dd HH:mm'
// $GMT(format)  GMT date
// $RND(digits)  random number with the given number of digits
// inside a date format:
//   'md' is replaced by 00, 10, 20, 30, 40, 50
//   'mq' is replaced by 00, 15, 30, 45
//   'mh' is replaced by 00, 30
//
///////////////////////////////////////////////////////////////////////////////

import { format } from 'date-fns';


function formatTime(time: Date, fmt: string): string {
  const minutes = time.getMinutes();
  const pad = (n: number) => n.toString().padStart(2, '0');
  // custom minute tokens become quoted literals for date-fns
  const prepared = fmt
    .replace(/md/g, "'" + pad(Math.floor(minutes / 10) * 10) + "'")
    .replace(/mq/g, "'" + pad(Math.floor(minutes / 15) * 15) + "'")
    .replace(/mh/g, "'" + pad(Math.floor(minutes / 30) * 30) + "'");
  return format(time, prepared);
}


/**
 * Expand the macros of the given URL
 * @param url URL with macros
 * @param offset Time offset in seconds
 * @param now Current time, for testing
 */
export function expandMacros(url: string, offset: number = 0, now: Date = new Date()): string {
  const local = new Date(now.getTime() + offset * 1000);
  const gmt   = new Date(local.getTime() + local.getTimezoneOffset() * 60000);
  return url
    .replace(/\$NOW\((.*?)\)/g, (_match, fmt: string) => formatTime(local, fmt))
    .replace(/\$GMT\((.*?)\)/g, (_match, fmt: string) => formatTime(gmt, fmt))
    .replace(/\$RND\((\d+)\)/g, (_match, digits: string) => {
      let rnd = '';
      while (rnd.length < Number(digits)) {
        rnd += Math.floor(Math.random() * 10).toString();
      }
      return rnd;
    });
}
