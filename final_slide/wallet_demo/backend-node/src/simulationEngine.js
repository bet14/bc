export function simulateTransaction(payload, risk) {
  const currentBalance = Number(payload.currentBalance || 10);
  const amount = Number(payload.amount || 0);
  const gasFee = Number((0.0015 + amount * 0.00012).toFixed(4));
  const afterBalance = Math.max(0, currentBalance - amount - gasFee);

  return {
    currentBalance: `${currentBalance.toFixed(2)} ETH`,
    afterTransaction: `${afterBalance.toFixed(2)} ETH`,
    assetsLost: `${Math.min(currentBalance, amount + gasFee).toFixed(4)} ETH`,
    tokenTransfers: payload.token || "ETH",
    nftTransfers: payload.token === "AIRDROP" ? "Suspicious NFT claim possible" : "None detected",
    contractInteractions: payload.contractStatus || "verified",
    ownershipChanges: payload.unlimitedApproval ? "Spending rights changed" : "None",
    hiddenApprovals: payload.unlimitedApproval ? "Unlimited token access detected" : "None",
    risk: risk.level,
  };
}
