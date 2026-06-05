# Rabby Wallet — Security Engine: Deep Technical Analysis

A comprehensive breakdown of every fraud-detection feature in the Rabby Wallet codebase, derived directly from the source at `Rabby repo/Rabby/`.

---

## 1. Architecture Overview

Rabby's fraud-detection stack is built around a dedicated package called **`@rabby-wallet/rabby-security-engine`** (v2.0.12), which acts as a rule engine that evaluates context data assembled from multiple sources and produces structured risk results per transaction or signing request.

```
User Action (send / approve / sign)
        │
        ▼
   rpcFlow.ts  ──── intercepts every eth_* call
        │
        ▼
   SignTx / SignText / SignTypedData  (React UI)
        │
        ├── wallet.openapi.preExecTx()   ──► DeBank OpenAPI (pre-execution simulation)
        │
        ├── formatSecurityEngineContext() ──► assembles ContextActionData
        │
        ▼
   SecurityEngineService.execute(ctx)   (background/service/securityEngine.ts)
        │
        ▼
   Engine.run(ctx + userData)            (@rabby-wallet/rabby-security-engine)
        │
        ▼
   Result[]  {id, level, value, enable}
        │
        ▼
   UI renders SecurityListItem / RuleDrawer per result
```

The engine runs **inside the browser extension background service worker**, not on any remote server. All rule evaluation is client-side.

---

## 2. The Security Engine Service (`securityEngine.ts`)

**File:** `src/background/service/securityEngine.ts`

### 2.1 Store / Persistence

The service persists two things via `createPersistStore`:

| Key | Type | Purpose |
|---|---|---|
| `userData` | `UserData` | User-maintained allow/block lists |
| `rules` | `UserRuleConfig[]` | Per-rule enable/disable + custom thresholds |

`UserData` contains six lists:

```typescript
{
  originBlacklist: string[]     // blocked dApp origins (URLs)
  originWhitelist: string[]     // trusted dApp origins
  contractBlacklist: ContractAddress[]  // blocked contracts (address + chainId)
  contractWhitelist: ContractAddress[]  // trusted contracts
  addressBlacklist: string[]    // blocked wallet addresses
  addressWhitelist: string[]    // trusted wallet addresses
}
```

### 2.2 Engine Initialization

```typescript
this.engine = new Engine(this.rules, openapiService);
```

The engine receives the merged rule list and a reference to `openapiService` — the DeBank API client. Rules defined in `defaultRules` (from the `rabby-security-engine` package) are loaded; user overrides (enable/disable, custom threshold) are merged on top.

### 2.3 Execution

```typescript
execute = async (actionData: ContextActionData) => {
  const results = await this.engine.run({
    ...actionData,
    userData: this.store.userData,
  });
  return results;
};
```

`ContextActionData` is built by `formatSecurityEngineContext()` in the UI layer and contains the fully decoded transaction/signing context together with chain data, contract metadata, and token info fetched from the DeBank API.

### 2.4 Rule Lifecycle

- `enableRule(id)` / `disableRule(id)` — toggle individual rules, persisted to store.
- `reloadRules(rules)` — re-merges default rules with user config and calls `engine.reloadRules()`.
- Rules can also be **ignored per-transaction** (stored in `processedRules` in the Redux model), which does not permanently disable them.

---

## 3. Risk Level Taxonomy

**File:** `src/constant/index.ts` (lines 1423–1466)

Five severity levels, in descending priority:

| Level | Color | Behavior |
|---|---|---|
| `FORBIDDEN` | `#AF160E` (dark red) | Transaction **blocked**, user cannot proceed unless rule is disabled |
| `DANGER` | `#EC5151` (red) | Strong warning, user can override (ignore) |
| `WARNING` | `#FFB020` (yellow) | Caution, easily ignorable |
| `SAFE` | `#27C193` (green) | Positive signal, shown as reassurance |
| `ERROR` | `#B4BDCC` (grey) | Engine failed to evaluate the rule |

Priority order used when multiple rules fire: `FORBIDDEN > DANGER > WARNING > SAFE > null > ERROR > proceed`.

The overall transaction state collapses to the highest-priority level across all active, non-ignored rules. If any enabled rule returns `FORBIDDEN`, the sign button is disabled.

---

## 4. Rule Categories and Rule IDs

Rules are identified by numeric string IDs. The UI maps each ID to a specific check. The following is reconstructed from the UI code across all `Actions/` and `TypedDataActions/` components.

### 4.1 Token Approval Rules (file: `Actions/TokenApprove.tsx`)

