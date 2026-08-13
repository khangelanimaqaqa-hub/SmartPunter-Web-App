import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_KEY = Deno.env.get("API_FOOTBALL_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const API_BASE = "https://v3.football.api-sports.io";

const TARGET_LEAGUE_IDS = new Set([39, 140, 135, 78, 61, 160]);
const LEAGUE_NAMES: Record<number, { name: string; country: string }> = {
  39: { name: "Premier League", country: "England" },
  140: { name: "La Liga", country: "Spain" },
  135: { name: "Serie A", country: "Italy" },
  78: { name: "Bundesliga", country: "Germany" },
  61: { name: "Ligue 1", country: "France" },
  160: { name: "Premier Soccer League", country: "South Africa" },
};

const LOOKAHEAD_DAYS = 3;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: logRow } = await supabase
    .from("sync_logs")
    .insert({ status: "running" })
    .select("id")
    .single();

  const logId = logRow?.id;
  const finishLog = async (status: string, counts: Record<string, number>, errorMsg: string | null) => {
    if (!logId) return;
    await supabase.from("sync_logs").update({
      status,
      fixtures_fetched: counts.fixtures_fetched ?? 0,
      fixtures_upserted: counts.fixtures_upserted ?? 0,
      scores_updated: counts.scores_updated ?? 0,
      error: errorMsg,
      finished_at: new Date().toISOString(),
    }).eq("id", logId);
  };

  try {
    if (!API_KEY) throw new Error("API_FOOTBALL_KEY secret is not set");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Supabase env vars not configured");

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const today = new Date();
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + LOOKAHEAD_DAYS - 1);

    const fromStr = formatDate(today);
    const toStr = formatDate(toDate);

    // Free plan restricts seasons to 2022-2024 and requires league/team for from+to.
    // Use single-date calls (no season needed) for each day in the window, then filter to target leagues.
    const days: string[] = [];
    for (let d = new Date(today); d <= toDate; d.setDate(d.getDate() + 1)) {
      days.push(formatDate(d));
    }

    let apiCalls = 0;
    let allFixtures: any[] = [];

    for (const day of days) {
      const url = `${API_BASE}/fixtures?date=${day}`;
      apiCalls++;

      const apiRes = await fetch(url, {
        headers: {
          "x-apisports-key": API_KEY,
          "x-rapidapi-host": "v3.football.api-sports.io",
        },
      });

      if (!apiRes.ok) {
        const body = await apiRes.text();
        throw new Error(`API-Football returned ${apiRes.status} for date ${day}: ${body.slice(0, 500)}`);
      }

      const apiData = await apiRes.json();

      if (apiData?.errors && Object.keys(apiData.errors).length > 0) {
        const errStr = JSON.stringify(apiData.errors);
        throw new Error(`API-Football error for date ${day}: ${errStr}`);
      }

      allFixtures = allFixtures.concat(apiData?.response ?? []);
    }

    // Filter to only our 6 target leagues
    const fixtures = allFixtures.filter((f) => TARGET_LEAGUE_IDS.has(f.league?.id));

    let totalScoresUpdated = 0;
    const perLeague: Record<string, number> = {};

    const rows = fixtures.map((f) => {
      const fixtureId = f.fixture?.id;
      const kickoff = f.fixture?.date;
      const leagueId = f.league?.id;
      const leagueInfo = LEAGUE_NAMES[leagueId] ?? { name: f.league?.name ?? "Unknown", country: f.league?.country ?? "Unknown" };
      const homeTeam = f.teams?.home?.name ?? "Unknown";
      const awayTeam = f.teams?.away?.name ?? "Unknown";
      const status = f.fixture?.status;
      const statusShort = status?.short ?? "NS";
      const homeScore = f.goals?.home ?? null;
      const awayScore = f.goals?.away ?? null;
      const minute = status?.elapsed ?? null;

      perLeague[leagueInfo.name] = (perLeague[leagueInfo.name] ?? 0) + 1;

      let phase = "upcoming";
      const liveStatuses = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];
      const finishedStatuses = ["FT", "AET", "PEN", "AWD", "WO"];
      if (liveStatuses.includes(statusShort)) phase = "live";
      else if (finishedStatuses.includes(statusShort)) phase = "finished";

      const kickoffDate = new Date(kickoff);
      const hasStarted = kickoffDate.getTime() <= Date.now();
      if (phase === "upcoming" && hasStarted && statusShort === "NS") {
        phase = "live";
      }

      if (phase === "finished" && homeScore !== null && awayScore !== null) {
        totalScoresUpdated++;
      }

      const matchDate = kickoff.split("T")[0];
      const finalScore = homeScore !== null && awayScore !== null ? `${homeScore} - ${awayScore}` : null;

      return {
        fixture_id: fixtureId,
        match_date: matchDate,
        kickoff_time: kickoff,
        league: leagueInfo.name,
        country: leagueInfo.country,
        home_team: homeTeam,
        away_team: awayTeam,
        market: "Match Result",
        prediction: homeScore !== null && awayScore !== null
          ? (homeScore > awayScore ? `${homeTeam} Win` : awayScore > homeScore ? `${awayTeam} Win` : "Draw")
          : "Pending",
        odds: 1.0,
        confidence: "Medium",
        analysis: "",
        access_level: "free",
        status: "published",
        result: "pending",
        final_score: finalScore,
        home_score: homeScore,
        away_score: awayScore,
        minute: phase === "live" ? minute : null,
        phase,
        published_at: new Date().toISOString(),
      };
    });

    // Upsert in batches of 50
    let totalUpserted = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { data: upsertData, error: upsertError } = await supabase
        .from("tips")
        .upsert(batch, { onConflict: "fixture_id", ignoreDuplicates: false })
        .select("id");

      if (upsertError) {
        console.error("Upsert error:", upsertError.message);
      } else {
        totalUpserted += upsertData?.length ?? 0;
      }
    }

    await finishLog("success", {
      fixtures_fetched: fixtures.length,
      fixtures_upserted: totalUpserted,
      scores_updated: totalScoresUpdated,
    }, null);

    return new Response(
      JSON.stringify({
        success: true,
        fixtures_fetched: fixtures.length,
        fixtures_upserted: totalUpserted,
        scores_updated: totalScoresUpdated,
        api_calls: apiCalls,
        date_range: `${fromStr} to ${toStr}`,
        per_league: perLeague,
        total_in_range: allFixtures.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishLog("failed", { fixtures_fetched: 0, fixtures_upserted: 0, scores_updated: 0 }, message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
