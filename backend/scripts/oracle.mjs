/**
 * Oracle CLI (OracleCap holder = signalvault). Records official results + resolves predictions.
 *
 *   npm run oracle -- record   <matchId> "<result text>"
 *   npm run oracle -- resolve  <profileId> <receiptId> <matchResultId> <correct|wrong>
 *   npm run oracle -- settle   <profileId> <receiptId> <matchId> <correct|wrong> "<result text>"
 *   npm run oracle -- auto     <profileId> <receiptId> <ownerAddress>   # real result from match oracle
 *   npm run oracle -- auto-all <profileId> <ownerAddress>              # resolve all PENDING from real data
 *   npm run oracle -- pending  [ownerAddress]                          # list pending receipts
 */
import { recordResult, resolvePrediction, settle, autoResolve, listPendingReceipts } from "../src/oracle.mjs";

const [cmd, ...a] = process.argv.slice(2);
const out = (o) => console.log(JSON.stringify(o, null, 2));

try {
  if (cmd === "pending") {
    out(await listPendingReceipts(a[0]));
  } else if (cmd === "auto") {
    const [profileId, receiptId, ownerAddress] = a;
    if (!profileId || !receiptId) throw new Error("usage: auto <profileId> <receiptId> <ownerAddress>");
    out(await autoResolve(profileId, receiptId, ownerAddress));
  } else if (cmd === "auto-all") {
    const [profileId, ownerAddress] = a;
    if (!profileId || !ownerAddress) throw new Error("usage: auto-all <profileId> <ownerAddress>");
    const pending = await listPendingReceipts(ownerAddress);
    console.log(`${pending.length} pending receipt(s) — resolving from real match data…`);
    for (const r of pending) {
      const res = await autoResolve(profileId, r.receiptId, ownerAddress);
      console.log(`  ${r.matchId}: ${res.status}${res.verdict ? " → " + res.verdict + " (real " + res.realResult + ")" : res.reason ? " (" + res.reason + ")" : ""}`);
    }
  } else if (cmd === "record") {
    const [matchId, ...rest] = a;
    if (!matchId) throw new Error("usage: record <matchId> <result text>");
    out(await recordResult(matchId, rest.join(" ") || "official result"));
  } else if (cmd === "resolve") {
    const [profileId, receiptId, matchResultId, verdict] = a;
    if (!profileId || !receiptId || !matchResultId || !verdict) throw new Error("usage: resolve <profileId> <receiptId> <matchResultId> <correct|wrong>");
    out(await resolvePrediction(profileId, receiptId, matchResultId, verdict));
  } else if (cmd === "settle") {
    const [profileId, receiptId, matchId, verdict, ...rest] = a;
    if (!profileId || !receiptId || !matchId || !verdict) throw new Error("usage: settle <profileId> <receiptId> <matchId> <correct|wrong> <result text>");
    out(await settle(profileId, receiptId, matchId, verdict, rest.join(" ") || "official result"));
  } else {
    console.log("commands: record | resolve | settle  (see file header)");
    process.exit(1);
  }
} catch (e) {
  console.error("✗", e?.message || e);
  process.exit(1);
}
