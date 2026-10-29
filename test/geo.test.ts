import { describe, expect, it } from 'vitest';
import { bboxForZoom, mercator, resolution, toPixel } from '../src/lib/geo.js';
import { parseTimeDimension } from '../src/lib/wms.js';


describe('geo', () => {
  it('projects to web mercator', () => {
    expect(mercator(0, 0).x).toBeCloseTo(0, 6);
    expect(mercator(0, 0).y).toBeCloseTo(0, 6);
    const p = mercator(52.3759, 9.732);
    expect(p.x).toBeCloseTo(1083361, 0);
    expect(p.y).toBeCloseTo(6868379, -1);
  });

  it('uses web map zoom resolutions', () => {
    expect(resolution(0)).toBeCloseTo(156543.03, 1);
    expect(resolution(7)).toBeCloseTo(156543.03 / 128, 2);
  });

  it('builds a bbox of the image size around the center', () => {
    const bbox = bboxForZoom(52.3759, 9.732, 7, 298, 168);
    expect((bbox[2] - bbox[0]) / resolution(7)).toBeCloseTo(298, 6);
    expect((bbox[3] - bbox[1]) / resolution(7)).toBeCloseTo(168, 6);
    const center = toPixel(52.3759, 9.732, bbox, 298, 168);
    expect(center.x).toBeCloseTo(149, 6);
    expect(center.y).toBeCloseTo(84, 6);
  });

  it('places north and east correctly', () => {
    const bbox = bboxForZoom(52, 10, 6, 320, 216);
    const ne = toPixel(52.5, 10.5, bbox, 320, 216);
    expect(ne.x).toBeGreaterThan(160);
    expect(ne.y).toBeLessThan(108);
  });
});


describe('parseTimeDimension', () => {
  it('uses a concrete default time', () => {
    expect(parseTimeDimension('<Dimension name="time" default="2026-10-29T15:30:00Z" units="ISO8601">2026-10-01T00:00:00Z/2026-10-29T15:30:00Z/PT10M</Dimension>'))
      .toEqual(new Date('2026-10-29T15:30:00Z'));
  });

  it('uses the end of the range for default="current"', () => {
    expect(parseTimeDimension('<Dimension name="time" default="current" units="ISO8601">2026-10-26T00:00:00.000Z/2026-10-29T17:55:00.000Z/PT5M</Dimension>'))
      .toEqual(new Date('2026-10-29T17:55:00Z'));
  });

  it('returns undefined without time dimension', () => {
    expect(parseTimeDimension('<Layer><Name>x</Name></Layer>')).toBeUndefined();
  });
});
