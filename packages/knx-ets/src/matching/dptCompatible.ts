import { canonicalDptId, dptObjectSize, dptSupport, getDptDefinition } from '../../../knx-core/src/index.ts';

export interface DptObjectLike { DatapointType?: string; }
export interface DptCandidateLike { dpt: string; }

export type ResolvedEtsDpt = {
  raw: string;
  ids: string[];
  primary?: string;
  name?: string;
  objectSize?: string;
  support?: ReturnType<typeof dptSupport>;
};

/**
 * ETS DPT compatibility accepts exact subtypes, lists and main-type wildcards.
 * Unknown/missing DPTs remain compatible so missing metadata is not turned into
 * false certainty.
 */
export function dptCompatible(object: DptObjectLike, candidate: DptCandidateLike): boolean {
  const objectTokens = parseTokens(object.DatapointType);
  const candidateTokens = parseTokens(candidate.dpt);
  if (!objectTokens.length || !candidateTokens.length) return true;
  return candidateTokens.some((candidateToken) =>
    objectTokens.some((objectToken) => matches(objectToken, candidateToken)));
}

/** Resolve one or more ETS DPT tokens against the canonical DPT catalog. */
export function resolveEtsDpt(value?: string): ResolvedEtsDpt {
  const raw = String(value || '').trim();
  const ids = parseTokens(raw)
    .filter((token) => token.sub != null)
    .map((token) => canonicalDptId(`${token.main}.${token.sub}`));
  const primary = ids.find((id) => Boolean(getDptDefinition(id))) || ids[0];
  const definition = primary ? getDptDefinition(primary) : undefined;
  return {
    raw,
    ids,
    primary,
    name: definition?.name,
    objectSize: primary ? dptObjectSize(primary) : undefined,
    support: primary ? dptSupport(primary) : undefined,
  };
}

type Token = { main: number; sub?: number };

function parseTokens(value?: string): Token[] {
  const raw = String(value || '').toUpperCase();
  const out: Token[] = [];
  const seen = new Set<string>();
  const re = /(?:DPST-|DPT-)?(\d+)(?:[.\-](\d+))?/g;
  for (const match of raw.matchAll(re)) {
    const token = { main: Number(match[1]), sub: match[2] == null ? undefined : Number(match[2]) };
    const key = `${token.main}.${token.sub ?? '*'}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(token);
    }
  }
  return out;
}

function matches(a: Token, b: Token): boolean {
  if (a.main !== b.main) return false;
  return a.sub == null || b.sub == null || a.sub === b.sub;
}
