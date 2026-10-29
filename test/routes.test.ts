import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { Config } from '../src/provider/config.js';
import { tempMailbox } from './helpers.js';


const CISCO = 'SEP000000000001';
const SNOM  = 'SNOM00000002';


// decoded <URL> values of a XML object, without the scheme and host
function urls(xml: string): string[] {
  return [...xml.matchAll(/<URL>(.*?)<\/URL>/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, ''));
}


describe('routes', () => {
  let env: Awaited<ReturnType<typeof tempMailbox>>;
  let app: FastifyInstance;

  beforeEach(async () => {
    env = await tempMailbox();
    const configDir = path.join(env.root, 'config');
    await fs.mkdir(configDir);
    await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
      port: 1080,
      device: [
        { name: CISCO, model: '7975', username: 'user', password: 'pass', template: 'phone_test' },
        { name: SNOM,  model: '765', template: 'phone_test' }
      ]
    }));
    await fs.writeFile(path.join(configDir, 'phone_test.json'), `// comments are allowed
    {
      "directory": {
        "applet": "menu",
        "opt": {
          "title": "Menu",
          "item": [
            { "name": "Hello", "applet": "text", "opt": { "title": "Hello", "text": "World" } },
            { "name": "Direct", "url": "http://example.com/x" }
          ]
        }
      },
      "messages": {
        "applet": "voicemail",
        "name":   "Mailbox",
        "opt": {
          "incoming_dir":     ${JSON.stringify(env.mailbox)},
          "outgoing_dir":     ${JSON.stringify(env.outgoing)},
          "tmp_dir":          ${JSON.stringify(path.join(env.root, 'spool', 'tmp'))},
          "outgoing_channel": "Local/86",
          "mailbox":          [ "INBOX", "Old" ],
          "dial_prefix":      "0"
        }
      }
    }`);
    app = await buildApp({ config: new Config(configDir), logger: false });
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(env.root, { recursive: true, force: true });
  });

  const get = (url: string) => app.inject({ method: 'GET', url, headers: { host: 'phopps:1080' } });


  it('answers the default route', async () => {
    const res = await get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Phopps is online');
  });

  it('authenticates devices', async () => {
    expect((await get('/authenticate?name=' + CISCO + '&UserID=user&Password=pass')).body).toBe('AUTHORIZED');
    expect((await get('/authenticate?name=' + CISCO + '&UserID=user&Password=wrong')).body).toBe('UN-AUTHORIZED');
    expect((await get('/authenticate?name=unknown&UserID=user&Password=pass')).body).toBe('UN-AUTHORIZED');
    expect((await get('/authenticate?name=' + SNOM + '&UserID=&Password=')).body).toBe('UN-AUTHORIZED');
  });

  it('renders the directory menu with correct item paths', async () => {
    const res = await get('/directory?name=' + CISCO);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.body).toContain('<CiscoIPPhoneMenu>');
    const [hello, direct] = urls(res.body);
    expect(direct).toBe('/x');
    expect(hello).toBe('/applet/text?name=' + CISCO + '&locale=en&path=directory.opt.item%5B0%5D');

    const text = await get(hello);
    expect(text.statusCode).toBe(200);
    expect(text.body).toContain('<CiscoIPPhoneText><Title>Hello</Title><Text>World</Text></CiscoIPPhoneText>');
  });

  it('rejects unknown devices, services, applets and paths', async () => {
    expect((await get('/directory?name=unknown')).statusCode).toBe(404);
    expect((await get('/idle?name=' + CISCO)).statusCode).toBe(404);
    expect((await get('/applet/..%2F..%2Fserver?name=' + CISCO + '&path=directory')).statusCode).toBe(404);
    expect((await get('/applet/voicemail?name=' + CISCO + '&path=directory')).statusCode).toBe(404);
    expect((await get('/applet/menu?name=' + CISCO + '&path=__proto__')).statusCode).toBe(404);
    expect((await get('/applet/menu?name=' + CISCO)).statusCode).toBe(404);
    expect((await get('/nothing')).statusCode).toBe(404);
  });

  it('serves the voicemail icons', async () => {
    const res = await get('/icons/vm-new.png');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
  });


  describe('voicemail', () => {

    it('shows the folders with message counts', async () => {
      const res = await get('/messages?name=' + CISCO + '&locale=de');
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('<Title>Mailbox</Title>');
      expect(res.body).toContain('<Name>Neue Nachrichten (2)</Name>');
      expect(res.body).toContain('<Name>Alte Nachrichten (12)</Name>');
      expect(urls(res.body)[0]).toBe('/applet/voicemail?name=' + CISCO + '&locale=de&path=messages&view=list&folder=INBOX');
    });

    it('lists messages with icons and softkeys on Cisco color phones', async () => {
      const res = await get('/applet/voicemail?name=' + CISCO + '&path=messages&view=list&folder=INBOX');
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('<CiscoIPPhoneIconFileMenu>');
      expect(res.body).toContain('<Title>New messages (2)</Title>');
      expect(res.body).toMatch(/<IconIndex>0<\/IconIndex><Name>\d\d\/\d\d \d\d:\d\d \d+ \(\d+:\d\d\)<\/Name>/);
      expect(res.body).toContain('<URL>QueryStringParam:action=play</URL>');
      expect(res.body).toContain('<URL>QueryStringParam:action=delete</URL>');
      expect(res.body).toContain('<URL>http://phopps:1080/icons/vm-new.png</URL>');
    });

    it('lists messages as plain menu on Snom phones', async () => {
      const res = await get('/applet/voicemail?name=' + SNOM + '&path=messages&view=list&folder=INBOX');
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('<SnomIPPhoneMenu>');
      expect(res.body).toMatch(/<Name>\* /);
      expect(res.body).not.toContain('QueryStringParam');
    });

    it('shows message details with call back', async () => {
      const list = await get('/applet/voicemail?name=' + CISCO + '&path=messages&view=list&folder=Old');
      const details = await get(urls(list.body)[0]);
      expect(details.statusCode).toBe(200);
      expect(details.body).toContain('<CiscoIPPhoneText><Title>Old messages 1/12</Title>');
      expect(details.body).toMatch(/<Text>From: [^<]+\nNumber: \d+\nDate: [^<]+\nLength: \d+:\d\d<\/Text>/);
      expect(details.body).toMatch(/<URL>Dial:0\d+<\/URL>/);
    });

    it('plays a new message, moves it to Old and writes a call file', async () => {
      const list = await get('/applet/voicemail?name=' + CISCO + '&path=messages&view=list&folder=INBOX');
      const res = await get(urls(list.body)[0] + '&action=play');
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Your phone will ring now');

      const calls = await fs.readdir(env.outgoing);
      expect(calls).toHaveLength(1);
      const call = await fs.readFile(path.join(env.outgoing, calls[0]), 'utf-8');
      expect(call).toContain('Channel: Local/86\n');
      expect(call).toContain('Data: ' + path.join(env.mailbox, 'Old', 'msg0012').replace(/\\/g, '/') + '\n');

      const folders = await get('/messages?name=' + CISCO);
      expect(folders.body).toContain('New messages (1)');
      expect(folders.body).toContain('Old messages (13)');
    });

    it('asks before deleting and deletes on confirmation', async () => {
      const list = await get('/applet/voicemail?name=' + CISCO + '&path=messages&view=list&folder=Old');
      const confirm = await get(urls(list.body)[0] + '&action=delete');
      expect(confirm.statusCode).toBe(200);
      expect(confirm.body).toMatch(/<Text>Delete message from \d+\?/);
      const [yes, no] = urls(confirm.body);
      expect(yes).toContain('confirm=1');
      expect(no).toContain('view=msg');

      const deleted = await get(yes);
      expect(deleted.statusCode).toBe(200);
      expect(deleted.body).toContain('<Title>Old messages (11)</Title><Prompt>Message deleted</Prompt>');

      // deleting again shows that the message is gone
      const again = await get(yes);
      expect(again.body).toContain('The message does not exist anymore.');
    });

    it('rejects folders that are not configured', async () => {
      const res = await get('/applet/voicemail?name=' + CISCO + '&path=messages&view=list&folder=..%2F..%2F42');
      expect(res.statusCode).toBe(404);
    });

    it('shows an empty folder', async () => {
      await fs.rm(path.join(env.mailbox, 'INBOX'), { recursive: true });
      const res = await get('/applet/voicemail?name=' + CISCO + '&path=messages&view=list&folder=INBOX');
      expect(res.body).toContain('<Title>New messages (0)</Title><Text>No messages</Text>');
    });
  });
});
