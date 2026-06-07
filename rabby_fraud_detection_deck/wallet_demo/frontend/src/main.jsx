import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserProvider } from "ethers";
import "./styles.css";

const blacklistedAddresses = new Set([
  "0x000000000000000000000000000000000000dead",
  "0xbad0000000000000000000000000000000000000",
  "0x1111111111111111111111111111111111111111",
]);

const initialTransaction = {
  receiver: "0x000000000000000000000000000000000000dEaD",
  amount: 12.5,
  token: "AIRDROP",
  contractStatus: "reported",
  actionType: "approve",
  walletAge: "new",
  txFrequency: "burst",
  unlimitedApproval: true,
};

function analyzeTransaction(tx) {
  let score = 0;
  const alerts = [];
  const receiver = tx.receiver.trim().toLowerCase();

  if (blacklistedAddresses.has(receiver)) {
    score += 50;
    alerts.push("Blacklisted destination address detected.");
  }
  if (Number(tx.amount) >= 10) {
    score += 20;
    alerts.push("High-value transaction.");
  }
  if (!["ETH", "USDC"].includes(tx.token)) {
    score += tx.token === "AIRDROP" ? 18 : 12;
    alerts.push("Unknown or suspicious token.");
  }
  if (tx.contractStatus === "reported") {
    score += 35;
    alerts.push("Contract has previous malicious reports.");
  } else if (tx.contractStatus === "unverified") {
    score += 22;
    alerts.push("Unverified smart contract.");
  } else if (tx.contractStatus === "new") {
    score += 20;
    alerts.push("Newly deployed smart contract.");
  }
  if (tx.actionType === "approve") {
    score += 12;
    alerts.push("Token approval request.");
  }
  if (tx.unlimitedApproval) {
    score += 25;
    alerts.push("Unlimited token allowance requested.");
  }
  if (tx.walletAge === "new") {
    score += 15;
    alerts.push("New wallet with limited reputation.");
  }
  if (tx.txFrequency === "burst") {
    score += 14;
    alerts.push("Sudden burst of transaction activity.");
  }

  const riskScore = Math.min(score, 100);
  const fraudProbability = Math.min(99, Math.round(riskScore * 0.72 + (tx.walletAge === "new" ? 10 : 0)));
  const riskLevel = riskScore > 70 ? "High Risk" : riskScore > 30 ? "Medium Risk" : "Safe";

  return {
    riskScore,
    fraudProbability,
    riskLevel,
    alerts: alerts.length ? alerts : ["No suspicious rule triggered."],
  };
}

function App() {
  const [wallet, setWallet] = useState("Not connected");
  const [transaction, setTransaction] = useState(initialTransaction);
  const [history, setHistory] = useState([]);
  const result = useMemo(() => analyzeTransaction(transaction), [transaction]);

  async function connectWallet() {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWallet(accounts[0]);
      return;
    }
    setWallet("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
  }

  function updateField(field, value) {
    setTransaction((current) => ({ ...current, [field]: value }));
  }

  function saveAnalysis() {
    setHistory((current) => [
      {
        ...transaction,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        fraudProbability: result.fraudProbability,
        time: new Date().toLocaleTimeString(),
      },
      ...current,
    ]);
  }

  return (
    <main className="react-app">
      <header>
        <p>AI-powered Rabby-inspired transaction analyzer</p>
        <h1>ChainShield Fraud Detection</h1>
        <button onClick={connectWallet}>Connect MetaMask</button>
      </header>

      <section className="cards">
        <article><span>Wallet</span><strong>{wallet}</strong></article>
        <article><span>Risk Score</span><strong>{result.riskScore}</strong></article>
        <article><span>Fraud Probability</span><strong>{result.fraudProbability}%</strong></article>
        <article><span>Risk Level</span><strong>{result.riskLevel}</strong></article>
      </section>

      <section className="grid">
        <form onSubmit={(event) => { event.preventDefault(); saveAnalysis(); }}>
          <label>Receiver<input value={transaction.receiver} onChange={(event) => updateField("receiver", event.target.value)} /></label>
          <label>Amount<input type="number" value={transaction.amount} onChange={(event) => updateField("amount", event.target.value)} /></label>
          <label>Token<select value={transaction.token} onChange={(event) => updateField("token", event.target.value)}><option>ETH</option><option>USDC</option><option>FAKE</option><option>AIRDROP</option></select></label>
          <label>Contract<select value={transaction.contractStatus} onChange={(event) => updateField("contractStatus", event.target.value)}><option value="verified">Verified</option><option value="unverified">Unverified</option><option value="new">New</option><option value="reported">Reported</option></select></label>
          <label>Action<select value={transaction.actionType} onChange={(event) => updateField("actionType", event.target.value)}><option value="transfer">Transfer</option><option value="approve">Approval</option><option value="swap">Swap</option></select></label>
          <label>Wallet Age<select value={transaction.walletAge} onChange={(event) => updateField("walletAge", event.target.value)}><option value="old">Older than 1 year</option><option value="medium">3-12 months</option><option value="new">Less than 30 days</option></select></label>
          <label><input type="checkbox" checked={transaction.unlimitedApproval} onChange={(event) => updateField("unlimitedApproval", event.target.checked)} /> Unlimited approval</label>
          <button type="submit">Analyze Transaction</button>
        </form>

        <section>
          <h2>Fraud Alerts</h2>
          {result.alerts.map((alert) => <p key={alert}>{alert}</p>)}
          <h2>Transaction Simulation</h2>
          <p>{result.riskScore > 70 ? "Simulation warns about asset-draining or suspicious approval behavior." : "Simulation found no critical fund-draining signal."}</p>
        </section>
      </section>

      <section>
        <h2>History</h2>
        {history.map((item) => <p key={`${item.time}-${item.receiver}`}>{item.time}: {item.riskLevel} ({item.riskScore})</p>)}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
