const blacklistedAddresses = new Set([
  "0x000000000000000000000000000000000000dead",
  "0xbad0000000000000000000000000000000000000",
  "0x1111111111111111111111111111111111111111",
]);

export function scoreTransaction(payload) {
  let score = 0;
  const alerts = [];
  const amount = Number(payload.amount || 0);
  const receiver = String(payload.receiver || "").toLowerCase();

  function add(points, severity, title, detail) {
    score += points;
    alerts.push({ severity, title, detail });
  }

  if (blacklistedAddresses.has(receiver)) add(55, "critical", "Blacklisted destination", "Receiver is linked to known scam activity.");
  if (amount >= 10) add(22, "high", "Behavior anomaly", "Transaction exceeds normal average size.");
  if (payload.unlimitedApproval) add(28, "high", "Unlimited token access", "Infinite allowance detected.");
  if (payload.contractStatus === "reported") add(35, "critical", "Reported contract", "Contract has previous malicious reports.");
  if (payload.txFrequency === "burst") add(16, "medium", "Frequency anomaly", "Sudden transaction burst detected.");
  if (payload.gasAnomaly) add(12, "medium", "Gas anomaly", "Gas estimate is outside normal behavior.");

  const riskScore = Math.min(score, 100);
  const level = riskScore > 80 ? "Critical" : riskScore > 60 ? "High" : riskScore > 30 ? "Medium" : "Safe";
  return {
    riskScore,
    level,
    fraudProbability: riskScore,
    alerts: alerts.length ? alerts : [{ severity: "safe", title: "No suspicious activity", detail: "Transaction passed current rules." }],
  };
}
