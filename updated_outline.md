# Rabby Wallet Fraud Detection Features — Outline
*Last updated: 6 June 2026*

---

## 1. Rabby & Fraud Detection Overview
- What Rabby is: multi-chain EVM wallet, open-source, built by DeBank
- The problem space: Web3 fraud landscape — phishing, drainer contracts, approval exploits, address poisoning
- Design philosophy: "security by default" — block first, ask later
- Differentiation vs. MetaMask: client-side rule engine, transaction simulation before signing
- Stats (if available): number of active rules, number of supported chains

---

## 2. Architecture: 5 Layers of Protection

### Layer 1 — Backend Intelligence (`api.rabby.io`)
- `parseTx`: decode raw calldata → human-readable action
- `preExecTx`: simulate transaction against on-chain state (balance change, token approval, NFT transfer)
- `addrDesc`: query address metadata — contract or EOA, verified, labeled, age
- Data sources feeding Layer 1: **GoPlus Security API**, DeBank internal database, community-reported addresses
- Output: structured `TxContext` object passed down to Layer 2

### Layer 2 — Action Analysis (`@rabby-wallet/rabby-action`)
- `parseAction(tx, context)`: classify tx type — Swap / Approve / Transfer / ContractCall / SignTypedData...
- `fetchActionRequiredData`: pull additional on-chain data needed for rule evaluation (e.g., token price, contract deploy date, approval history)
- `formatContext`: normalize everything into a flat `ActionContext` consumed by Layer 3
- Handles both on-chain transactions AND off-chain signatures (EIP-712, personal_sign)

### Layer 3 — Rule Engine (`@rabby-wallet/rabby-security-engine`)
- → see Section 3

### Layer 4 — Local User Data
- `originBlacklist`: domains the user has manually blocked
- `contractBlacklist`: contracts the user flagged as malicious
- `addressBlacklist`: addresses the user blacklisted (e.g., after a poisoning attempt)
- `whitelistedAddresses`: trusted addresses → skip certain warnings
- Stored locally in extension storage, never sent to the server
- User-level overrides can downgrade DANGER → accepted (with confirmation)

### Layer 5 — UI Layer
- `SecurityListItem`: renders each rule result as a colored badge (red/orange/yellow/green)
- `RuleDrawer`: expandable panel showing rule ID, description, "why this is risky", option to whitelist
- Sign button: **disabled** if any result = FORBIDDEN; shows a warning modal if DANGER
- `ProcessedRules` summary: counts by severity shown at the top of the signing screen

---

## 3. Rules Engine (Deep Dive)

### Architecture
- Standalone npm package `@rabby-wallet/rabby-security-engine`
- `Engine` class: takes `rules[]` + `context` → emits `Result[]`
- Each rule: `{ id, type, level, condition(context) → bool, message }`
- `Engine.run()` flow: load context → evaluate each rule condition → collect hits → return sorted Results

### Rule Categories (by ID prefix)
- `1000–1099`: Address-level risks (new address, EOA approval, blacklisted)
- `1100–1199`: Contract risks (unverified, very new, flagged)
- `2000–2099`: Approval-specific rules (unlimited approval, approve to EOA)
- `3000–3099`: Signature risks (blind sign, Permit2, dangerous domain)
- `4000–4099`: Transaction simulation results (unexpected balance decrease, NFT loss)

### Severity Levels
- `FORBIDDEN`: transaction blocked, cannot proceed — e.g., known scam address
- `DANGER`: strong warning, user must actively confirm — e.g., approve to EOA
- `WARNING`: yellow flag, informational — e.g., new contract
- `SAFE`: explicitly passed a rule — builds user confidence

### Rule Customization
- Per-rule user settings: `enable/disable`, `level override` (e.g., downgrade WARNING → ignored)
- Custom rules possible via config injection

---

## 4. Core Features

### a. Transaction Simulation
- Powered by: Layer 1 `preExecTx` + Layer 3 rules (40xx)
- Shows the exact balance diff before signing: "+0.5 ETH", "−1000 USDC", "NFT #1234 leaving wallet"
- Detects: unexpected asset loss, contract reverts, gas anomalies
- How it works: fork current chain state → simulate → diff

### b. Phishing Detection
- Powered by: Layer 4 `originBlacklist` + Layer 1 `addrDesc` (domain reputation)
- Checks dApp origin URL against the GoPlus phishing list and the user's local blacklist
- Blocks the connection entirely if the origin is a known phishing site
- Warns if the domain is newly registered or a lookalike (e.g., uniswap.com vs. unïswap.com)

### c. Approval Alerts
- Powered by: Layer 2 action classification + Rules 2000–2099
- Detects: unlimited approval (max uint256), approval to an EOA (not a contract), approval to an unverified contract
- Shows current approval exposure: total USD value at risk across all approvals
- Integrates with Rabby's "Approvals" management dashboard

