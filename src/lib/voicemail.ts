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
// \brief Asterisk voicemail box access (file based spool)
//
// An Asterisk mailbox directory looks like:
//   <mailbox>/INBOX/msg0000.txt   message info (ini format)
//   <mailbox>/INBOX/msg0000.wav   audio, one file per configured format (wav, WAV, gsm, ...)
//   <mailbox>/Old/...
// Asterisk requires gap free message numbering per folder, so every delete
// or move renumbers the remaining messages. Folders are locked like Asterisk
// does it (hard link of a temp file to '<folder>/.lock').
//
///////////////////////////////////////////////////////////////////////////////

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import * as ini from 'ini';


export interface VoicemailMessage {
  id:           string;               // Asterisk msg_id, stable over renumbering
  folder:       string;               // folder like 'INBOX'
  file:         string;               // file base name like 'msg0003'
  callerName:   string;
  callerNumber: string;
  date:         Date;
  duration:     number;               // seconds
}

export interface FolderInfo {
  folder: string;
  count:  number;
}

export interface PlaybackOptions {
  outgoingDir:  string;               // Asterisk outgoing spool dir, like /var/spool/asterisk/outgoing
  tmpDir?:      string;               // temp dir on the same filesystem, default '<outgoingDir>/../tmp'
  channel:      string;               // channel to call, like 'Local/86@from-internal' or 'PJSIP/86'
  callerId?:    string;               // caller ID shown on the phone
  waitTime?:    number;               // seconds to wait for answer
}


const MSG_FILE = /^msg(\d{4})\.(.+)$/i;
const LOCK_TIMEOUT = 3000;            // ms to wait for a folder lock
const LOCK_STALE   = 60000;           // ms after which a lock is considered stale


export class VoicemailError extends Error {}


export class Mailbox {

  /**
   * @param dir Mailbox directory like /var/spool/asterisk/voicemail/default/41
   */
  constructor(readonly dir: string, private readonly lockTimeout: number = LOCK_TIMEOUT) {}


  /**
   * Message count of the given folders
   */
  async folders(folders: string[]): Promise<FolderInfo[]> {
    return Promise.all(folders.map(async folder => ({ folder, count: (await this.infoFiles(folder)).length })));
  }


  /**
   * All messages of a folder, newest first
   */
  async list(folder: string): Promise<VoicemailMessage[]> {
    const files = await this.infoFiles(folder);
    const messages = await Promise.all(files.map(file => this.parse(folder, file)));
    return messages
      .filter((msg): msg is VoicemailMessage => msg !== undefined)
      .sort((a, b) => b.date.getTime() - a.date.getTime() || b.file.localeCompare(a.file));
  }


  /**
   * Get a message by id
   */
  async get(folder: string, id: string): Promise<VoicemailMessage | undefined> {
    return (await this.list(folder)).find(msg => msg.id === id);
  }


  /**
   * Full path of the message audio without extension, as Asterisk's Playback() expects it
   */
  audioPath(msg: VoicemailMessage): string {
    return path.join(this.dir, msg.folder, msg.file);
  }


  /**
   * Delete a message and renumber the folder
   */
  async delete(folder: string, id: string): Promise<void> {
    await this.withLock(folder, async () => {
      const msg = await this.get(folder, id);
      if (!msg) {
        throw new VoicemailError('Message not found');
      }
      for (const file of await this.messageFiles(folder, msg.file)) {
        await fs.unlink(path.join(this.dir, folder, file));
      }
      await this.renumber(folder);
    });
  }


  /**
   * Move a message to another folder (like INBOX -> Old) and renumber the source folder
   * @returns the moved message
   */
  async move(from: string, to: string, id: string): Promise<VoicemailMessage> {
    if (from === to) {
      throw new VoicemailError('Source and destination folder are the same');
    }
    await fs.mkdir(path.join(this.dir, to), { recursive: true });
    return this.withLock(from, () => this.withLock(to, async () => {
      const msg = await this.get(from, id);
      if (!msg) {
        throw new VoicemailError('Message not found');
      }
      await this.renumber(to);
      const target = 'msg' + (await this.infoFiles(to)).length.toString().padStart(4, '0');
      for (const file of await this.messageFiles(from, msg.file)) {
        await fs.rename(path.join(this.dir, from, file), path.join(this.dir, to, target + file.slice(msg.file.length)));
      }
      await this.renumber(from);
      return { ...msg, folder: to, file: target };
    }));
  }


  /**
   * Renumber the messages of a folder gap free (msg0000, msg0001, ...)
   */
  async renumber(folder: string): Promise<void> {
    const groups = new Map<number, string[]>();
    for (const file of await this.readdir(folder)) {
      const match = MSG_FILE.exec(file);
      if (match) {
        const num = Number(match[1]);
        groups.set(num, [...(groups.get(num) ?? []), file]);
      }
    }
    const numbers = [...groups.keys()].sort((a, b) => a - b);
    for (let idx = 0; idx < numbers.length; idx++) {
      if (numbers[idx] === idx) {
        continue;
      }
      // targets are always lower and already free, so no collisions
      const base = 'msg' + idx.toString().padStart(4, '0');
      for (const file of groups.get(numbers[idx])!) {
        await fs.rename(path.join(this.dir, folder, file), path.join(this.dir, folder, base + file.slice(7)));
      }
    }
  }


