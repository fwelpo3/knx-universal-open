import type { DptIssue, DptReceiveDisposition } from './types.ts';

export function normalizeDisposition(value?: string): DptReceiveDisposition | undefined {
  return value === 'ignore-message' || value === 'accept-without-action' ? value : undefined;
}

export function strongerDisposition(
  left?: DptReceiveDisposition,
  right?: DptReceiveDisposition,
): DptReceiveDisposition | undefined {
  if (left === 'ignore-message' || right === 'ignore-message') return 'ignore-message';
  return left || right;
}

export function resultDisposition(issues: readonly DptIssue[]): DptReceiveDisposition | undefined {
  let out: DptReceiveDisposition | undefined;
  for (const issue of issues) out = strongerDisposition(out, issue.disposition || normalizeDisposition(issue.code));
  return out;
}
