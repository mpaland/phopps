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
// \brief applet 'voicemail'
//        Visual voicemail box for Asterisk mailboxes.
//
//        Screens (query parameters):
//          -                              folder list with message counts
//          view=list&folder=INBOX         message list of a folder
//          view=msg&folder=INBOX&id=..    message details
//          action=play&folder&id          Asterisk calls the phone and plays the message
//          action=delete&folder&id        delete confirmation, '&confirm=1' deletes
//
//        Options:
//          incoming_dir      mailbox directory like /var/spool/asterisk/voicemail/default/41
//          outgoing_dir      Asterisk call file spool dir like /var/spool/asterisk/outgoing
//          outgoing_channel  channel calling the phone like 'Local/86@from-internal'
//          tmp_dir           temp dir on the same filesystem as outgoing_dir, default '<outgoing_dir>/../tmp'
//          callerid          caller ID of the playback call, default '"Voicemail" <vm>'
//          mailbox           folders to show, default [ "INBOX", "Old" ]
//          mark_read         move played INBOX messages to 'Old', default true
//          dial_prefix       prefix for the call back softkey, like '0'
//          labels            overrides of the screen texts, see LABELS
//
///////////////////////////////////////////////////////////////////////////////

import { format } from 'date-fns';
import { Applet, AppletContext, AppletResult } from '../applet.js';
import { IconItem, MenuItem, SoftKey } from '../../lib/xmlobjects.js';
import { Mailbox, VoicemailError, VoicemailMessage } from '../../lib/voicemail.js';


const LABELS = {
  en: {
    title:      'Voicemail',
    INBOX:      'New messages',
    Old:        'Old messages',
    empty:      'No messages',
    from:       'From',
    number:     'Number',
    date:       'Date',
    length:     'Length',
    unknown:    'Unknown',
    play:       'Play',
    delete:     'Delete',
    details:    'Details',
    callback:   'Call',
    next:       'Next',
    back:       'Back',
    exit:       'Exit',
    yes:        'Yes',
    no:         'No',
    confirm:    'Delete message from %s?',
    deleted:    'Message deleted',
    playing:    'Your phone will ring now.\nAnswer the call to listen to the message from %s.',
    notfound:   'The message does not exist anymore.',
    error:      'Error: %s',
    dateformat: 'MM/dd HH:mm',
    longdate:   'MM/dd/yyyy HH:mm'
  },
  de: {
    title:      'Anrufbeantworter',
    INBOX:      'Neue Nachrichten',
    Old:        'Alte Nachrichten',
    empty:      'Keine Nachrichten',
    from:       'Von',
    number:     'Nummer',
    date:       'Datum',
    length:     'Länge',
    unknown:    'Unbekannt',
    play:       'Abspielen',
    delete:     'Löschen',
    details:    'Details',
    callback:   'Anrufen',
    next:       'Nächste',
    back:       'Zurück',
    exit:       'Beenden',
    yes:        'Ja',
    no:         'Nein',
    confirm:    'Nachricht von %s löschen?',
    deleted:    'Nachricht gelöscht',
    playing:    'Ihr Telefon klingelt gleich.\nNehmen Sie ab, um die Nachricht von %s zu hören.',
    notfound:   'Die Nachricht existiert nicht mehr.',
    error:      'Fehler: %s',
    dateformat: 'dd.MM. HH:mm',
    longdate:   'dd.MM.yyyy HH:mm'
  }
};

type Labels = typeof LABELS.en;


interface Screen {
  ctx:     AppletContext;
  t:       Labels;
  mailbox: Mailbox;
  folders: string[];
}


class Voicemail extends Applet {

  async render(ctx: AppletContext): Promise<AppletResult> {
    const opt = ctx.applet.opt;
    const dir = opt.incoming_dir ?? opt.dir;
    if (typeof dir !== 'string') {
      return this.notFound("Voicemail applet at '" + ctx.path + "' has no incoming_dir");
    }

    const screen: Screen = {
      ctx,
      t:       { ...(/^(de|german)/i.test(ctx.locale) ? LABELS.de : LABELS.en), ...(opt.labels ?? {}) },
      mailbox: new Mailbox(dir),
      folders: Array.isArray(opt.mailbox) && opt.mailbox.length > 0 ? opt.mailbox.map(String) : ['INBOX', 'Old']
    };
    const { folder, id, view, action } = ctx.query;

    if (folder !== undefined && !screen.folders.includes(folder)) {
      return this.notFound("Folder '" + folder + "' is not configured");
    }

    try {
      if (folder && id && action === 'play') {
        return await this.play(screen, folder, id);
      }
      if (folder && id && action === 'delete') {
        return ctx.query.confirm === '1' ? await this.delete(screen, folder, id) : await this.confirmDelete(screen, folder, id);
      }
      if (folder && id && view === 'msg') {
        return await this.details(screen, folder, id);
      }
      if (folder) {
        return await this.list(screen, folder);
      }
      return await this.folders(screen);
    }
    catch (e) {
      if (e instanceof VoicemailError) {
        return this.message(screen, screen.t.error.replace('%s', e.message), folder);
      }
      throw e;
    }
  }


