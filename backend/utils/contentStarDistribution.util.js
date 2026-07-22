/**
 * Distributes integer stars across repeated sessions (readings / watches).
 * Remainder stars are added to the final session so the sum equals totalStars.
 *
 * Example: 50 stars / 5 sessions => [10, 10, 10, 10, 10]
 * Example: 53 stars / 5 sessions => [10, 10, 10, 10, 13]
 */

function getStarsForSession(sessionNumber, totalStars, requiredSessions) {
  const total = Math.max(0, Math.floor(Number(totalStars) || 0));
  const required = Math.max(1, Math.floor(Number(requiredSessions) || 1));
  const session = Math.floor(Number(sessionNumber) || 0);

  if (session < 1 || session > required || total === 0) {
    return 0;
  }

  const base = Math.floor(total / required);
  const remainder = total - base * required;

  if (session === required) {
    return base + remainder;
  }

  return base;
}

function getDistributionPlan(totalStars, requiredSessions) {
  const required = Math.max(1, Math.floor(Number(requiredSessions) || 1));
  const plan = [];

  for (let session = 1; session <= required; session += 1) {
    plan.push(getStarsForSession(session, totalStars, required));
  }

  return plan;
}

function getTotalStarsForSessions(totalStars, requiredSessions) {
  return getDistributionPlan(totalStars, requiredSessions).reduce((sum, value) => sum + value, 0);
}

module.exports = {
  getStarsForSession,
  getDistributionPlan,
  getTotalStarsForSessions,
};
