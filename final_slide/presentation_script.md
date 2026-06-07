# Rabby Wallet Fraud Detection — Presentation Script

## 1. Overview (~100 words)
Rabby Wallet is an open-source browser extension wallet built around one core idea: blockchain transactions are irreversible, so the wallet must warn users *before* they sign anything dangerous.

`Multi-chain functionality` · `Transaction transparency` · `High level of security` · `Token swapping and gas top-up` · `Compatible with many other wallets and platforms`

This deck walks through how that pre-sign protection actually works under the hood — not just what Rabby shows on screen, but the pipeline of components that produce those warnings: backend intelligence, action analysis, a rule engine with ~89 risk checks, local user overrides, and the UI layer that renders verdicts. We'll also compare Rabby against MetaMask, Trust Wallet, and Phantom, and close with a small proof-of-concept inspired by its architecture.

## 2. How It Works — The 5-Layer Detection Pipeline (~300 words)
This section explains the full request lifecycle: a user triggers a signature request, and it flows through five layers before a verdict reaches the screen.

**Layer 1 — Backend Intelligence** takes raw calldata and a sender address and turns them into something meaningful. Its main components are `parseTx` (decodes hex calldata into a human-readable action like "swap 1 ETH for USDC"), `preExecTx` (simulates the transaction on-chain to show balance changes before signing), and `addrDesc` (fetches metadata about the contract or address — verified status, labels, age, scam flags). It outputs a `TxContext` object bundling the decoded action, simulated state changes, and an address risk profile.

**Layer 2 — Action Analysis** classifies the request and gathers the facts the rules will need. Key components: `parseAction` (matches the request to a template such as tokenApprove, swap, send, or permit), `fetchActionRequiredData` (pulls supporting on-chain facts like token prices, contract deploy date, and approval history), and `formatContext` (packages everything into a typed `ActionContext`).

**Layer 3 — Rule Engine** evaluates risk. It runs 24 action-specific rule modules aggregated into roughly 89 distinct rule IDs (1001–1154), each tagged SAFE, WARNING, DANGER, FORBIDDEN, or ERROR. `engine.run()` executes every rule's `getValue()` in parallel and returns a flat `Result[]` — notably, the engine does not pick an overall "worst" severity; that aggregation happens later in the wallet UI.

**Layer 4 — Local User Data** applies on-device, never-cloud overrides: `originBlacklist`, `contractWhitelist`, and `addressBlacklist`, which can downgrade a verdict (e.g., DANGER → SAFE) after explicit user confirmation.

**Layer 5 — UI Layer** renders the final verdict via components like `SecurityListItem` (colored badges) and `RuleDrawer` (plain-language explanations), giving the user the final decision point.

## 3. Core Features — Rule Engine (Deep Dive) (~300 words)
This section zooms into the standalone Rules Engine package — the scoring layer behind every "this looks risky" prompt — and breaks it into five components handed down a line.

**RuleConfig** is the declarative checklist: about 89 plain checks grouped into 24 files by action type (connecting a site, sending tokens, swapping, approving a spender). Each rule carries an identifier, an on/off switch, a plain-language description, a return-value type, a default threshold the user can override, the transaction contexts it applies to, and an async function that fetches the value to evaluate. Its defining characteristic: it carries no decision logic of its own — it only supplies raw values and thresholds.

**Engine** is a thin orchestration wrapper holding the active checklist plus a reference to Rabby's data service, exposing the methods the wallet's service layer needs.

**`engine.run(context)`** is the execution core: it takes a context object describing the current action (site, address, contract, amount), runs every enabled checker in parallel, catches per-check failures gracefully, and forwards resolved values to the decision step.

**`strategyDecision()`** is a pure function with a fixed priority list: it compares a raw value against each threshold band, and if multiple bands match, the worst matching severity wins. Characteristically, there are no scores or weights here — just ordered comparison.

**`Result[]`** is the final output: a flat, ungrouped list of triggered checks, each with its identifier, severity, raw value, explanation, enabled state, and threshold. Aggregation across multiple fired checks happens one layer up, in the wallet itself — the engine deliberately stays unopinionated about the "overall" verdict.

## 4. Core Features — Phishing & Malicious Site Detection (~300 words)
This section covers how Rabby flags dangerous domains and dApps before a user even reaches the signing screen. The main mechanism is rule-based scoring of the site/origin context, surfaced as colored rule cards (SAFE / WARNING / DANGER / FORBIDDEN), each carrying a rule ID, a plain-language description of what triggered it, and the severity level that determines how forcefully the warning interrupts the user's flow.

Key characteristics to highlight: detection happens at the *site* level, separate from but complementary to the transaction-level checks — meaning a user can be warned about a malicious origin even before any transaction data is parsed. The system reuses the same severity vocabulary (SAFE/WARNING/DANGER/FORBIDDEN) as the transaction rule engine, so the UI experience stays consistent whether the threat is a phishing domain, a malicious contract, or a risky signature. Cards are color-coded by severity (e.g., red border-left for forbidden, orange for danger, yellow for warning, green for safe), giving users an immediate visual cue about how serious a flagged site is, with the ability to expand each card for the underlying rule explanation.

