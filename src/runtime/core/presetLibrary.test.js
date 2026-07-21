import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEffectTemplate } from './parseEffectTemplate.js';

const effectsDirectory = join(process.cwd(), 'effects');

describe('preset effect library', () => {
  it('parses every effect JSON preset with the runtime parser', async () => {
    const fileNames = (await readdir(effectsDirectory)).filter((fileName) => fileName.endsWith('.json'));

    expect(fileNames.sort()).toEqual([
      'explosion.json',
      'fire.json',
      'heal.json',
      'nova_point.json',
      'rain.json',
      'realistic_fire.json',
      'smoke.json',
    ]);

    for (const fileName of fileNames) {
      const filePath = join(effectsDirectory, fileName);
      const presetData = JSON.parse(await readFile(filePath, 'utf8'));
      const template = parseEffectTemplate(presetData, { source: `effects/${fileName}` });

      expect(template.id).toBe(presetData.id);
      expect(template.emitters.length).toBeGreaterThan(0);
      expect(template.source).toBe(`effects/${fileName}`);
    }
  });
});