| Rule ID | Level | Description |
|---|---|---|
| `1022` | DANGER | Spender is an **EOA** (non-contract) address — extremely suspicious |
| `1150` | WARNING | Spender contract has **zero trust value** ($0) on DeBank |
| `1024` | WARNING | Spender contract **deployed less than 3 days ago** |
| `1029` | DANGER | Address **flagged by Rabby** as scam/malicious |
| `1133` | SAFE | Contract is on user's **contract whitelist** |
| `1134` | FORBIDDEN | Contract is on user's **contract blacklist** |
| `1136` | WARNING | Contract marked as blocked (warning-level blacklist) |

### 4.2 Send Token Rules (file: `Actions/Send.tsx`)

| Rule ID | Level | Description |
|---|---|---|
| `1019` | DANGER | Recipient contract **not deployed on this chain** |
| `1142` | WARNING | Recipient address source signals risk |
| `1016` | DANGER | Recipient is a **token contract address** (likely error) |
| `1021` | DANGER | Sending to a CEX deposit address — token **not supported** |
| `1020` | DANGER | CEX address — **not a top-up address** |
| `1018` | WARNING | **Never transacted** with this address before |
| `1143` | WARNING | Address flagged |
| `1033` | SAFE | Address is on user's **address whitelist** |

### 4.3 NFT Approval Rules (file: `Actions/ApproveNFT.tsx`, `ApproveNFTCollection.tsx`)

| Rule ID | Level | Description |
|---|---|---|
| Similar pattern | DANGER | Operator is EOA |
| `1029` | DANGER | Flagged by Rabby |
| `1133/1134/1136` | SAFE/FORBIDDEN/WARNING | User list checks (same as token approval) |

### 4.4 Swap / Cross-Chain Rules (file: `Actions/Swap.tsx`, `CrossToken.tsx`)

| Rule ID | Level | Description |
|---|---|---|
| `1008` | DANGER | Receiving address is not the sender's own address |
| `1009` | WARNING | Slippage too high |
| `1011` | DANGER | Receiving token is a **fake/scam token** |
| `1012` | WARNING | Price impact exceeds threshold |

### 4.5 Permit / EIP-712 Typed Data Rules (file: `TypedDataActions/BatchPermit2.tsx`, `Permit2.tsx`)

| Rule ID | Level | Description |
|---|---|---|
| `1092` | DANGER | Permit spender is EOA |
| `1093` | WARNING | Low trust value |
| `1096` | WARNING | Contract deployed recently |
| `1097` | DANGER | Flagged by Rabby |
| `1098` | WARNING | Never interacted with before |
| `1103` | WARNING | Permit expiry too long |
| `1104` | DANGER | Unlimited permit amount |
| `1105` | WARNING | High permit amount |
| `1109` | DANGER | Batch Permit2 — EOA spender |
| `1111` | WARNING | Batch Permit2 — recently deployed |
| `1113` | DANGER | Batch Permit2 — flagged by Rabby |
| `1133/1134/1136` | SAFE/FORBIDDEN/WARNING | User list checks |

### 4.6 NFT Marketplace / Order Rules (file: `TypedDataActions/BuyNFT.tsx`, `BatchSellNFT.tsx`)

| Rule ID | Level | Description |
|---|---|---|
| `1085` | DANGER | Payment receiver is **not the seller's address** |
| `1086` | DANGER | NFT being sold is **fake** |
| `1087` | WARNING | NFT floor price mismatch |
| `1114` | DANGER | NFT collection flagged |
| `1115` | DANGER | Payment address mismatch in batch sell |
| `1116` | DANGER | Fake NFT in batch |
| `1117` | WARNING | Price anomaly in batch |
| `1135` | FORBIDDEN | NFT marketplace contract on user blacklist |
| `1137` | WARNING | NFT marketplace contract on warning list |

### 4.7 Cross-Context Rules (appear across multiple action types)

| Rule ID | Level | Description |
|---|---|---|
| `1029` | DANGER | Rabby's global scam address database — flagged address |
| `1036` | WARNING | Contract interacted with **less than 3 times** globally |
| `1037` | DANGER | Contract **not open-source** (unverified) |
| `1038` | WARNING | Contract **no interaction history** from user |
| `1039` | DANGER | **Infinite approval** amount |
| `1042` | WARNING | Value sent exceeds expected range |
| `1043` | DANGER | Transaction destination is a **known exploit contract** |
| `1052` | WARNING | Gas price anomaly |
| `1053` | DANGER | Sending to the **zero address** |
| `1055` | DANGER | Contract on **Chainalysis sanctions list** |
| `1060/1061` | DANGER/WARNING | Signature **domain mismatch** (EIP-712) |
| `1062` | DANGER | Signing for a **different chain** than connected |
| `1069` | WARNING | dApp site origin is new / low reputation |

