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
// \brief registry of all available applets
//
///////////////////////////////////////////////////////////////////////////////

import { Applet } from './applet.js';
import backgroundCisco from './background-cisco/index.js';
import backgroundSnom from './background-snom/index.js';
import image from './image/index.js';
import launcherCisco from './launcher-cisco/index.js';
import menu from './menu/index.js';
import phonebook from './phonebook/index.js';
import text from './text/index.js';
import voicemail from './voicemail/index.js';


const applets: Record<string, Applet> = {
  'background-cisco': backgroundCisco,
  'background-snom':  backgroundSnom,
  'image':            image,
  'launcher-cisco':   launcherCisco,
  'menu':             menu,
  'phonebook':        phonebook,
  'text':             text,
  'voicemail':        voicemail
};


export function getApplet(name: string): Applet | undefined {
  return Object.prototype.hasOwnProperty.call(applets, name) ? applets[name] : undefined;
}
