import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import sharp from 'sharp';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { Config } from '../src/provider/config.js';
import { clearWmsCache } from '../src/lib/wms.js';
import { clearWeatherCache } from '../src/lib/openmeteo.js';


const CISCO  = 'SEP000000000001';
const NODISP = 'SEP000000000002';


// a transparent PNG of the requested size, like a WMS answers
async function wmsPng(url: URL): Promise<Buffer> {
  const width  = Number(url.searchParams.get('WIDTH'));
  const height = Number(url.searchParams.get('HEIGHT'));
  return sharp({ create: { width, height, channels: 4, background: { r: 40, g: 80, b: 160, alpha: 0.5 } } }).png().toBuffer();
}


describe('weather applet', () => {
  let root: string;
  let app: FastifyInstance;
  let requests: URL[];
  let wmsError: boolean;

  beforeEach(async () => {
    requests = [];
    wmsError = false;
    clearWmsCache();
    clearWeatherCache();
    vi.stubGlobal('fetch', async (input: string | URL) => {
      const url = new URL(input.toString());
      requests.push(url);
      if (url.hostname === 'api.open-meteo.com') {
        const count = url.searchParams.get('latitude')!.split(',').length;
        const entry = (i: number) => ({ current: { temperature_2m: 10.4 + i, precipitation: i === 0 ? 0.3 : 0 } });
        return Response.json(count === 1 ? entry(0) : Array.from({ length: count }, (_, i) => entry(i)));
      }
      if (url.searchParams.get('request') === 'GetCapabilities') {
        return new Response('<Dimension name="time" default="2026-10-29T15:30:00Z" units="ISO8601">x</Dimension>', { headers: { 'content-type': 'text/xml' } });
      }
      if (wmsError) {
        return new Response('<ServiceExceptionReport><ServiceException code="LayerNotDefined">Could not find layer</ServiceException></ServiceExceptionReport>',
                            { headers: { 'content-type': 'text/xml' } });
      }
      return new Response(new Uint8Array(await wmsPng(url)), { headers: { 'content-type': 'image/png' } });
    });

    root = await fs.mkdtemp(path.join(os.tmpdir(), 'phopps-weather-'));
    const configDir = path.join(root, 'config');
    await fs.mkdir(configDir);
    await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({
      port: 1080,
      device: [
        { name: CISCO,  model: '7975', template: 'phone_test' },
        { name: NODISP, model: '7911', template: 'phone_test' }
      ]
    }));
    await fs.writeFile(path.join(configDir, 'phone_test.json'), JSON.stringify({
      services: {
        applet: 'weather',
        opt: {
          title: 'Hannover', lat: 52.3759, lon: 9.732, zoom: 6,
          sources: [ { url: 'https://wms.test/ows', layers: ['test:clouds', 'test:borders'] }, { url: 'https://radar.test/ows', layers: 'test:radar' } ],
          places: [ { name: 'Hannover', lat: 52.3759, lon: 9.732 }, { name: 'Bremen', lat: 53.0793, lon: 8.8017 } ]
        }
      }
    }));
    app = await buildApp({ config: new Config(configDir), root, logger: false });
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
    await fs.rm(root, { recursive: true, force: true });
  });

  const get = (url: string) => app.inject({ method: 'GET', url, headers: { host: 'phopps:1080' } });


  it('renders the map as image file object with refresh softkey', async () => {
    const res = await get('/services?name=' + CISCO);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<CiscoIPPhoneImageFile WindowMode="Wide"><Title>Hannover</Title>');
    expect(res.body).toMatch(/<URL>http:\/\/phopps:1080\/tmp\/SEP000000000001-weather\.png\?t=\d+<\/URL>/);
    expect(res.body).toContain('<Name>Refresh</Name><URL>http://phopps:1080/applet/weather?name=' + CISCO + '&amp;locale=en&amp;path=services</URL>');

    const meta = await sharp(path.join(root, 'public', 'tmp', CISCO + '-weather.png')).metadata();
    expect({ width: meta.width, height: meta.height }).toEqual({ width: 320, height: 168 });
  });

  it('requests all WMS sources with the bbox of the display and one open-meteo batch', async () => {
    await get('/services?name=' + CISCO);
    const maps = requests.filter(url => url.searchParams.get('REQUEST') === 'GetMap');
    expect(maps.map(url => url.hostname).sort()).toEqual(['radar.test', 'wms.test']);
    const clouds = maps.find(url => url.hostname === 'wms.test')!;
    expect(clouds.searchParams.get('LAYERS')).toBe('test:clouds,test:borders');
    expect(clouds.searchParams.get('CRS')).toBe('EPSG:3857');
    expect(clouds.searchParams.get('WIDTH')).toBe('320');
    expect(clouds.searchParams.get('HEIGHT')).toBe('168');
    const bbox = clouds.searchParams.get('BBOX')!.split(',').map(Number);
    expect((bbox[0] + bbox[2]) / 2).toBeCloseTo(1083361, -1);

    const meteo = requests.filter(url => url.hostname === 'api.open-meteo.com');
    expect(meteo).toHaveLength(1);
    expect(meteo[0].searchParams.get('latitude')).toBe('52.3759,53.0793');

    const caps = requests.find(url => url.searchParams.get('request') === 'GetCapabilities')!;
    expect(caps.pathname).toBe('/test/clouds/ows');
  });

  it('shows the temperatures as text on phones without graphic display', async () => {
    const res = await get('/services?name=' + NODISP);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<Text>Hannover: 10°, 0.3 mm\nBremen: 11°</Text>');
  });

  it('shows an error screen if no WMS layer is available', async () => {
    wmsError = true;
    const res = await get('/applet/weather?name=' + CISCO + '&path=services');
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<Text>Weather not available</Text>');
  });
});