### d. Address Poisoning Detection
- Powered by: Layer 1 `addrDesc` + rule `SCAM_ADDRESS`
- Attack pattern: attacker sends a zero-value tx from an address that mimics a frequent contact (matching first/last characters)
- Detection: compare the address against recent tx history, flag visual similarity
- UI: highlights the suspicious address with a warning, displays the full address rather than a truncated form

### e. Signature Parsing (EIP-712 / personal_sign)
- Powered by: Layer 2 `parseAction` for typed data + Rules 3000–3099
- Decodes Permit, Permit2, Seaport orders, Blur listings → presents human-readable intent
- Flags: blind signing (undecodable data), signing on the wrong domain, expired deadlines
- Critical context: most wallet drainers now exploit off-chain signatures rather than on-chain transactions

---

## 5. Wallet Comparison

| Dimension | MetaMask | Rabby | Phantom | Trust Wallet |
|---|---|---|---|---|
| Transaction simulation | Partial (snap) | Native, default ON | Native (Solana) | No |
| Client-side rule engine | No | Yes, inspectable rule IDs | No | No |
| Phishing detection | Basic URL check | GoPlus + local blacklist | Yes | Basic |
| Approval alerts | Extension needed | Built-in dashboard | N/A | No |
| Address poisoning | No | Yes | No | No |
| Signature decoding | Partial | Full EIP-712 + Permit2 | Partial | No |
| Open-source rule logic | No | Yes (npm public) | No | No |

**Takeaway**: Rabby is the only wallet with a client-side rule engine backed by explicit, inspectable rule IDs — users and security researchers can audit exactly what triggers a warning.

---

## 6. Risk Simulator — Backend / Risk-Analyst View

> Reframed from a user-facing demo to a backend trace: for each scenario, show what a risk analyst would inspect — the raw `ActionContext` object fed into the engine, which rule(s) fired and why (condition logic), the `Result[]` output, and how severity resolution determines the final UI state. This is the "open the hood" view rather than the "what the user sees" view.

### Scenario 1 — Approve to EOA
- Input `ActionContext` (analyst view): `{ type: 'Approve', spender: '0xPersonalWallet...', spenderType: 'EOA', amount: MAX_UINT256, token: 'USDT' }`
- Rule evaluated: `2004` — condition checks `spenderType !== 'contract'`
- Engine output: `Result { id: '2004', level: 'DANGER', message: 'Approval target is not a contract' }`
- Analyst note: why this matters — an EOA isn't bound by contract logic and can drain the allowance at any time, at the spender's discretion

### Scenario 2 — New Contract (< 3 days old)
- Input context fields the engine reads: `contractAddress`, `deployTimestamp`, `isVerified`
- Rule evaluated: `1094` — condition computes `now - deployTimestamp < 3 days`
- Engine output: `Result { id: '1094', level: 'WARNING', message: 'Contract age < 3 days' }`
- Analyst note: correlate with on-chain deploy data; most rug pulls cluster within days of contract launch — this rule is a leading indicator, not a verdict

### Scenario 3 — Poisoned Address
- Input context: `{ recipient: '0xAbC...1234', matchesContact: true, similarityScore: 0.94, originTx: 'dust-transfer' }`
- Rule evaluated: `SCAM_ADDRESS` — condition triggers on high similarity score + presence in `addressBlacklist`/poisoning heuristics
- Engine output: `Result { id: 'SCAM_ADDRESS', level: 'FORBIDDEN', message: ... }`
- Analyst note: trace back to the seeding event — attacker pre-positioned a lookalike address via a zero-value dust transaction, banking on copy-paste from tx history

### Scenario 4 — Phishing Site Connect
- Input: origin URL `uniswap-airdrop.xyz` checked at Layer 4 *before* reaching the rule engine
- Lookup path: `originBlacklist` (local) → GoPlus phishing list (remote) → match found
- Output: connection request short-circuited, `FORBIDDEN`, engine never invoked
- Analyst note: this is the one path where the rule engine is bypassed entirely — worth flagging in an architecture review as a separate enforcement point with its own data source and failure modes

### Scenario 5 — Unlimited Approval to Unverified Contract (stacked risk)
- Input context: `{ type: 'Approve', spender: '0xUnknownContract...', spenderType: 'contract', amount: MAX_UINT256, isVerified: false }`
- Rules evaluated: `2001` (condition: `amount === MAX_UINT256`) and `1115` (condition: `isVerified === false`)
- Engine output: two `Result` entries — `{ id: '2001', level: 'DANGER' }` and `{ id: '1115', level: 'WARNING' }`
- Resolution logic: engine sorts by severity, `ProcessedRules` aggregates counts, sign-button state driven by the highest severity present (`DANGER` here)
- Analyst note: this is the clearest case for studying how the engine resolves conflicting/overlapping signals — useful template for designing new composite rules
