# Content Review: Signature Risk Page vs. Rabby Source Code

**File reviewed:** `rabby_placeholder_signature_risk.html`
**Verified against:** `Rabby repo/Rabby` (main wallet source) and `Rabby repo/rabby-security-engine`
**Date:** 2026-06-07
**Scope:** factual accuracy of the "signature risk / signature parsing" content, redundancy with other pages of the deck, and overlap with the deck's "5 layers" / rule-engine overview. (CSS/HTML code-quality issues are covered separately in `CODE_REVIEW_signature_risk.md`.)

---

## 1. Factual issues found (and fixed in the file)

### 1.1 Wrong example — calldata used as a "signature"
The original "Without Signature Parsing" scenario showed:

```
0xa9059cbb000000000000000000000000...
```

`0xa9059cbb` is the function selector for ERC-20 `transfer(address,uint256)` — that is **transaction calldata** (`eth_sendTransaction`), not a **signature request** (`eth_signTypedData` / `personal_sign`). Using it on a page specifically about "Signature Risk" conflates two different Rabby subsystems (transaction parsing vs. signature/typed-data parsing) and misrepresents what a user actually sees when asked to sign.

**Fix applied:** replaced the example with a realistic EIP-712 `Permit` payload (`primaryType: "Permit"`, unlimited `value`, `spender`, `deadline`), which is what Rabby's signature-risk machinery is actually built to decode.

### 1.2 Overstated claim of local/standalone decoding
The page states "Rabby decodes raw signature requests... into plain-language explanations," implying a self-contained, client-side decoder. The actual pipeline (verified in source) is:

- `parseSignTypedDataMessage.ts` — runs **locally**, but only filters the EIP-712 message down to the fields declared in `primaryType`. It does not interpret meaning.
- `wallet.openapi.parseTypedData` — a **backend API call** that does the real decoding/classification.
- `parseAction` from the `@rabby-wallet/rabby-action` package — turns the API response into a typed `ParsedTypedDataActionData` / `ParsedTextActionData`.
- Dedicated renderers per action type: `Permit.tsx`, `Permit2.tsx`, `ContractCall.tsx`, `BuyNFT.tsx`, `SellNFT.tsx`, `SwapTokenOrder.tsx`, `CoboSafe*.tsx`, etc. (`src/ui/views/Approval/components/TypedDataActions/`).

**Fix applied:** the "Processing Pipeline" diagram now names each real stage (local EIP-712 field filter → backend `openapi.parseTypedData` + `rabby-action` → action renderer → security-engine check), instead of the generic "Parse Message Data → Human-Readable Explanation" placeholder steps.

### 1.3 Unsubstantiated "Contract Intelligence: analyzes source code"
No code path in the signature-signing flow fetches or analyzes contract source code. What the security engine actually evaluates for `permit` / `permit2` (in `rabby-security-engine/src/rules/permit.ts` and `permit2.ts`) is metadata-based:

| Rule ID (permit / permit2) | Signal | Effect |
|---|---|---|
| 1077 / 1071 | Spender address is an EOA | danger |
| 1148 / 1149 | Spender contract trust value / risk exposure is `$0` | warning (phishing indicator) |
| 1079 / 1073 | Contract deployment duration is too short | warning |

**Fix applied:** replaced the "Contract Intelligence" card with "Spender Risk Scoring," naming these concrete rule IDs and signals instead of the vague and unverifiable "analyzes contract source code and behavior patterns."

---

## 2. Redundancy / overlap with other pages in the deck

These items were generic wallet-threat content that duplicates (or will duplicate) other pages rather than describing what is specific to the *signing* step:

- **"Threats Detected" grid** (Hidden Token Transfers, Fake Contract Interactions, Address Spoofing, Unusual Permissions) — these are general transaction/contract/address risk topics, not signature-specific. Per `CODE_REVIEW_signature_risk.md`, the deck already has a separate `rabby_placeholder_phishing_detection.html`, and presumably an address/contract risk-scoring page — this card grid was re-explaining the same threats from scratch.
- **"Recipient Verification ... cross-references known malicious address databases"** — this is the address/contract risk-scoring feature's responsibility, not something signature parsing implements independently.
- **No connection to the "5 layers" / rule engine overview** — the page presented signature analysis as a self-contained feature with its own informal "Warning System," when in fact it plugs into the same `@rabby-wallet/rabby-security-engine` (rule IDs, `Level`, threshold system) used elsewhere in the product.

**Fix applied:**
- Renamed the section to "Signing-Specific Threats" and narrowed it to four threats that are genuinely particular to the signing step: blind signing, unlimited Permit/Permit2 approvals, `primaryType`/schema spoofing, and phishing signature requests.
- Replaced the ad hoc "Warning System" list with the actual rule IDs/signals the security engine surfaces during signing.
- Added an explicit "Cross-References" block pointing to the Phishing Detection page, the Address & Contract Risk Scoring page, and the 5-Layer Architecture / Rule Engine overview — so the reader is directed to the authoritative section instead of getting a re-explanation.

---

## 3. Recommendations going forward

1. **Keep examples scoped to the right RPC method.** Signature pages should only use `eth_signTypedData[_v4]` / `personal_sign` payloads; transaction pages should use `eth_sendTransaction` calldata. Mixing them (as the original `0xa9059cbb` example did) misleads readers about which subsystem does what.
2. **Name real modules/IDs wherever possible.** Generic claims ("analyzes contract source code," "compares against known legitimate contracts") read as marketing copy and can't be checked. Citing rule IDs (e.g., 1077, 1148, 1079) and concrete module names (`parseSignTypedDataMessage`, `openapi.parseTypedData`, `rabby-action`) makes the page verifiable and durable against future refactors (re-grep the IDs to confirm they still exist).
3. **Establish a single source of truth per threat/feature** and have other pages link to it rather than restate it. The "Threats Detected" duplication suggests the deck would benefit from one canonical "threat taxonomy" page that every feature page links into, with each feature page only describing *its own* detection mechanism.
4. **Tie every feature page back to the 5-layer / rule-engine overview.** Readers should be able to see, from any feature page, which layer it belongs to and which rule IDs it contributes — this page originally had neither.

---

## 4. Summary of edits made to `rabby_placeholder_signature_risk.html`

- Replaced the ERC-20 `transfer` calldata example with a realistic EIP-712 `Permit` typed-data example (unlimited allowance, EOA spender, $0 trust value) for both the "without" and "with" parsing scenarios.
- Rewrote the "Processing Pipeline" diagram to reflect the real local-filter → backend-decode → action-renderer → security-engine sequence.
- Replaced the "Contract Intelligence" info-card with "Spender Risk Scoring," citing rule IDs 1077/1071, 1148/1149, 1079/1073.
- Reworked "Recipient Verification" wording to point at shared address-risk infrastructure rather than implying signature parsing has its own malicious-address database.
- Narrowed "Threats Detected" to four signing-specific threats (blind signing, unlimited Permit/Permit2 approvals, primaryType spoofing, phishing signature requests) and replaced the generic "Warning System" list with actual security-engine signals.
- Added a "Cross-References" block linking to the Phishing Detection, Address & Contract Risk Scoring, and 5-Layer Architecture / Rule Engine pages to remove duplication.
