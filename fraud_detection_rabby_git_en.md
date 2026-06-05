# Rabby Wallet — Fraud Detection: Deep Dive from Source Code

> Analysis directly from the [`Rabby`](https://github.com/RabbyHub/Rabby) repository, based on actual files in the codebase.

---

## 1. Overall Architecture

```
User Action (sign tx / send / connect dapp)
        │
        ▼
  rpcFlow.ts  ──────────────────── middleware chain
        │
        ▼
  wallet.ts (WalletController)
        │
        ├── openapi (https://api.rabby.io)
        │     ├── parseTx()          → classify action type
        │     ├── preExecTx()        → simulate tx, balance_change
        │     └── addrDesc()         → address metadata (scam, cex, contract...)
        │
        └── SecurityEngineService
              ├── Engine (rabby-security-engine)
              │     └── run(rules, userData, context)
              └── UserData (local blacklist/whitelist)
```

**3 key npm packages:**

| Package | Version | Role |
|---|---|---|
| `@rabby-wallet/rabby-api` | 0.9.62 | HTTP client calling `https://api.rabby.io` |
| `@rabby-wallet/rabby-action` | 0.1.14 | Parse & classify tx actions, fetch required data, format context |
| `@rabby-wallet/rabby-security-engine` | 2.0.12 | Rule engine running risk rules, returns `Result[]` with Level |

---

## 2. Security Engine — Core Component

### File: `src/background/service/securityEngine.ts`

```typescript
import Engine from '@rabby-wallet/rabby-security-engine';
import { defaultRules, UserData, RuleConfig } from '@rabby-wallet/rabby-security-engine/dist/rules';

class SecurityEngineService {
  store: SecurityEngineStore = {
    userData: {
      originBlacklist: [],   // blocked dapp origins
      originWhitelist: [],
      contractBlacklist: [], // blocked contracts
      contractWhitelist: [],
      addressBlacklist: [],  // blocked addresses
      addressWhitelist: [],
    },
    rules: [],
  };

  engine: Engine | null = null;

  init = async () => {
    this.rules = defaultRules;  // load default rules from npm package
    this.engine = new Engine(this.rules, openapiService);
  };

  execute = async (actionData: ContextActionData) => {
    return await this.engine.run({
      ...actionData,
      userData: this.store.userData,  // inject user's personal lists
    });
  };
}
```

**Key insight:** The Engine receives `ContextActionData` (context about the tx/action) + `userData` (personal lists) → returns `Result[]`, each result carrying a `level`.

### Risk Levels (from `@rabby-wallet/rabby-security-engine`)

```typescript
enum Level {
  SAFE      // green  — no risk
  WARNING   // yellow — caution
  DANGER    // red    — dangerous
  FORBIDDEN // black  — hard block
}
```

Priority logic in `SignTx.tsx`:
```typescript
if (enableResults.some(r => r.level === Level.FORBIDDEN)) return Level.FORBIDDEN;
if (enableResults.some(r => r.level === Level.DANGER))    return Level.DANGER;
if (enableResults.some(r => r.level === Level.WARNING))   return Level.WARNING;
```

---

## 3. Transaction Analysis Flow (SignTx)

### File: `src/ui/views/Approval/components/SignTx.tsx`

When a user signs a transaction, the actual flow is:

```
Step 1: parseTx  (fires in parallel with Step 2)
  wallet.openapi.parseTx({ chainId, tx, origin, addr })
  → API: https://api.rabby.io
  → Returns: { action: { type, data }, contract_call, log_id }
  → action.type = 'token_approve' | 'send_token' | 'contract_call' | 'multi_actions' | …

Step 2: preExecTx  (fires in parallel with Step 1)
  wallet.openapi.preExecTx({ tx, origin, address, pending_tx_list })
  → API: https://api.rabby.io
  → Returns: { pre_exec: { success }, balance_change, gas, pre_exec_version }
  → Simulates the on-chain tx before signing

Step 3: parseAction  (local, rabby-action package)
  parseAction({ type: 'transaction', data: actionData.action, balanceChange, tx, preExecVersion })
  → Returns: ParsedTransactionActionData (structured action object)

Step 4: fetchActionRequiredData  (API calls, rabby-action package)
  fetchActionRequiredData({ actionData, contractCall, chainId, sender, walletProvider, apiProvider })
  → Fetches additional data needed for security checks
     (contract info, trust value, deploy time, whitelist status…)

Step 5: formatSecurityEngineContext  (local, rabby-action package)
  formatSecurityEngineContext({ type, actionData, requireData, chainId, provider })
  → Returns: ContextActionData  (input for the Engine)

Step 6: executeEngine  (SecurityEngine)
  executeEngine(ctx)  →  wallet.executeSecurityEngine(actionData)
  → SecurityEngineService.execute(actionData)
  → Engine.run({ ...ctx, userData })
  → Returns: Result[]  with a level per rule
```

---

## 4. Address Risk Detection

### File: `src/ui/hooks/useAddressRisk.ts`

When a user enters a recipient address (send token/NFT), 5 risk types are checked:

```typescript
enum RiskType {
  NEVER_SEND       = 1,  // never sent to this address before
  SCAM_ADDRESS     = 2,  // flagged scam address (from addrDesc API)
  CONTRACT_ADDRESS = 3,  // is a contract, not an EOA
  CEX_NO_DEPOSIT   = 4,  // CEX that does not support deposits
  FORBIDDEN_TIP    = 5,  // tip from the rule engine (highest priority)
}

// Priority order (higher = shown first / blocks harder)
const riskTypePriority = {
  [RiskType.CEX_NO_DEPOSIT]:    10e-1,
  [RiskType.NEVER_SEND]:        10,
  [RiskType.CONTRACT_ADDRESS]:  10e1,
  [RiskType.SCAM_ADDRESS]:      10e3,
  [RiskType.FORBIDDEN_TIP]:     10e4,  // highest
};
```

**API calls inside this hook:**

```typescript
// 1. Fetch address metadata from DeBank/Rabby API
const addrDescRes = await wallet.openapi.addrDesc(toAddress);
// Returns: { is_danger, is_scam, cex: { id, is_deposit }, contract: { [chainId]: { multisig } } }

// 2. Check transfer history (from user's top 10 accounts)
const res = await wallet.openapi.hasTransferAllChain(fromAddr, toAddr);
// Returns: { has_transfer: boolean }

// 3. Check CEX token deposit restrictions
await wallet.openapi.checkTokenDepositForbidden({ chain_id, to_addr, user_addr, id });
// Returns: { msg: string }  — tip message if forbidden
```

---

## 5. User Data — Personal Lists

### File: `src/background/service/securityEngine.ts`

Users can manage their own blacklists/whitelists, persisted locally:

```typescript
// Origins (dapp domains)
addOriginWhitelist(origin)   / removeOriginWhitelist(origin)
addOriginBlacklist(origin)   / removeOriginBlacklist(origin)

// Contracts (address + chainId pair)
addContractWhitelist(contract)   / removeContractWhitelist(contract)
addContractBlacklist(contract)   / removeContractBlacklist(contract)
removeContractBlacklistFromAllChains(contract)  // cross-chain removal

// Addresses
addAddressWhitelist(address)   / removeAddressWhitelist(address)
addAddressBlacklist(address)   / removeAddressBlacklist(address)
```

All are injected into the Engine at runtime:
```typescript
engine.run({ ...actionData, userData: this.store.userData })
```

---

## 6. Whitelist Feature (Send Protection)

### File: `src/background/service/whitelist.ts`

A separate whitelist from SecurityEngine's userData — used to protect send actions:

```typescript
class WhitelistService {
  store: { enabled: boolean; whitelists: string[] }

  isWhitelistEnabled()  // always returns true (user toggle is currently ignored)
  isWhitelisted(address)
  addWhitelist(address)
  removeWhitelist(address)
}
```

The whitelist is passed into `fetchActionRequiredData` via `walletProvider`:
```typescript
walletProvider: {
  getWhitelist: wallet.getWhitelist,
  isWhitelistEnabled: wallet.isWhitelistEnabled,
  ...
}
```

---

## 7. Approve List (DApp Actions)

### File: `src/ui/views/CommonPopup/AssetList/components/DappActions/approvelist.json`

A JSON file containing a list of approved dapp actions. Updated via GitHub Actions:

### `.github/workflows/update-approvelist.yml`

```yaml
# Trigger: manual (workflow_dispatch) with a json_url input
# Flow:
#   curl -L -o approvelist.json "${{ inputs.json_url }}"
#   mv approvelist.json src/ui/.../DappActions/approvelist.json
#   Auto-create a Pull Request
```

→ The Rabby team can push approvelist updates at any time through CI/CD.

---

## 8. SecurityListItem — UI Component

### File: `src/ui/views/Approval/components/Actions/components/SecurityListItem.tsx`

Component that renders risk warnings in the approval UI:

```typescript
const SecurityListItem = ({ id, engineResult, dangerText, warningText, safeText, forbiddenText }) => {
  return (
    <>
      {engineResult.level === Level.DANGER    && dangerText}
      {engineResult.level === Level.WARNING   && warningText}
      {engineResult.level === Level.SAFE      && safeText}
      {engineResult.level === Level.FORBIDDEN && forbiddenText}
      <SecurityListItemTag id={id} engineResult={engineResult} />
    </>
  );
};
```

Action components (ApproveToken, ApproveNFT, Send, ContractCall…) all use `SecurityListItem` to display risk:
- `page.signTx.tokenApprove.flagByRabby` — contract flagged by Rabby
- `page.signTx.tokenApprove.eoaAddress` — approving to an EOA instead of a contract
- `page.signTx.tokenApprove.deployTimeLessThan` — contract recently deployed
- `page.signTx.tokenApprove.contractTrustValueTip` — low contract trust value

---

## 9. Redux State Management

### File: `src/ui/models/securityEngine.ts`

Security engine state in Redux (Rematch):

```typescript
interface State {
  userData: UserData;
  rules: RuleConfig[];
  currentTx: {
    processedRules: string[];  // rules the user has already acknowledged
    ruleDrawer: {
      selectRule: { ruleConfig, value, level, ignored } | null;
      visible: boolean;
    };
  };
}

// Actions:
// processRule(id)       → user acknowledges one rule
// processAllRules(ids)  → user acknowledges all ("Confirm anyway")
// unProcessRule(id)     → revert acknowledgement
// openRuleDrawer(rule)  → show detail drawer for one rule
```

**Flow when user clicks "Confirm anyway":**
```typescript
dispatch.securityEngine.processAllRules(engineResults.map(r => r.id))
// → processedRules = [all rule ids]
// → enableResults filters out processed rules → no more blocking
```

---

## 10. API Endpoint (OpenAPI)

### Base URL: `https://api.rabby.io`  (testnet: `https://api.testnet.rabby.io`)

API calls related to fraud detection (inferred from code):

| Method | Endpoint (inferred) | Used for |
|---|---|---|
| `openapi.parseTx()` | `POST /v1/tx/action` | Classify transaction action type |
| `openapi.preExecTx()` | `POST /v1/tx/pre_exec` | Simulate tx, check balance change |
| `openapi.addrDesc()` | `GET /v1/address/desc` | Address metadata (scam, cex, contract) |
| `openapi.hasTransferAllChain()` | `GET /v1/user/has_transfer` | Check transfer history |
| `openapi.checkTokenDepositForbidden()` | `POST /v1/cex/check_forbidden` | CEX deposit restriction check |

API key is auto-generated (UUID) and persisted:
```typescript
generateAPIKey = () => {
  const uuid = uuidv4();
  this.store.apiKey = uuid;
  this.store.apiTime = Math.floor(Date.now() / 1000);
};
```

---

## 11. Summary — Full Fraud Detection Stack

```
Layer 1: Backend Intelligence  (api.rabby.io + DeBank)
  - Address reputation     (is_scam, is_danger flags)
  - Tx action classification  (parseTx)
  - Pre-execution simulation  (preExecTx / balance_change)
  - Transfer history tracking

Layer 2: Rule Engine  (rabby-security-engine v2.0.12)
  - defaultRules: built-in ruleset (closed-source in npm)
  - User-configurable: each rule can be enabled/disabled
  - Levels: SAFE → WARNING → DANGER → FORBIDDEN
  - Context-aware: each action type has its own context shape

Layer 3: Action Analysis  (rabby-action v0.1.14)
  - parseAction: decode raw tx data → structured action object
  - fetchActionRequiredData: enrichment (contract age, trust value…)
  - formatSecurityEngineContext: build final context for rule engine

Layer 4: Local User Data
  - Personal blacklist/whitelist  (origin, contract, address)
  - Address whitelist  (send protection)
  - Processed rules state  (per-tx session, reset on new tx)

Layer 5: UI
  - SecurityListItem: renders risk per rule in approval screens
  - AddressRiskAlert: warning banner when entering recipient address
  - Rule drawer: user can inspect and ignore individual rules
  - "Confirm anyway": overrides all non-FORBIDDEN warnings
```

---

## 12. Closed-Source Parts — Further Research Needed

The following are **not in this repo** — they live inside npm packages:

- `@rabby-wallet/rabby-security-engine/dist/rules`: the actual `defaultRules` array (rule definitions, trigger conditions, thresholds)
- `@rabby-wallet/rabby-action`: full logic of `parseAction`, `fetchActionRequiredData`, `formatSecurityEngineContext`
- Backend `api.rabby.io`: scoring logic behind `is_scam`, `is_danger`, contract trust value

To go deeper, decompile the npm packages or search for the public repos of `rabby-security-engine` and `rabby-action` on GitHub.