  // folder list with message counts
  private async folders(s: Screen): Promise<AppletResult> {
    const items: MenuItem[] = (await s.mailbox.folders(s.folders)).map(info => ({
      name: this.folderName(s, info.folder) + ' (' + info.count + ')',
      url:  this.link(s, { view: 'list', folder: info.folder })
    }));
    return this.xml(s.ctx, this.xmlobj.IPPhoneMenu(s.ctx.vendor, this.title(s), s.ctx.applet.opt.prompt, items));
  }


  // message list of a folder
  private async list(s: Screen, folder: string, prompt?: string): Promise<AppletResult> {
    const messages = await s.mailbox.list(folder);
    const title = this.folderName(s, folder) + ' (' + messages.length + ')';
    const back  = this.link(s);

    if (messages.length === 0) {
      return this.xml(s.ctx, this.xmlobj.IPPhoneText(s.ctx.vendor, title, prompt, s.t.empty, [
        { name: s.t.back, url: back,           position: 1 },
        { name: s.t.exit, url: 'SoftKey:Exit', position: 3 }
      ]));
    }

    const items: MenuItem[] = messages.map(msg => ({
      name: format(msg.date, s.t.dateformat) + ' ' + this.caller(s, msg) + ' (' + duration(msg.duration) + ')',
      url:  this.link(s, { view: 'msg', folder, id: msg.id }),
      icon: folder === 'INBOX' ? 0 : 1
    }));

    if (s.ctx.vendor === 'Cisco') {
      // the QueryStringParam URI appends the parameter to the URL of the selected item
      const softkeys: SoftKey[] = [
        { name: s.t.play,    url: 'QueryStringParam:action=play',   position: 1 },
        { name: s.t.details, url: 'SoftKey:Select',                 position: 2 },
        { name: s.t.delete,  url: 'QueryStringParam:action=delete', position: 3 },
        { name: s.t.back,    url: back,                             position: 4 },
        { name: s.t.exit,    url: 'SoftKey:Exit',                   position: 5 }
      ];
      if (s.ctx.specs.color) {
        const icons: IconItem[] = [
          { index: 0, url: s.ctx.baseUrl + '/icons/vm-new.png' },
          { index: 1, url: s.ctx.baseUrl + '/icons/vm-old.png' }
        ];
        return this.xml(s.ctx, this.xmlobj.IPPhoneIconFileMenu(s.ctx.vendor, title, prompt, items, icons, softkeys));
      }
      return this.xml(s.ctx, this.xmlobj.IPPhoneMenu(s.ctx.vendor, title, prompt, items, softkeys));
    }

    // Snom: select opens the details with play and delete
    const marked = items.map(item => ({ ...item, name: (item.icon === 0 ? '* ' : '') + item.name }));
    return this.xml(s.ctx, this.xmlobj.IPPhoneMenu(s.ctx.vendor, title, prompt, marked, [
      { name: s.t.back, url: back,           position: 1 },
      { name: s.t.exit, url: 'SoftKey:Exit', position: 4 }
    ]));
  }


