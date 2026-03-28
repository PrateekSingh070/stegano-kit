#!/usr/bin/env node
import { program } from 'commander';
import { createReadStream, createWriteStream, readFileSync } from 'fs';
import { PNG } from 'pngjs';
import { encode } from './encode';
import { decode } from './decode';
import { capacity } from './capacity';
import { detect } from './detect';
import type { ImageLike } from './types';

function loadPNG(filePath: string): Promise<ImageLike> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath).pipe(new PNG());
    stream.on('parsed', function (this: PNG) {
      resolve({
        width: this.width,
        height: this.height,
        data: new Uint8ClampedArray(this.data),
      });
    });
    stream.on('error', reject);
  });
}

function savePNG(imageData: ImageLike, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const png = new PNG({ width: imageData.width, height: imageData.height });
    Buffer.from(imageData.data).copy(png.data);
    const out = createWriteStream(filePath);
    png.pack().pipe(out);
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

program
  .name('stegano')
  .description('Hide and extract secret messages in PNG images')
  .version(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')).version);

program
  .command('encode')
  .description('Hide a secret message inside a PNG image')
  .requiredOption('-i, --image <path>', 'Input PNG image')
  .requiredOption('-m, --message <text>', 'Secret message to hide')
  .option('-o, --output <path>', 'Output PNG path', 'encoded.png')
  .option('-b, --bits <n>', 'Bits per channel (1-4)', '1')
  .option('-c, --channels <list>', 'Color channels to use (r,g,b,a)', 'r,g,b')
  .option('-p, --password <pw>', 'Encrypt with AES-256-GCM')
  .action(async (opts) => {
    try {
      const img = await loadPNG(opts.image);
      const channels = opts.channels.split(',') as Array<'r' | 'g' | 'b' | 'a'>;
      const encoded = await encode(img, opts.message, {
        bitsPerChannel: parseInt(opts.bits, 10),
        channels,
        password: opts.password,
      });
      await savePNG(encoded, opts.output);
      console.log(`Message encoded into ${opts.output}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('decode')
  .description('Extract a hidden message from a PNG image')
  .requiredOption('-i, --image <path>', 'Encoded PNG image')
  .option('-b, --bits <n>', 'Bits per channel (1-4)', '1')
  .option('-c, --channels <list>', 'Color channels used (r,g,b,a)', 'r,g,b')
  .option('-p, --password <pw>', 'Decryption password')
  .action(async (opts) => {
    try {
      const img = await loadPNG(opts.image);
      const channels = opts.channels.split(',') as Array<'r' | 'g' | 'b' | 'a'>;
      const message = await decode(img, {
        bitsPerChannel: parseInt(opts.bits, 10),
        channels,
        password: opts.password,
      });
      console.log(message);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('capacity')
  .description('Check how much data an image can hold')
  .requiredOption('-i, --image <path>', 'PNG image to analyze')
  .option('-b, --bits <n>', 'Bits per channel (1-4)', '1')
  .option('-c, --channels <list>', 'Color channels (r,g,b,a)', 'r,g,b')
  .action(async (opts) => {
    try {
      const img = await loadPNG(opts.image);
      const channels = opts.channels.split(',') as Array<'r' | 'g' | 'b' | 'a'>;
      const info = capacity(img, {
        bitsPerChannel: parseInt(opts.bits, 10),
        channels,
      });
      console.log(`Image:    ${info.width} × ${info.height}`);
      console.log(`Capacity: ${info.readable} (${info.totalBytes} bytes)`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('detect')
  .description('Analyze an image for hidden steganographic data')
  .requiredOption('-i, --image <path>', 'PNG image to analyze')
  .action(async (opts) => {
    try {
      const img = await loadPNG(opts.image);
      const result = detect(img);
      console.log(`Has hidden data: ${result.hasHiddenData ? 'Yes' : 'No'}`);
      console.log(`Confidence:      ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Method:          ${result.method}`);
      if (result.details) {
        console.log(`Details:         ${result.details}`);
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
