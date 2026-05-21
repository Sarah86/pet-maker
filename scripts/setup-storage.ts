#!/usr/bin/env bun
/**
 * Creates the "designs" private Storage bucket in Supabase.
 * Run once: bun scripts/setup-storage.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env vars. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.storage.createBucket("designs", {
  public: false,
  fileSizeLimit: 52_428_800, // 50 MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
});

if (error) {
  if (error.message.includes("already exists")) {
    console.log("✓ Bucket 'designs' already exists");
  } else {
    console.error("✗ Failed to create bucket:", error.message);
    process.exit(1);
  }
} else {
  console.log("✓ Bucket 'designs' created:", data.name);
}
