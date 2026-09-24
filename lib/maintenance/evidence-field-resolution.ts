// Deterministic evidence-field resolution for asset views.
// Picks the first usable candidate and carries its provenance.
// Never invents values, sources or timestamps: empty candidates are skipped
// and every returned field comes from an explicit caller-supplied candidate.

export type EvidenceFieldCandidate = {
  value: string | null | undefined;
  source: string;
  at?: string | null;
};

export function resolveEvidenceField(candidates: EvidenceFieldCandidate[]) {
  for (const candidate of candidates) {
    if (candidate.value) {
      return { value: candidate.value, source: candidate.source, at: candidate.at ?? null };
    }
  }
  return { value: null, source: null, at: null };
}
