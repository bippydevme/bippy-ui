export interface FlipDecisionInput {
  progress: number;
  velocity: number;
}

export type FlipDecision = "commit" | "cancel";

export function decideFlip({
  progress,
  velocity,
}: FlipDecisionInput): FlipDecision {
  return progress >= 0.5 || velocity >= 0.65 ? "commit" : "cancel";
}
