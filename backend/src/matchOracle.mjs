import { chat } from "./llm.mjs";

// Real match-result oracle. Source: TheSportsDB (free). Swap via MATCH_ORACLE_BASE.
const TSDB = process.env.MATCH_ORACLE_BASE || "https://www.thesportsdb.com/api/v1/json/3";

async function tsdb(path) {
  try {
    const r = await fetch(TSDB + path);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Extract the two teams from a free-text match label via the LLM. */
async function extractTeams(matchId) {
  try {
    const out = await chat(
      [
        {
          role: "system",
          content:
            'Extract the two football teams from a match label. Reply ONLY as "HomeTeam|AwayTeam" using full English country/club names (e.g. "Brazil|Morocco"). No other text.',
        },
        { role: "user", content: matchId },
      ],
      { temperature: 0 },
    );
    const parts = out.replace(/[\n`]/g, "").split("|");
    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
      return { home: parts[0].trim(), away: parts[1].trim() };
    }
  } catch {
    /* ignore */
  }
  return { home: null, away: null };
}

async function teamId(name) {
  const d = await tsdb("/searchteams.php?t=" + encodeURIComponent(name));
  return d?.teams?.[0]?.idTeam ?? null;
}

const norm = (s) => (s || "").toLowerCase();
const finished = (e) =>
  e && e.intHomeScore != null && e.intAwayScore != null && e.intHomeScore !== "" && e.intAwayScore !== "";

/**
 * Fetch the REAL result for a match label. Returns null if the teams can't be
 * resolved or the match hasn't been played/finished yet (→ caller keeps it Pending).
 */
export async function fetchResult(matchId) {
  const { home, away } = await extractTeams(matchId);
  if (!home || !away) return null;

  const id = await teamId(home);
  if (!id) return null;

  // last finished events for the home team, find the one against `away`
  const d = await tsdb("/eventslast.php?id=" + id);
  const events = d?.results || [];
  const ev = events.find(
    (e) => norm(e.strHomeTeam).includes(norm(away)) || norm(e.strAwayTeam).includes(norm(away)),
  );
  if (!ev || !finished(ev)) return null;

  return {
    home: ev.strHomeTeam,
    away: ev.strAwayTeam,
    homeScore: Number(ev.intHomeScore),
    awayScore: Number(ev.intAwayScore),
    date: ev.dateEvent,
    event: ev.strEvent,
    source: "thesportsdb",
  };
}

/** Judge a prediction against the real result. Returns "correct" | "wrong". */
export async function judgeVerdict(predictionText, result) {
  const real = `${result.home} ${result.homeScore}-${result.awayScore} ${result.away} (${result.date}).`;
  const out = await chat(
    [
      {
        role: "system",
        content:
          "You are a strict football match judge. Given a user PREDICTION and the REAL RESULT, reply with exactly one word: CORRECT or WRONG. CORRECT only if the prediction's main claim (the winner, and the scoreline/scorer if explicitly stated) matches the real result. Otherwise WRONG.",
      },
      { role: "user", content: `PREDICTION: ${predictionText}\nREAL RESULT: ${real}` },
    ],
    { temperature: 0 },
  );
  return /correct/i.test(out) ? "correct" : "wrong";
}
