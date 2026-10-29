import { describe, expect, it } from 'vitest';
import { XmlObj } from '../src/lib/xmlobjects.js';
import { resolvePath } from '../src/provider/config.js';
import { expandMacros } from '../src/lib/macros.js';


const xmlobj = new XmlObj();


describe('XmlObj', () => {
  it('renders a quoted Cisco menu', () => {
    const xml = xmlobj.IPPhoneMenu('Cisco', 'Title & more', '', [{ name: 'A <b>', url: 'http://x/?a=1&b=2' }]);
    expect(xml).toBe('<?xml version="1.0" encoding="utf-8" ?><CiscoIPPhoneMenu><Title>Title &amp; more</Title>' +
      '<MenuItem><Name>A &lt;b&gt;</Name><URL>http://x/?a=1&amp;b=2</URL></MenuItem></CiscoIPPhoneMenu>');
  });

  it('renders Cisco softkeys with position', () => {
    const xml = xmlobj.IPPhoneText('Cisco', 'T', '', 'text', [{ name: 'Exit', url: 'SoftKey:Exit', position: 3 }]);
    expect(xml).toContain('<SoftKeyItem><Name>Exit</Name><URL>SoftKey:Exit</URL><Position>3</Position></SoftKeyItem>');
  });

  it('renders Snom softkeys with function key names and drops Cisco only URIs', () => {
    const xml = xmlobj.IPPhoneText('Snom', 'T', '', 'text', [
      { name: 'Play', url: 'http://x/play', position: 1 },
      { name: 'Call', url: 'Dial:123', position: 2 },
      { name: 'Exit', url: 'SoftKey:Exit', position: 4 }
    ]);
    expect(xml).toContain('<SnomIPPhoneText>');
    expect(xml).toContain('<SoftKeyItem><Name>F1</Name><Label>Play</Label><URL>http://x/play</URL></SoftKeyItem>');
    expect(xml).toContain('<SoftKeyItem><Name>F4</Name><Label>Exit</Label><SoftKey>F_ABORT</SoftKey></SoftKeyItem>');
    expect(xml).not.toContain('Dial:');
  });

  it('renders an icon file menu', () => {
    const xml = xmlobj.IPPhoneIconFileMenu('Cisco', 'T', '', [{ name: 'n', url: 'u', icon: 1 }], [{ index: 1, url: 'i.png' }]);
    expect(xml).toContain('<MenuItem><IconIndex>1</IconIndex><Name>n</Name><URL>u</URL></MenuItem>');
    expect(xml).toContain('<IconItem><Index>1</Index><URL>i.png</URL></IconItem>');
  });

  it('keeps the touch areas of graphic file menus', () => {
    const xml = xmlobj.IPPhoneGraphicFileMenu('', '', 'normal', 0, 0, 'bg.png', [{ name: 'n', url: 'u', touch: { left: 1, top: 2, right: 3, bottom: 4 } }]);
    expect(xml).toContain('<TouchArea X1="1" Y1="2" X2="3" Y2="4"></TouchArea>');
  });

  it('falls back to 7975 specs for unknown models', () => {
    expect(xmlobj.isKnownModel('1234')).toBe(false);
    expect(xmlobj.getModelSpecs('1234')).toEqual(xmlobj.getModelSpecs('7975'));
    expect(xmlobj.getModelSpecs('765').vendor).toBe('Snom');
  });
});


describe('resolvePath', () => {
  const tmpl = { directory: { opt: { item: [{ a: 1 }, { b: { c: 2 } }] } }, cron: [{ x: 1 }] };

  it('resolves dotted and indexed paths', () => {
    expect(resolvePath(tmpl, 'directory.opt.item[1].b.c')).toBe(2);
    expect(resolvePath(tmpl, 'cron[0]')).toEqual({ x: 1 });
    expect(resolvePath({ phone: { 'SEP1': 5 } }, "phone['SEP1']")).toBe(5);
  });

  it('rejects unknown, prototype and malformed paths', () => {
    expect(resolvePath(tmpl, 'directory.nope')).toBeUndefined();
    expect(resolvePath(tmpl, '__proto__')).toBeUndefined();
    expect(resolvePath(tmpl, 'constructor')).toBeUndefined();
    expect(resolvePath(tmpl, 'directory.opt.item[" + i + "]')).toBeUndefined();
    expect(resolvePath(tmpl, '')).toBeUndefined();
  });
});


describe('expandMacros', () => {
  const now = new Date(2026, 9, 29, 14, 37, 12);

  it('expands local time formats with minute steps', () => {
    expect(expandMacros('x/$NOW(yyyy/MM/dd)/$NOW(HHmd).jpg', 0, now)).toBe('x/2026/10/29/1430.jpg');
    expect(expandMacros('$NOW(HHmq)-$NOW(HHmh)', 0, now)).toBe('1430-1430');
  });

  it('applies the time offset', () => {
    expect(expandMacros('$NOW(HH:mm)', -600, now)).toBe('14:27');
  });

  it('expands random numbers', () => {
    expect(expandMacros('img.jpg?$RND(13)', 0, now)).toMatch(/^img\.jpg\?\d{13}$/);
  });
});