---

## 5. Pre-Execution Simulation (`preExecTx`)

**Called in:** `SignTx.tsx` line 1228

```typescript
const res = await wallet.openapi.preExecTx({
  tx: { ...tx },
  origin,
  address: currentAccount.address,
  updateNonce: true,
  pending_tx_list: pendingTxs,
});
```

Before rendering security engine results, Rabby calls DeBank's **`preExecTx`** API. This simulates the transaction against the current blockchain state and returns:

- `pre_exec.success` — whether the transaction would succeed
- `pre_exec_version` — versioned response format
- **Asset changes** — tokens gained/lost, NFTs transferred
- **Contract interactions** — decoded call data

The result feeds into `formatSecurityEngineContext()`, providing simulated outcome data that rules can reason about. If `pre_exec.success === false`, the UI shows an execution failure warning independently of rule scores.

---

## 6. Address Risk Detection (`useAddressRisk.ts`)

**File:** `src/ui/hooks/useAddressRisk.ts`

This hook is used on the **Send / Select Address** pages (before the transaction is signed). It is separate from the security engine and checks:

### Risk Types (enum `RiskType`)

| Type | Priority | Signal |
|---|---|---|
| `FORBIDDEN_TIP` (5) | Highest | CEX/protocol explicitly forbids deposits of this token to this address |
| `SCAM_ADDRESS` (2) | High | `addressDesc.is_danger` or `addressDesc.is_scam` from DeBank API |
| `CONTRACT_ADDRESS` (3) | Medium | Recipient is a smart contract (not multisig) — likely accidental |
| `NEVER_SEND` (1) | Low | User (or top-10 accounts by balance) has **never sent to this address** |
| `CEX_NO_DEPOSIT` (4) | Low | Address belongs to a CEX that **does not accept deposits** |

### Data Sources

1. **`wallet.openapi.addrDesc(toAddress)`** — DeBank API call returning `AddrDescResponse`: contract info, CEX info, scam flag, danger flag.
2. **`wallet.openapi.hasTransferAllChain(from, to)`** — checks if any of the user's top-10 accounts by balance has ever sent to this address, across all chains. Runs concurrently via `p-queue` (5 concurrent, 1s interval) with a 3-second timeout.
3. **`wallet.openapi.checkTokenDepositForbidden(...)`** — protocol-specific check whether a token deposit to a specific address is forbidden (e.g., some CEXes reject certain tokens).

---

## 7. User-Managed Lists

**File:** `src/background/service/securityEngine.ts`, `src/background/service/whitelist.ts`

### 7.1 Security Engine User Data Lists

Six lists are managed by `SecurityEngineService`:

- **originWhitelist / originBlacklist** — trusted/blocked dApp URLs (origins)
- **contractWhitelist / contractBlacklist** — trusted/blocked contracts, keyed by `{address, chainId}`
- **addressWhitelist / addressBlacklist** — trusted/blocked wallet addresses

These feed directly into the engine as `userData` and are checked by rules `1133/1134/1136` (contracts) and similar for addresses/origins.

Contract entries are chain-scoped: the same address on ETH and on Polygon are independent entries.

### 7.2 Send Whitelist (separate service)

**File:** `src/background/service/whitelist.ts`

A separate address whitelist specifically for **send operations**. When enabled, any send to an address not on this list requires the user to explicitly confirm. The service is always enabled (`isWhitelistEnabled()` always returns `true` regardless of stored setting — intentional hardcode).

---

## 8. Rule Drawer — User Override Mechanism

**File:** `src/ui/views/Approval/components/SecurityEngine/RuleDrawer.tsx`

When a user clicks on a flagged rule in the signing UI, a drawer opens showing:

- The rule's severity level with color-coded icon
- A description of why the rule fired (`ruleConfig.descriptions[level]`)
- An **"Ignore Alert"** button (for WARNING/DANGER/FORBIDDEN levels)

Ignoring a rule adds its ID to `processedRules` in the Redux store (`securityEngine` model) for the **current transaction only**. This is transient — it does not persist across transactions or sessions.

Users can also permanently **disable** a rule via the security settings page, which calls `wallet.ruleEnableStatusChange(id, value)` and persists to the engine store.

