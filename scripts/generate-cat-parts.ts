import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI();

const PARTS = ["eyes", "nose", "tail", "body"] as const;
type Part = (typeof PARTS)[number];

const COUNT = 5;
const OUTPUT_DIR = "public/cat-parts";

const STYLE = "kawaii chibi flat vector illustration, soft pastel color palette (cream, pale pink, lilac), transparent background, front-facing, designed to be layered together into a complete cat";

const PROMPTS: Record<Part, string> = {
  body: `${STYLE} — cat torso and limbs only, chubby sitting pose, round head with small ears, NO tail NO eyes NO nose NO mouth NO whiskers NO facial features of any kind, cream-colored fur, rosy cheek circles only, blank plain face ready for overlays, tail area is completely absent — the tail is a separate layer`,
  eyes: `${STYLE} — a pair of cat eyes only, large round anime-style eyes with sparkly highlights and soft pink-blue iris, sized and centered to fit on a chibi cat face, NO face outline NO body NO nose NO tail, just the two eyes side by side`,
  nose: `${STYLE} — a cat nose and whiskers only, small pink heart-shaped nose with three thin whisker lines on each side, sized to fit below the eyes on a chibi cat face, NO face outline NO body NO eyes NO tail`,
  tail: `${STYLE} — a detached fluffy cat tail only, gently curled with a rounded tip, cream and pale pink coloring matching the body, NO body NO head NO paws, just the isolated tail shape`,
};

async function generatePart(part: Part): Promise<void> {
  const dir = path.join(OUTPUT_DIR, part);
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 1; i <= COUNT; i++) {
    console.log(`  [${part}] generating ${i}/${COUNT}...`);

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt: PROMPTS[part],
      size: "1024x1024",
      quality: "medium",
      background: "transparent",
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error(`No image data returned for ${part} image ${i}`);

    const dest = path.join(dir, `${part}_${i}.png`);
    fs.writeFileSync(dest, Buffer.from(b64, "base64"));
    console.log(`  Saved: ${dest}`);

    if (i < COUNT) await new Promise((r) => setTimeout(r, 500));
  }
}

async function main(): Promise<void> {
  console.log("Generating kawaii cat parts (20 images)...\n");
  for (const part of PARTS) {
    console.log(`\n--- ${part.toUpperCase()} ---`);
    await generatePart(part);
  }
  console.log("\nDone! Images saved to cat-parts/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
