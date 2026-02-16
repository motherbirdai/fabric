/**
 * Apply time-decay to a feedback score.
 *
 * - < 90 days: full weight (1.0×)
 * - 90–180 days: half weight (0.5×)
 * - > 180 days: 20% weight (0.2×)
 */
export function applyDecay(score: number, createdAt: Date): number {
  const ageDays = (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000);

  if (ageDays <= 90) return score;
  if (ageDays <= 180) return score * 0.5;
  return score * 0.2;
}

/**
 * Compute weighted average of feedback scores with time-decay.
 */
export function decayedFeedbackAvg(
  feedback: Array<{ score: number; createdAt: Date }>
): number {
  if (feedback.length === 0) return 0;

  let totalWeight = 0;
  let totalScore = 0;

  for (const f of feedback) {
    const ageDays = (Date.now() - f.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    let weight = 1;
    if (ageDays > 180) weight = 0.2;
    else if (ageDays > 90) weight = 0.5;

    totalScore += f.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}
