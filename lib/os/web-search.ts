import "server-only";

export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResult {
  ok: boolean;
  query: string;
  provider: string;
  hits: WebSearchHit[];
  summary?: string;
  error?: string;
}

async function searchTavily(query: string): Promise<WebSearchResult | null> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!res.ok) {
    return {
      ok: false,
      query,
      provider: "tavily",
      hits: [],
      error: `Tavily HTTP ${res.status}`,
    };
  }

  const body = (await res.json()) as {
    answer?: string;
    results?: { title?: string; url?: string; content?: string }[];
  };

  const hits: WebSearchHit[] = (body.results ?? []).map((r) => ({
    title: String(r.title ?? ""),
    url: String(r.url ?? ""),
    snippet: String(r.content ?? "").slice(0, 400),
  }));

  return {
    ok: true,
    query,
    provider: "tavily",
    hits,
    summary: body.answer,
  };
}

async function searchSerper(query: string): Promise<WebSearchResult | null> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": key,
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!res.ok) {
    return {
      ok: false,
      query,
      provider: "serper",
      hits: [],
      error: `Serper HTTP ${res.status}`,
    };
  }

  const body = (await res.json()) as {
    organic?: { title?: string; link?: string; snippet?: string }[];
    answerBox?: { answer?: string; snippet?: string };
  };

  const hits: WebSearchHit[] = (body.organic ?? []).map((r) => ({
    title: String(r.title ?? ""),
    url: String(r.link ?? ""),
    snippet: String(r.snippet ?? "").slice(0, 400),
  }));

  const summary =
    body.answerBox?.answer ?? body.answerBox?.snippet ?? undefined;

  return {
    ok: hits.length > 0 || Boolean(summary),
    query,
    provider: "serper",
    hits,
    summary,
  };
}

/** DuckDuckGo HTML lite — no API key required. */
async function searchDuckDuckGo(query: string): Promise<WebSearchResult> {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "DevFactory-AgentOS/1.0",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(12_000),
    }
  );

  if (!res.ok) {
    return {
      ok: false,
      query,
      provider: "duckduckgo",
      hits: [],
      error: `DuckDuckGo HTTP ${res.status}`,
    };
  }

  const html = await res.text();
  const hits: WebSearchHit[] = [];
  const linkRe =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  const snippetRe =
    /<a[^>]+class="result__snippet"[^>]*>([^<]*)<\/a>/gi;

  const links = [...html.matchAll(linkRe)];
  const snippets = [...html.matchAll(snippetRe)];

  for (let i = 0; i < Math.min(links.length, 5); i++) {
    const [, rawUrl, title] = links[i];
    let url = rawUrl;
    if (url.startsWith("//")) url = `https:${url}`;
    hits.push({
      title: title.replace(/<[^>]+>/g, "").trim(),
      url,
      snippet: (snippets[i]?.[1] ?? "")
        .replace(/<[^>]+>/g, "")
        .trim()
        .slice(0, 400),
    });
  }

  return {
    ok: hits.length > 0,
    query,
    provider: "duckduckgo",
    hits,
    error: hits.length === 0 ? "No results parsed from DuckDuckGo" : undefined,
  };
}

export function formatSearchForMemory(result: WebSearchResult): string {
  const lines: string[] = [`[web-search] query="${result.query}" provider=${result.provider}`];
  if (result.summary) lines.push(`[summary] ${result.summary}`);
  result.hits.forEach((h, i) => {
    lines.push(
      `[${i + 1}] ${h.title}\n${h.url}\n${h.snippet.slice(0, 300)}`
    );
  });
  if (result.error) lines.push(`[error] ${result.error}`);
  return lines.join("\n\n");
}

/** Tavily → Serper → DuckDuckGo fallback chain. */
export async function runWebSearch(query: string): Promise<WebSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      ok: false,
      query: "",
      provider: "none",
      hits: [],
      error: "empty query",
    };
  }

  const tavily = await searchTavily(trimmed);
  if (tavily?.ok && (tavily.hits.length > 0 || tavily.summary)) return tavily;

  const serper = await searchSerper(trimmed);
  if (serper?.ok && (serper.hits.length > 0 || serper.summary)) return serper;

  const ddg = await searchDuckDuckGo(trimmed);
  if (ddg.ok) return ddg;

  return (
    tavily ??
    serper ?? {
      ok: false,
      query: trimmed,
      provider: "duckduckgo",
      hits: [],
      error: ddg.error ?? "search failed",
    }
  );
}