  // message details
  private async details(s: Screen, folder: string, id: string, prompt?: string): Promise<AppletResult> {
    const messages = await s.mailbox.list(folder);
    const idx = messages.findIndex(msg => msg.id === id);
    if (idx < 0) {
      return this.message(s, s.t.notfound, folder);
    }
    const msg  = messages[idx];
    const next = messages[idx + 1];
    const text = [
      s.t.from   + ': ' + (msg.callerName || msg.callerNumber || s.t.unknown),
      s.t.number + ': ' + (msg.callerNumber || '-'),
      s.t.date   + ': ' + format(msg.date, s.t.longdate),
      s.t.length + ': ' + duration(msg.duration)
    ].join('\n');

    const softkeys: SoftKey[] = [
      { name: s.t.play,   url: this.link(s, { action: 'play', folder, id }),   position: 1 },
      { name: s.t.delete, url: this.link(s, { action: 'delete', folder, id }), position: 2 }
    ];
    if (/^[+\d*#]+$/.test(msg.callerNumber)) {
      softkeys.push({ name: s.t.callback, url: 'Dial:' + (s.ctx.applet.opt.dial_prefix ?? '') + msg.callerNumber, position: 3 });
    }
    softkeys.push({ name: s.t.next, url: next ? this.link(s, { view: 'msg', folder, id: next.id }) : this.link(s, { view: 'list', folder }), position: 4 });
    softkeys.push({ name: s.t.back, url: this.link(s, { view: 'list', folder }), position: 5 });

    return this.xml(s.ctx, this.xmlobj.IPPhoneText(s.ctx.vendor, this.folderName(s, folder) + ' ' + (idx + 1) + '/' + messages.length, prompt, text, this.fitKeys(s, softkeys)));
  }


  // let Asterisk call the phone and play the message
  private async play(s: Screen, folder: string, id: string): Promise<AppletResult> {
    const opt = s.ctx.applet.opt;
    if (typeof opt.outgoing_dir !== 'string' || typeof opt.outgoing_channel !== 'string') {
      return this.notFound('Voicemail playback needs outgoing_dir and outgoing_channel');
    }
    const messages = await s.mailbox.list(folder);
    const idx = messages.findIndex(m => m.id === id);
    if (idx < 0) {
      return this.message(s, s.t.notfound, folder);
    }
    let msg  = messages[idx];
    const next = messages[idx + 1];

    // mark as read first, so the call file refers to the final location
    if (folder === 'INBOX' && opt.mark_read !== false && s.folders.includes('Old')) {
      msg = await s.mailbox.move('INBOX', 'Old', msg.id);
    }
    await s.mailbox.originatePlayback(msg, {
      outgoingDir: opt.outgoing_dir,
      tmpDir:      opt.tmp_dir,
      channel:     opt.outgoing_channel,
      callerId:    opt.callerid
    });

    const softkeys: SoftKey[] = [
      { name: s.t.back,   url: this.link(s, { view: 'list', folder }),                         position: 1 },
      { name: s.t.delete, url: this.link(s, { action: 'delete', folder: msg.folder, id: msg.id }), position: 2 },
      { name: s.t.play,   url: this.link(s, { action: 'play', folder: msg.folder, id: msg.id }),   position: 3 }
    ];
    if (next) {
      softkeys.push({ name: s.t.next, url: this.link(s, { view: 'msg', folder, id: next.id }), position: 4 });
    }
    softkeys.push({ name: s.t.exit, url: 'SoftKey:Exit', position: 5 });

    const text = s.t.playing.replace('%s', this.caller(s, msg));
    return this.xml(s.ctx, this.xmlobj.IPPhoneText(s.ctx.vendor, this.title(s), undefined, text, this.fitKeys(s, softkeys)));
  }


  private async confirmDelete(s: Screen, folder: string, id: string): Promise<AppletResult> {
    const msg = await s.mailbox.get(folder, id);
    if (!msg) {
      return this.message(s, s.t.notfound, folder);
    }
    const text = s.t.confirm.replace('%s', this.caller(s, msg)) + '\n' + format(msg.date, s.t.longdate) + ' (' + duration(msg.duration) + ')';
    return this.xml(s.ctx, this.xmlobj.IPPhoneText(s.ctx.vendor, this.title(s), undefined, text, [
      { name: s.t.yes, url: this.link(s, { action: 'delete', folder, id, confirm: '1' }), position: 1 },
      { name: s.t.no,  url: this.link(s, { view: 'msg', folder, id }),                    position: 2 }
    ]));
  }


  private async delete(s: Screen, folder: string, id: string): Promise<AppletResult> {
    if (!await s.mailbox.get(folder, id)) {
      return this.message(s, s.t.notfound, folder);
    }
    await s.mailbox.delete(folder, id);
    return this.list(s, folder, s.t.deleted);
  }


  // simple text screen with back to the folder
  private message(s: Screen, text: string, folder?: string): AppletResult | Promise<AppletResult> {
    return this.xml(s.ctx, this.xmlobj.IPPhoneText(s.ctx.vendor, this.title(s), undefined, text, [
      { name: s.t.back, url: folder ? this.link(s, { view: 'list', folder }) : this.link(s), position: 1 },
      { name: s.t.exit, url: 'SoftKey:Exit', position: 3 }
    ]));
  }


  private link(s: Screen, params: Record<string, string> = {}): string {
    return this.url(s.ctx, 'voicemail', s.ctx.path, params);
  }


  private title(s: Screen): string {
    return s.ctx.applet.opt.title || s.ctx.applet.name || s.t.title;
  }


  private folderName(s: Screen, folder: string): string {
    return (s.t as Record<string, string>)[folder] ?? folder;
  }


  private caller(s: Screen, msg: VoicemailMessage): string {
    return msg.callerName || msg.callerNumber || s.t.unknown;
  }


  // phones with fewer softkeys: keep the first ones, renumbered
  private fitKeys(s: Screen, softkeys: SoftKey[]): SoftKey[] {
    if (s.ctx.vendor === 'Cisco') {
      // Cisco shows additional softkeys behind 'more'
      return softkeys.map((key, i) => ({ ...key, position: i + 1 }));
    }
    return softkeys
      .filter(key => /^(https?:|SoftKey:)/i.test(key.url))
      .slice(0, s.ctx.specs.keys)
      .map((key, i) => ({ ...key, position: i + 1 }));
  }
}


function duration(seconds: number): string {
  return Math.floor(seconds / 60) + ':' + (seconds % 60).toString().padStart(2, '0');
}


// export the voicemail applet
export default new Voicemail();