  /**
   * Request Asterisk to call the phone and play the message by an outgoing call file
   * @returns path of the created call file
   */
  async originatePlayback(msg: VoicemailMessage, opt: PlaybackOptions): Promise<string> {
    const name    = 'phopps-' + Date.now() + '-' + randomBytes(3).toString('hex') + '.call';
    const tmpDir  = opt.tmpDir ?? path.join(opt.outgoingDir, '..', 'tmp');
    const content = [
      'Channel: '     + opt.channel,
      'CallerID: '    + (opt.callerId ?? '"Voicemail" <vm>'),
      'MaxRetries: 0',
      'WaitTime: '    + (opt.waitTime ?? 30),
      'Application: Playback',
      'Data: '        + this.audioPath(msg).replace(/\\/g, '/'),
      'AlwaysDelete: Yes',
      'Archive: No',
      ''
    ].join('\n');
    // write the file outside the spool dir and move it, so Asterisk never reads a partial file
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, name);
    const target  = path.join(opt.outgoingDir, name);
    await fs.writeFile(tmpFile, content);
    try {
      await fs.rename(tmpFile, target);
    }
    catch (e: any) {
      await fs.unlink(tmpFile).catch(() => undefined);
      if (e.code === 'EXDEV') {
        throw new VoicemailError("tmp dir '" + tmpDir + "' must be on the same filesystem as '" + opt.outgoingDir + "'");
      }
      throw e;
    }
    return target;
  }


  /**
   * Execute fn while holding the Asterisk compatible lock of the folder
   */
  async withLock<T>(folder: string, fn: () => Promise<T>): Promise<T> {
    const dir  = path.join(this.dir, folder);
    const lock = path.join(dir, '.lock');
    const tmp  = path.join(dir, '.lock-' + randomBytes(4).toString('hex'));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmp, process.pid.toString());
    try {
      const start = Date.now();
      for (;;) {
        try {
          await fs.link(tmp, lock);
          break;
        }
        catch (e: any) {
          if (e.code !== 'EEXIST') {
            throw e;
          }
          const stat = await fs.stat(lock).catch(() => undefined);
          if (stat && Date.now() - stat.mtimeMs > LOCK_STALE) {
            await fs.unlink(lock).catch(() => undefined);
            continue;
          }
          if (Date.now() - start > this.lockTimeout) {
            throw new VoicemailError("Folder '" + folder + "' is locked");
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
    try {
      return await fn();
    }
    finally {
      await fs.unlink(lock).catch(() => undefined);
    }
  }


  private async readdir(folder: string): Promise<string[]> {
    try {
      return await fs.readdir(path.join(this.dir, folder));
    }
    catch (e: any) {
      if (e.code === 'ENOENT') {
        return [];
      }
      throw e;
    }
  }


  // all msgNNNN.txt files of a folder
  private async infoFiles(folder: string): Promise<string[]> {
    return (await this.readdir(folder)).filter(file => /^msg\d{4}\.txt$/i.test(file));
  }


  // all files (txt and audio) of one message
  private async messageFiles(folder: string, base: string): Promise<string[]> {
    return (await this.readdir(folder)).filter(file => file.toLowerCase().startsWith(base.toLowerCase() + '.'));
  }


  private async parse(folder: string, file: string): Promise<VoicemailMessage | undefined> {
    try {
      const info = ini.parse(await fs.readFile(path.join(this.dir, folder, file), 'utf-8')).message ?? {};
      const caller = parseCallerId(String(info.callerid ?? ''));
      const time = Number(info.origtime) || 0;
      return {
        id:           String(info.msg_id || time + '-' + (info.duration ?? 0) + '-' + caller.number),
        folder,
        file:         file.slice(0, 7),
        callerName:   caller.name,
        callerNumber: caller.number,
        date:         new Date(time * 1000),
        duration:     Number(info.duration) || 0
      };
    }
    catch (e) {
      console.warn("Unreadable voicemail info '" + path.join(this.dir, folder, file) + "': " + e);
      return undefined;
    }
  }
}


/**
 * Parse an Asterisk caller ID like '"Name" <0123>', '<0123>', '0123' or 'Unknown'
 */
export function parseCallerId(callerid: string): { name: string; number: string } {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]*)>\s*$/.exec(callerid);
  let name   = match ? match[1].trim() : '';
  let number = match ? match[2].trim() : callerid.trim();
  if (!match && !/^[+\d*#]+$/.test(number)) {
    // no number, just a name like 'Unknown'
    name = number;
    number = '';
  }
  if (name === number) {
    name = '';
  }
  return { name, number };
}