The `FORBIDDEN` level is special: the transaction remains blocked even if the user attempts to ignore it, unless the rule itself is disabled.

---

## 9. Redux State Model (`securityEngine` model)

**File:** `src/ui/models/securityEngine.ts`

The Rematch (Redux) model for the security engine manages UI state:

```typescript
{
  userData: UserData,           // from background service
  rules: RuleConfig[],          // active rules with thresholds
  currentTx: {
    processedRules: string[],   // rule IDs ignored for this TX
    ruleDrawer: {
      selectRule: { ruleConfig, value, level, ignored } | null,
      visible: boolean,
    }
  }
}
```

Effects:
- `init()` — fetches `userData` and `rules` from the background service
- `resetCurrentTx()` — clears processed rules on new transaction
- `processRule(id)` / `unProcessRule(id)` — add/remove from per-TX ignore list
- `processAllRules(ids)` — ignore all currently fired rules at once (the "Proceed Anyway" action)

---

## 10. Transaction Signing Flow (end-to-end)

**File:** `src/background/controller/provider/rpcFlow.ts`

Every eth RPC call goes through a `PromiseFlow` pipeline with these middleware steps:

1. **Method validation** — reject unknown or private methods
2. **Lock check** — if wallet is locked, trigger `Unlock` approval UI
3. **Permission check** — if dApp has no permission, trigger `Connect` approval UI (origin is logged)
4. **Approval routing** — if method requires approval (`SignTx`, `SignText`, `SignTypedData`), open the notification window

Inside the notification window (`SignTx.tsx`):

1. `preExecTx()` called → asset changes simulated
2. `formatSecurityEngineContext()` assembles context from: decoded action data (`@rabby-wallet/rabby-action`), preExec results, chain info, contract metadata, user whitelist state
3. `executeSecurityEngine(ctx)` → `SecurityEngineService.execute()` → `Engine.run()` → `Result[]`
4. Results rendered as `SecurityListItem` components; highest-priority level determines overall badge
5. If `FORBIDDEN` rule fires and is not disabled: sign button disabled
6. User can click any result to open `RuleDrawer` and optionally ignore it
7. On sign: `processedRules` checked; if all blocking rules are processed, transaction proceeds

---

## 11. External Data Dependencies

All external risk data flows through **`@rabby-wallet/rabby-api`** (the DeBank OpenAPI client). Key endpoints used for fraud detection:

| Endpoint | Used for |
|---|---|
| `preExecTx()` | Transaction simulation, asset change prediction |
| `addrDesc(address)` | Address type (EOA/contract/CEX), scam flag, danger flag |
| `hasTransferAllChain(from, to)` | Prior transaction history check |
| `checkTokenDepositForbidden(...)` | CEX/protocol deposit restriction check |
| `getRecommendChains(address, origin)` | Chain recommendation for auto-connect |

The API base URL defaults to `INITIAL_OPENAPI_URL` (DeBank's API). Each client instance has an API key generated as a UUID (`uuidv4()`) at first use, stored persistently.

---

## 12. Summary: What Rabby Actually Detects

| Threat Vector | Detection Method |
|---|---|
| Approval to EOA (private key drain) | Rule 1022 — spender type check via preExec + DeBank |
| Approval to newly deployed contract | Rule 1024 — contract creation timestamp |
| Approval to unvetted contract | Rule 1150 — DeBank trust value score |
| Known scam address | Rule 1029 — Rabby's internal scam DB via DeBank API |
| User-blacklisted contract | Rule 1134/1136 — local UserData lists |
| Unlimited permit/approval | Rules 1039, 1104 — amount threshold check |
| Permit to wrong chain | Rule 1062 — EIP-712 domain chainId vs connected chain |
| Fake token in trade | Rule 1011 — DeBank token legitimacy flag |
| NFT fake/price manipulation | Rules 1086, 1087, 1116, 1117 |
| Sending to never-used address | `useAddressRisk` — `hasTransferAllChain` check |
| Sending to scam address | `useAddressRisk` — `addrDesc.is_scam` / `is_danger` |
| Sending to contract | `useAddressRisk` — contract detection |
| Sanctioned contract | Rule 1055 — Chainalysis sanctions list |
| Transaction pre-exec failure | `pre_exec.success === false` from simulation |
| dApp origin blacklisted by user | `originBlacklist` UserData check |
| Domain spoofing (EIP-712) | Rules 1060/1061 — domain name vs origin |
| CEX deposit restriction | `checkTokenDepositForbidden` API call |
