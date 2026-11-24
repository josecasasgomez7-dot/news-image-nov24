// News Image entry for Tuesday, 24 November 2026.
// Takes the finished front page (entry.png, kept next to this file),
// checks it is really the image the bounty asks for, and places a
// copy in the output directory the harness reads from.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// What the bounty requires of the image.
const EXPECTED = { width: 1024, height: 1024, maxBytes: 1024 * 1024 };

// The first eight bytes of every PNG file, in order.
const MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fail(message: string): never {
  throw new Error("entry.png failed validation: " + message);
}

// Read the image and make sure it is a 1024x1024 PNG under the 1 MiB
// limit before anything is copied. A bad file must stop the run here,
// not land in the output directory.
function validateEntry(bytes: Buffer): void {
  if (bytes.length < MAGIC.length) {
    fail("file is too short to be a PNG (" + bytes.length + " bytes)");
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) {
      fail(
        "not a PNG file (first bytes are " +
          bytes.subarray(0, 8).toString("hex") +
          ", expected 89504e470d0a1a0a)",
      );
    }
  }

  // Width and height live in the IHDR chunk: bytes 16-19 and 20-23,
  // each a big-endian 32-bit integer.
  if (bytes.length < 24 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    fail("missing the IHDR chunk a PNG must start with");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== EXPECTED.width || height !== EXPECTED.height) {
    fail(
      `is ${width}x${height}, expected ` +
        `${EXPECTED.width}x${EXPECTED.height}`,
    );
  }

  if (bytes.length > EXPECTED.maxBytes) {
    fail(
      `is ${bytes.length} bytes, over the ` +
        `${EXPECTED.maxBytes} byte limit`,
    );
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const image = readFileSync(join(here, "entry.png"));
validateEntry(image);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), image);
console.log(
  `entry.png (${EXPECTED.width}x${EXPECTED.height}, ` +
    `${image.length} bytes) written to ` +
    outDir,
);