When walking through this slide, emphasize that phishing detection isn't a single algorithm but a layered combination of origin blacklists (from Layer 4's local overrides), backend-fetched address/contract descriptors (`addrDesc` from Layer 1), and dedicated site-risk rules evaluated by the same engine that scores transactions. This reuse of infrastructure — one engine, one severity model, one card-based UI pattern — is itself a notable architectural characteristic: Rabby doesn't maintain a separate phishing-detection subsystem, but folds site-level risk into the same pipeline that handles transaction and signature risk, keeping the codebase and the user experience unified.

## 5. Core Features — Signature Risk Explanations (~300 words)
This section addresses the "what I sign vs. what I see" problem — the gap between the raw data a user cryptographically signs and their actual understanding of what permissions they're granting. Off-chain signatures (e.g., EIP-712 typed data, `permit`/`permit2` approvals) are a favorite attack vector precisely because they look like meaningless hex to most users.

Main components to walk through: an information-card grid that breaks down what a signature actually authorizes (spender, amount, expiry, scope), and a flow diagram showing the pipeline from raw signature payload to a plain-language explanation rendered on the signing screen. The defining characteristic here is *decoding*: rather than showing users a wall of hexadecimal data and a "Sign" button, Rabby parses the structured data and translates it into human terms — "You are granting [spender] permission to spend up to [amount] of [token] until [date]."

Emphasize why this matters: many real-world drainer attacks (e.g., malicious `permit` signatures that grant unlimited token allowances without an on-chain transaction ever appearing) succeed precisely because wallets historically displayed only the raw payload. By parsing signature intent the same way it parses transaction intent (reusing the `parseAction`/`ActionContext` pattern from Layer 2), Rabby closes that gap and applies the same rule-engine severity model to signature requests as it does to transactions — another example of architectural reuse rather than a bolted-on feature. This section pairs naturally with the approval-alerts discussion, since `permit`/`permit2` signatures are functionally a form of token approval, just issued off-chain.

## 6. Core Features — Pre-Sign Transaction Simulation (~300 words)
This is widely regarded as Rabby's flagship feature, and the slide should foreground *why*: instead of asking users to predict the consequences of a transaction from raw calldata, Rabby actually executes it against current chain state before the user signs, then shows the resulting balance deltas.

Main component to highlight: `preExecTx`, introduced back in Layer 1 of the pipeline — it simulates execution on-chain and surfaces "before vs. after" balance changes (tokens leaving, tokens arriving, NFTs transferred, allowances granted) directly on the confirmation screen. The characteristic that matters most pedagogically: this converts an abstract, irreversible cryptographic action into something resembling a concrete preview — "you will lose X and gain Y" — which is far easier for a non-technical user to evaluate than a string of hex.

Walk through the card/callout layout used on this slide: a "slide" panel showing the simulated balance changes side-by-side with the requested transaction, plus callout boxes flagging any mismatches between what the dApp claims will happen and what the simulation actually predicts — a powerful signal that something is off (e.g., a "swap" that actually drains an unrelated token).

Tie this back to the wallet-comparison slide: simulation is one of the few features where Rabby and Phantom score "Yes" while MetaMask is "Partial" and Trust Wallet is "No" — making it a strong differentiator worth dwelling on. Conclude by connecting this to the broader thesis of the deck: simulation is what the conclusion slide calls "the most impactful security feature," because it directly targets user *confusion*, the root cause most scams exploit.

## 7. Core Features — Approval Risk Alerts (~300 words)
This section covers one of DeFi's most dangerous moments: granting a token approval, after which the approved contract can move funds at any time. The slide presents four mechanisms, each with its own components.

