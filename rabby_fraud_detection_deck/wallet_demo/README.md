# ChainShield Wallet Security Demo

ChainShield is a Rabby-inspired customer wallet security platform demo. It focuses on account access, wallet connection, explainable transaction risk, phishing protection, approval management, address poisoning defense, signature parsing, persistent user settings, profile management, and presentation-ready activity tracking.

## Open the App

Open `frontend/index.html` in a browser.

## Demo Flow

1. Create an account with `Sign Up`, use the seeded `demo@chainshield.local` / `password`, or click `Demo Account`.
2. Review `Rabby Inspiration` to explain the studied wallet-protection features, ChainShield implementation, and security benefit.
3. Confirm the wallet starts disconnected, then click `Connect Wallet`.
4. Review the customer dashboard: wallet status, address, balance, security score, active threats, warnings, and recent activity.
5. In `Transaction Simulation`, click:
   - `Low Risk Scenario`: Trusted address, risk score 15, safe status, green indicators.
   - `Medium Risk Scenario`: Unknown address, risk score 55, caution status, yellow indicators.
   - `High Risk Scenario`: Suspicious address, unlimited approval, warning modal.
   - `Scam Transaction Scenario`: Known scam address, transaction blocked, critical warning.
6. Read the `Risk Score Breakdown` to see amount, address, approval, token, and total risk.
7. Click `Submit Transaction` to open the Rabby-style transaction preview modal with date, time, transaction ID, destination, recommendation, and action buttons.
8. Use `Abort Transaction` or `Continue Anyway` to show visible transaction results and activity records.
9. In `Phishing Detection`, enable `Hide Phishing Addresses` to hide phishing rows and show the hidden count.
10. In `Approval Alerts`, use `Review` to open detailed approval analysis and `Revoke` to remove the approval with a success popup.
11. In `Address Poisoning`, enable `Hide scam entries` to remove look-alike scam transactions.
12. In `Signature Parsing`, use `Reject Signature` or `Continue` to show visible feedback and log the decision.
13. In `Security Center`, explain the score, active threats, risky approvals, hidden scam transactions, and security score breakdown.
14. In `Profile`, edit name, email, wallet nickname, and profile picture URL. Changes persist after refresh.
15. In `Settings`, toggle protections and click `Save Settings`. Preferences persist with localStorage.
16. Use the wallet/profile dropdown to open Profile, Settings, Activity Log, or Disconnect Wallet.
17. Use `Presentation Mode` to hide non-essential sections and keep Wallet, Simulation, Phishing, Approvals, Address Poisoning, Signature Parsing, and Security Dashboard visible.

## Implemented Requirements

- Modern auth with login, signup validation, forgot password simulation, localStorage demo users, and session persistence.
- Rabby Inspiration section showing Rabby feature description, ChainShield implementation, and security benefit for eight studied protections.
- Customer wallet dashboard with disconnected initial state, connect/disconnect behavior, dropdown menu, and user profile initials.
- Dynamic explainable risk engine with amount, address, approval, token, and total risk breakdown.
- Working low, medium, high, phishing, unlimited approval, and scam demo scenarios.
- Dynamic pre-transaction warning popup with timestamp, transaction ID, destination, score, reputation, and recommendation.
- Suspicious address table with dynamic phishing hiding and accurate counts.
- Approval alerts with review, revoke, immediate state update, persistence, and activity logging.
- Activity center for wallet, transaction, approval, signature, settings, profile, and phishing actions.
- Persistent user settings page with protection toggles.
- Persistent profile management page.
- Address poisoning protection page.
- Signature parsing warning page.
- Security center with score, threats, approvals, hidden scam count, and recommendations.
- Security dashboard breakdown for transaction, approval, address, and signature risk.
- Dark and redesigned light theme, purple-accent professional styling, responsive layout, smooth interactions, and presentation mode.
