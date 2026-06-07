export function getThreatFeed() {
  return [
    { severity: "High", type: "Wallet drainer", detail: "Known drainer signature targeting token approvals." },
    { severity: "Medium", type: "Phishing domain", detail: "Typosquatting pattern detected in dApp URL." },
    { severity: "High", type: "Scam token", detail: "AIRDROP token flagged by local intelligence rules." },
    { severity: "Watch", type: "Fake NFT project", detail: "New mint page has low community trust score." },
  ];
}