**Unlimited Approval Detection** — components: `TokenAmountItem` (editable amount field showing the requested amount next to the wallet's balance), `handleClickTokenBalance` (flags amounts exceeding balance as a likely unlimited request and offers a one-click fix), and `handleApproveAmountChange`/`getCustomTxParamsData` (rewrite the transaction to request only the real balance). Characteristic: this is a *prevention* mechanism — it fixes the permission before signing rather than merely flagging it afterward, and notably lives in the approval UI/transaction-editing logic rather than as a numbered rule in the engine.

**Multi-Layer Risk Scoring** — blends three inputs: a server-side verdict on the spender, a "spend layer" derived from USD value at risk (thresholds at $10K and $100K), and a "user-behavior layer" comparing community revoke-vs-approve ratios (>4× revokes = danger, >2× = warning). Components: `ComputedRiskAboutValues`, `ComputedRiskEvaluation`, `makeComputedRiskAboutValues`, `getContractRiskEvaluation`. Characteristic: both the highest single score and the combined sum are kept, which is what orders the approval list.

**Contract Reputation** — surfaces verification status, contract age, and community treatment directly on the signing screen, turning abstract trust questions into visible facts.

When presenting, stress that these four mechanisms operate at different points in the decision chain — some prevent (amount editing), some score (multi-layer scoring), some inform (reputation) — illustrating the "defense in depth" theme that the conclusion slide names explicitly.

## 8. Core Features — Address Poisoning & Contract Risk Labels (~300 words)
This section addresses "address poisoning" — an attack where scammers send near-zero-value transactions from addresses whose strings closely resemble a victim's real contacts, hoping the victim later copies the wrong address from their transaction history. The conclusion slide calls this "a growing threat" and notes Rabby is one of the few wallets that actively filters it — a genuine differentiator worth dwelling on.

Main components to present: the contract/address risk-label cards (using the same severity-tier color system as other slides — forbidden/danger/warning/safe), and the underlying `addrDesc` data (from Layer 1) that supplies metadata such as whether an address is verified, labeled, newly created, or previously flagged for scams. The characteristic to emphasize: this isn't pattern-matching on the address string alone — Rabby cross-references contextual metadata (transaction history, labels, community reports) to decide whether a similar-looking address is legitimate or a poisoning attempt, then filters or visually de-emphasizes suspicious entries in the transaction history UI itself, before the user ever gets a chance to copy the wrong one.

Connect this back to the wallet-comparison table: address poisoning filtering is one of the starkest gaps between wallets — Rabby scores "Yes," MetaMask only "Partial," and both Trust Wallet and Phantom score "No." This makes it a good talking point for illustrating how a seemingly small UX detail (which address gets highlighted in a history list) can be the difference between a safe and a catastrophic outcome. Frame this feature as an example of *proactive* filtering — preventing a mistake from being possible — rather than the *reactive* warning pattern used elsewhere in the pipeline (e.g., phishing-site banners or approval alerts that appear only at the moment of signing.

## 9. Wallet Comparison (~100 words)
This slide places Rabby against MetaMask, Trust Wallet, and Phantom across seven criteria: pre-transaction simulation, phishing detection, address poisoning filtering, unlimited approval warnings, signature intent parsing, contract reputation display, and multi-chain risk assessment. Rabby scores "Yes" on every row; competitors are mostly "Partial" or "No." The slide cites the WalletProbe (2025) study of 39 browser wallet extensions — all had exploitable vectors, but simulation-equipped wallets like Rabby cut attack success rates significantly — and an aggregate coverage score out of 10 (Rabby 9.2, MetaMask 7.5, Phantom 6.8, Trust Wallet 4.5, OKX 5.2).

## 10. Proof of Concept (~300 words)
This slide is currently a placeholder for a forthcoming deep-dive session, so the script should set expectations rather than over-promise specifics. Frame it as a hands-on complement to the architectural walkthrough: a minimal, from-scratch wallet prototype — built specifically to internalize Rabby's design choices rather than to compete with them — that implements a small slice of the same pre-sign risk-checking pipeline.

Outline what the eventual session is expected to cover, based on the planned scope: (1) a simplified transaction *simulation* step echoing `preExecTx` — showing predicted balance changes before a mock signature is approved; (2) a small *rule-evaluation* layer modeled loosely on RuleConfig/`engine.run()`, with a handful of illustrative checks (e.g., "is the spender a brand-new contract?", "does the requested amount exceed the balance?") rather than the full ~89-rule surface; and (3) a minimal *warning UX* — colored severity badges and plain-language explanations — echoing the SAFE/WARNING/DANGER/FORBIDDEN vocabulary used throughout the deck.

When presenting, position this less as "rebuilding Rabby" and more as a pedagogical exercise: implementing even a stripped-down version of these layers tends to surface the *design tensions* that production wallets must resolve — how to keep rule evaluation fast and parallel without sacrificing accuracy, how to phrase warnings so that users actually read them instead of reflexively dismissing them, and how to decide which checks belong in a generic engine versus which belong in feature-specific UI logic (as seen with the unlimited-approval mechanism, which deliberately lives outside the rule engine). Note to the audience that this section is still in progress and will be replaced with a fuller research write-up.

## 11. Conclusion (~100 words)
Six takeaways close the deck: (1) multi-layered defense is essential — no single check catches everything; (2) pre-sign simulation is the single most impactful feature, since it directly counters user confusion; (3) address poisoning is a growing threat that Rabby actively filters, unlike most competitors; (4) signature parsing closes the "what I sign vs. what I see" gap that off-chain-signature attacks exploit; (5) being open source lets the security community independently verify Rabby's protection claims; and (6) user education remains essential, since no tool can protect someone who dismisses every warning.

## 12. References (~100 words)
This slide lists the sources underpinning the research: academic evaluations of wallet security (Hu et al., 2025; Guan & Li, 2025; Wilczynski & Jasnosz, 2025), and the WalletProbe (2025) study testing 39 browser-based wallet extensions for exploitable attack vectors — the source of the comparison-table scores and the claim that simulation-capable wallets meaningfully reduce attack success rates. Each citation card includes a tag (e.g., "academic paper," "industry study"), a title, author/year metadata, a short summary of the finding it supports, and a link. Close by noting that the analysis is based on Rabby's open-source repository plus this body of recent academic work on crypto-wallet security.
