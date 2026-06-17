/**
 * One-shot: apply Take Off €350 pricing on the linked Supabase project.
 * Uses proportional scaling when possible; falls back to direct PATCH updates.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or API key in .env");
  process.exit(1);
}

const sb = createClient(url, key);
const TARGET = 350;

async function viaRpc() {
  const { data, error } = await sb.rpc("apply_takeoff_package_350");
  if (error) return { ok: false, error };
  return { ok: true, data };
}

async function viaPatches() {
  const { data: pkg, error: pkgErr } = await sb
    .from("client_packages")
    .select("id, price")
    .eq("category", "Take Off")
    .single();
  if (pkgErr || !pkg) throw pkgErr || new Error("Take Off package not found");

  const { data: comps, error: compErr } = await sb
    .from("client_package_components")
    .select("id, label, quantity, internal_price, is_addon, is_removable, sort_order, service_id")
    .eq("package_id", pkg.id);
  if (compErr) throw compErr;

  const core = (comps || []).filter((c) => !c.is_addon);
  const coreSum = core.reduce((s, c) => s + Number(c.internal_price) * c.quantity, 0);
  if (coreSum <= 0) throw new Error("No core components");

  const serviceIds = [...new Set(core.map((c) => c.service_id).filter(Boolean))];
  const { data: services } = await sb
    .from("client_services")
    .select("id, price")
    .in("id", serviceIds);
  const listPrice = new Map((services || []).map((s) => [s.id, Number(s.price)]));

  let listinoSum = 0;
  for (const c of core) {
    listinoSum += (listPrice.get(c.service_id) || 0) * c.quantity;
  }

  const updates = core.map((c) => {
    const list = listPrice.get(c.service_id) || Number(c.internal_price);
    const weight = listinoSum > 0 ? list * c.quantity : Number(c.internal_price) * c.quantity;
    const scaled =
      listinoSum > 0
        ? Math.round(((list * TARGET) / listinoSum) * 100) / 100
        : Math.round(((Number(c.internal_price) * TARGET) / coreSum) * 100) / 100;
    return { ...c, nextPrice: scaled, weight };
  });

  let runningSum = updates.reduce((s, u) => s + u.nextPrice * u.quantity, 0);
  const anchor = [...updates].sort(
    (a, b) => Number(a.is_removable) - Number(b.is_removable) || a.sort_order - b.sort_order
  )[0];
  const diff = TARGET - runningSum;
  if (Math.abs(diff) >= 0.01 && anchor) {
    anchor.nextPrice = Math.round((anchor.nextPrice + diff / anchor.quantity) * 100) / 100;
  }

  // Update components first (scale from current sum toward target), then package price.
  for (const u of updates) {
    const factor = TARGET / coreSum;
    const price =
      u.id === anchor?.id && Math.abs(diff) >= 0.01
        ? u.nextPrice
        : Math.round(Number(u.internal_price) * factor * 100) / 100;
    const { error } = await sb
      .from("client_package_components")
      .update({ internal_price: price })
      .eq("id", u.id);
    if (error) throw new Error(`component ${u.label}: ${error.message}`);
  }

  const { error: priceErr } = await sb
    .from("client_packages")
    .update({ price: TARGET, updated_at: new Date().toISOString() })
    .eq("id", pkg.id);
  if (priceErr) throw priceErr;

  return { package_id: pkg.id, price: TARGET };
}

async function main() {
  console.log("Applying Take Off package price → €350…");

  const rpc = await viaRpc();
  if (rpc.ok) {
    console.log("Done via RPC:", rpc.data);
    return;
  }

  console.log("RPC not available yet, applying via REST patches…");
  const result = await viaPatches();
  console.log("Done via patches:", result);

  const { data: verify } = await sb
    .from("client_packages")
    .select("price, client_package_components(internal_price, quantity, is_addon, label)")
    .eq("category", "Take Off")
    .single();
  const sum = (verify?.client_package_components || [])
    .filter((c) => !c.is_addon)
    .reduce((s, c) => s + Number(c.internal_price) * c.quantity, 0);
  console.log("Verified package price:", verify?.price, "| component sum:", sum);
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
