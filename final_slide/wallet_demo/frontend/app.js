const trustedAddress = "0x82F1a3A87C8f69b105D6C20B89F8D2e4753E24c1";
const unknownAddress = "0x49a9B32E0d56e67C0faA462C5e64b992812cA10F";
const suspiciousAddress = "0xbad0000000000000000000000000000000000000";
const scamAddress = "0x000000000000000000000000000000000000dEaD";

const storageKeys = {
  users: "chainshield_users",
  session: "chainshield_session",
  profile: "chainshield_profile",
  settings: "chainshield_settings",
  wallet: "chainshield_wallet",
  activity: "chainshield_activity",
};

const scenarios = {
  low: { address: trustedAddress, amount: "0.15", token: "ETH", type: "trusted", approval: "none" },
  medium: { address: unknownAddress, amount: "1.4", token: "USDC", type: "unknown", approval: "limited" },
  high: { address: suspiciousAddress, amount: "0.6", token: "USDT", type: "suspicious", approval: "unlimited" },
  phishing: { address: suspiciousAddress, amount: "0.25", token: "ETH", type: "suspicious", approval: "limited" },
  approval: { address: suspiciousAddress, amount: "0", token: "AIRDROP", type: "suspicious", approval: "unlimited" },
  scam: { address: scamAddress, amount: "2.5", token: "AIRDROP", type: "scam", approval: "unlimited" },
};

const phishingRows = [
  { address: "0x123...8f90", type: "Phishing Wallet", risk: "High", phishing: true },
  { address: "0x456...12ab", type: "Fake Contract", risk: "High", phishing: true },
  { address: "0x789...45cd", type: "Scam Token", risk: "High", phishing: true },
  { address: "0x82F...24c1", type: "Trusted Wallet", risk: "Low", phishing: false },
];

const poisoningRows = [
  { date: "Jun 04", time: "09:21", title: "Normal Transaction", address: "0x82F1...24c1", detail: "Trusted address used before", scam: false },
  { date: "Jun 04", time: "09:37", title: "Scam Transaction", address: "0x82F1...24cI", detail: "Looks similar to trusted address", scam: true },
  { date: "Jun 03", time: "18:12", title: "Normal Transaction", address: "0x9C32...99AF", detail: "Known exchange wallet", scam: false },
  { date: "Jun 03", time: "18:19", title: "Scam Transaction", address: "0x9C32...99A7", detail: "Potential address poisoning", scam: true },
];

const defaultApprovals = [
  { contract: "USDT Approval", amount: "Unlimited", approvalType: "Unlimited", risk: "High", recommendation: "Revoke immediately." },
  { contract: "AIRDROP Approval", amount: "Unlimited", approvalType: "Unlimited", risk: "High", recommendation: "Revoke immediately." },
  { contract: "Uniswap Approval", amount: "Limited", approvalType: "Limited", risk: "Low", recommendation: "Keep if you still use this dApp." },
];

const defaultSettings = {
  settingApproval: true,
  settingReputation: true,
  settingPoisoning: true,
  settingSignature: true,
  settingPhishing: true,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const load = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let authMode = "login";
let approvals = load("chainshield_approvals", defaultApprovals);
let walletState = load(storageKeys.wallet, { connected: false });
let currentRisk = null;

const elements = {
  loginScreen: $("#loginScreen"),
  app: $("#app"),
  loginForm: $("#loginForm"),
  authTitle: $("#authTitle"),
  authSubmit: $("#authSubmit"),
  signupFields: $("#signupFields"),
  forgotFields: $("#forgotFields"),
  authSwitchText: $("#authSwitchText"),
  fullName: $("#fullName"),
  email: $("#email"),
  password: $("#password"),
  confirmPassword: $("#confirmPassword"),
  loginMessage: $("#loginMessage"),
  demoLogin: $("#demoLogin"),
  signupLink: $("#signupLink"),
  forgotLink: $("#forgotLink"),
  themeToggle: $("#themeToggle"),
  connectWallet: $("#connectWallet"),
  disconnectWallet: $("#disconnectWallet"),
  walletMenuButton: $("#walletMenuButton"),
  profileButton: $("#profileButton"),
  walletMenu: $("#walletMenu"),
  networkStatus: $("#networkStatus"),
  walletAddress: $("#walletAddress"),
  walletBalance: $("#walletBalance"),
  walletSummary: $("#walletSummary"),
  balanceText: $("#balanceText"),
  securityScore: $("#securityScore"),
  centerScore: $("#centerScore"),
  activeWarnings: $("#activeWarnings"),
  centerThreats: $("#centerThreats"),
  centerApprovals: $("#centerApprovals"),
  centerHidden: $("#centerHidden"),
  centerTransactionRisk: $("#centerTransactionRisk"),
  centerApprovalRisk: $("#centerApprovalRisk"),
  centerAddressRisk: $("#centerAddressRisk"),
  centerSignatureRisk: $("#centerSignatureRisk"),
  securityText: $("#securityText"),
  alertList: $("#alertList"),
  transactionForm: $("#transactionForm"),
  destination: $("#destination"),
  amount: $("#amount"),
  token: $("#token"),
  addressType: $("#addressType"),
  approvalType: $("#approvalType"),
  addressReputation: $("#addressReputation"),
  statusText: $("#statusText"),
  scoreRing: $("#scoreRing"),
  riskScore: $("#riskScore"),
  sendPreview: $("#sendPreview"),
  toPreview: $("#toPreview"),
  reputationPreview: $("#reputationPreview"),
  resultPreview: $("#resultPreview"),
  recommendationPreview: $("#recommendationPreview"),
  amountRisk: $("#amountRisk"),
  addressRisk: $("#addressRisk"),
  approvalRisk: $("#approvalRisk"),
  totalRisk: $("#totalRisk"),
  hidePhishing: $("#hidePhishing"),
  phishingHiddenText: $("#phishingHiddenText"),
  phishingList: $("#phishingList"),
  approvalGrid: $("#approvalGrid"),
  hidePoisoning: $("#hidePoisoning"),
  poisoningHiddenText: $("#poisoningHiddenText"),
  poisoningList: $("#poisoningList"),
  rejectSignature: $("#rejectSignature"),
  continueSignature: $("#continueSignature"),
  recommendations: $("#recommendations"),
  activityList: $("#activityList"),
  saveSettings: $("#saveSettings"),
  presentationMode: $("#presentationMode"),
  profileForm: $("#profileForm"),
  profileName: $("#profileName"),
  profileEmail: $("#profileEmail"),
  walletNickname: $("#walletNickname"),
  profilePicture: $("#profilePicture"),
  settingApproval: $("#settingApproval"),
  settingReputation: $("#settingReputation"),
  settingPoisoning: $("#settingPoisoning"),
  settingSignature: $("#settingSignature"),
  settingPhishing: $("#settingPhishing"),
  simulationModal: $("#simulationModal"),
  modalDate: $("#modalDate"),
  modalTime: $("#modalTime"),
  modalTxId: $("#modalTxId"),
  modalSend: $("#modalSend"),
  modalTo: $("#modalTo"),
  modalScore: $("#modalScore"),
  modalReputation: $("#modalReputation"),
  modalRecommendation: $("#modalRecommendation"),
  modalMessage: $("#modalMessage"),
  abortTransaction: $("#abortTransaction"),
  continueTransaction: $("#continueTransaction"),
  reviewModal: $("#reviewModal"),
  reviewContract: $("#reviewContract"),
  reviewAmount: $("#reviewAmount"),
  reviewType: $("#reviewType"),
  reviewRisk: $("#reviewRisk"),
  reviewRecommendation: $("#reviewRecommendation"),
  toast: $("#toast"),
};

function shortAddress(address) {
  if (!address || address === "Not Connected") return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function nowParts() {
  const now = new Date();
  return {
    date: now.toLocaleDateString([], { month: "short", day: "2-digit" }),
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function addActivity(action, detail) {
  const item = { ...nowParts(), action, detail };
  const list = [item, ...load(storageKeys.activity, [])].slice(0, 20);
  save(storageKeys.activity, list);
  renderActivity();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  setTimeout(() => elements.toast.classList.add("hidden"), 1800);
}

function riskClass(score) {
  if (score <= 30) return "safe";
  if (score <= 65) return "medium";
  return "high";
}

function recommendationFor(score, reputation, approval, token) {
  if (score >= 80) return "Abort transaction. Verify the contract from an official source.";
  if (approval === "unlimited") return `Revoke or reduce ${token} approval before signing.`;
  if (reputation === "Unknown") return "Proceed only after confirming the destination address.";
  return "Safe to proceed.";
}

function calculateRisk(input = {}) {
  const amount = Number(input.amount ?? elements.amount.value) || 0;
  const type = input.type ?? elements.addressType.value;
  const approval = input.approval ?? elements.approvalType.value;
  const token = input.token ?? elements.token.value;
  const address = input.address ?? elements.destination.value;
  const addressRiskMap = { trusted: 0, unknown: 20, suspicious: 45, scam: 65 };
  const approvalRiskMap = { none: 0, limited: 10, unlimited: 35 };
  const reputationMap = { trusted: "Trusted", unknown: "Unknown", suspicious: "Suspicious", scam: "Scam" };
  const amountRisk = amount < 0.5 ? 0 : Math.min(20, Math.floor(amount * 7) + 1);
  const addressRisk = addressRiskMap[type] ?? 0;
  const approvalRisk = approvalRiskMap[approval] ?? 0;
  const tokenRisk = token === "AIRDROP" ? 10 : 0;
  const score = Math.min(100, 15 + amountRisk + addressRisk + approvalRisk + tokenRisk);
  const reputation = type === "scam" ? "Reported Scam" : reputationMap[type];
  const status = score <= 30 ? "Safe" : score <= 65 ? "Proceed With Caution" : type === "scam" ? "Transaction Blocked" : "High Risk Warning";
  const result = score <= 30 ? "Safe To Proceed" : score <= 65 ? "Yellow Warning" : type === "scam" ? "Critical Warning" : "Red Warning";
  return {
    address,
    amount: String(amount),
    token,
    type,
    approval,
    score,
    status,
    result,
    reputation,
    recommendation: recommendationFor(score, reputation, approval, token),
    breakdown: { amountRisk, addressRisk, approvalRisk, tokenRisk, totalRisk: score },
  };
}

function warningCount(result) {
  if (!walletState.connected) return "--";
  let count = 0;
  if (result?.score > 65) count += 1;
  if (result?.approval === "unlimited") count += 1;
  if (["Suspicious", "Scam", "Reported Scam"].includes(result?.reputation)) count += 1;
  return String(count);
}

function renderWallet() {
  if (!walletState.connected) {
    elements.walletMenuButton.textContent = "Wallet Disconnected";
    elements.networkStatus.textContent = "Network --";
    elements.walletAddress.textContent = "Not Connected";
    elements.walletBalance.textContent = "--";
    elements.securityScore.textContent = "--";
    elements.activeWarnings.textContent = "--";
    elements.centerScore.textContent = "--";
    elements.centerThreats.textContent = "--";
    elements.walletSummary.textContent = "Connect a wallet to activate ChainShield monitoring.";
    elements.balanceText.textContent = "Waiting for wallet connection";
    elements.securityText.textContent = "Connect wallet to calculate score.";
    return;
  }
  const score = currentRisk ? Math.max(0, 100 - Math.round(currentRisk.score * 0.45)) : 82;
  elements.walletMenuButton.textContent = "Wallet Connected";
  elements.networkStatus.textContent = walletState.network || "Ethereum";
  elements.walletAddress.textContent = shortAddress(walletState.address);
  elements.walletBalance.textContent = walletState.balance || "10.00 ETH";
  elements.securityScore.textContent = score;
  elements.centerScore.textContent = score;
  elements.activeWarnings.textContent = warningCount(currentRisk);
  elements.centerThreats.textContent = elements.activeWarnings.textContent;
  elements.walletSummary.textContent = `${walletState.nickname || "Main wallet"} protected by ChainShield simulation.`;
  elements.balanceText.textContent = "Live demo wallet balance";
}

function applyRisk(result) {
  currentRisk = result;
  const cls = riskClass(result.score);
  elements.riskScore.textContent = result.score;
  elements.statusText.textContent = result.status;
  elements.sendPreview.textContent = `${Number(result.amount || 0).toFixed(3)} ${result.token}`;
  elements.toPreview.textContent = shortAddress(result.address);
  elements.reputationPreview.textContent = result.reputation;
  elements.resultPreview.textContent = result.result;
  elements.recommendationPreview.textContent = result.recommendation;
  elements.amountRisk.textContent = result.breakdown.amountRisk;
  elements.addressRisk.textContent = result.breakdown.addressRisk;
  elements.approvalRisk.textContent = result.breakdown.approvalRisk + result.breakdown.tokenRisk;
  elements.totalRisk.textContent = result.breakdown.totalRisk;
  elements.centerTransactionRisk.textContent = result.breakdown.amountRisk;
  elements.centerApprovalRisk.textContent = result.breakdown.approvalRisk + result.breakdown.tokenRisk;
  elements.centerAddressRisk.textContent = result.breakdown.addressRisk;
  elements.centerSignatureRisk.textContent = result.score > 65 ? 72 : 18;
  elements.securityText.textContent = result.score > 65 ? "High risk action blocked by default." : result.score > 30 ? "Review recommended before continuing." : "Wallet looks safe.";
  elements.scoreRing.style.background = `radial-gradient(circle at center, var(--surface) 0 58%, transparent 59%), conic-gradient(var(--${cls}) ${result.score * 3.6}deg, rgba(148, 163, 184, 0.18) 0deg)`;
  elements.addressReputation.textContent = result.reputation;
  elements.addressReputation.className = `badge ${cls}`;
  renderWallet();
  renderAlerts(result);
  renderRecommendations(result);
}

function renderAlerts(result) {
  const alerts = [];
  if (!walletState.connected) alerts.push({ title: "Wallet Disconnected", detail: "Connect wallet to activate live warnings.", cls: "medium", actions: false });
  if (result?.score > 65) alerts.push({ title: "Dangerous Approval Found", detail: `Risk score ${result.score}: ${result.recommendation}`, cls: "high", actions: true });
  if (["Suspicious", "Scam", "Reported Scam"].includes(result?.reputation)) alerts.push({ title: "Suspicious Address Detected", detail: `Address reputation: ${result.reputation}.`, cls: "high", actions: false });
  if (result?.token === "AIRDROP") alerts.push({ title: "Phishing Warning", detail: "Fake token or reward claim pattern detected.", cls: "medium", actions: false });
  if (!alerts.length) alerts.push({ title: "No Active Risk Warnings", detail: "This transaction appears safe.", cls: "safe", actions: false });
  elements.alertList.innerHTML = alerts.map((alert) => `
    <article class="alert-card ${alert.cls}">
      <div class="alert-icon">${alert.cls === "safe" ? "OK" : "!"}</div>
      <div>
        <strong>${alert.title}</strong>
        <p>${alert.detail}</p>
        ${alert.actions ? '<div class="actions"><button class="ghost-button alert-review" type="button">Review</button><button class="danger-button alert-revoke" type="button">Revoke</button></div>' : ""}
      </div>
    </article>
  `).join("");
  $$(".alert-review").forEach((button) => button.addEventListener("click", () => {
    openReview({ contract: result.token, amount: result.approval, approvalType: result.approval, risk: "High", recommendation: result.recommendation });
    addActivity("Approval Review", `${result.token} ${result.approval}`);
  }));
  $$(".alert-revoke").forEach((button) => button.addEventListener("click", () => {
    showToast("Approval Revoked Successfully");
    addActivity("Approval Revocation", `${result.token} approval revoked`);
  }));
}

function renderRecommendations(result) {
  const items = [];
  if (result?.score > 65) items.push(result.recommendation);
  if (result?.approval === "unlimited") items.push(`Revoke ${result.token} unlimited approval.`);
  if (["Suspicious", "Scam", "Reported Scam"].includes(result?.reputation)) items.push("Avoid suspicious contract.");
  items.push("Review connected dApps.");
  elements.recommendations.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function openSimulationModal(result) {
  const stamp = nowParts();
  elements.modalDate.textContent = stamp.date;
  elements.modalTime.textContent = stamp.time;
  elements.modalTxId.textContent = `tx-${Math.random().toString(16).slice(2, 10)}`;
  elements.modalSend.textContent = `${Number(result.amount || 0).toFixed(3)} ${result.token}`;
  elements.modalTo.textContent = shortAddress(result.address);
  elements.modalScore.textContent = result.score;
  elements.modalReputation.textContent = result.reputation;
  elements.modalRecommendation.textContent = result.recommendation;
  elements.modalMessage.textContent = result.score > 65 ? "Potential phishing or approval abuse detected." : "Review transaction details before signing.";
  elements.simulationModal.classList.remove("hidden");
}

function renderPhishing() {
  const hide = elements.hidePhishing.checked;
  const rows = hide ? phishingRows.filter((row) => !row.phishing) : phishingRows;
  const hidden = phishingRows.length - rows.length;
  elements.phishingHiddenText.textContent = hide ? `${hidden} phishing entries hidden` : "";
  elements.phishingList.innerHTML = rows.map((row) => `
    <article class="table-row">
      <strong>${row.address}</strong>
      <span>${row.type}</span>
      <span class="badge ${row.risk === "Low" ? "safe" : "high"}">${row.risk}</span>
    </article>
  `).join("");
  renderPoisoning();
}

function openReview(approval) {
  elements.reviewContract.textContent = approval.contract;
  elements.reviewAmount.textContent = approval.amount;
  elements.reviewType.textContent = approval.approvalType;
  elements.reviewRisk.textContent = approval.risk;
  elements.reviewRecommendation.textContent = `Recommendation: ${approval.recommendation}`;
  elements.reviewModal.classList.remove("hidden");
}

function renderApprovals() {
  const highCount = approvals.filter((approval) => approval.risk === "High").length;
  elements.centerApprovals.textContent = walletState.connected ? highCount : "--";
  elements.approvalGrid.innerHTML = approvals.map((approval, index) => `
    <article class="approval-card">
      <span class="badge ${approval.risk === "Low" ? "safe" : "high"}">${approval.risk}</span>
      <strong>${approval.contract}</strong>
      <p>${approval.approvalType} approval: ${approval.amount}</p>
      <div class="actions">
        <button class="ghost-button review-button" data-index="${index}" type="button">Review</button>
        <button class="danger-button revoke-button" data-index="${index}" type="button">Revoke</button>
      </div>
    </article>
  `).join("");
  $$(".review-button").forEach((button) => button.addEventListener("click", () => {
    const approval = approvals[Number(button.dataset.index)];
    openReview(approval);
    addActivity("Approval Review", approval.contract);
  }));
  $$(".revoke-button").forEach((button) => button.addEventListener("click", () => {
    const [approval] = approvals.splice(Number(button.dataset.index), 1);
    save("chainshield_approvals", approvals);
    renderApprovals();
    showToast("Approval Revoked Successfully");
    addActivity("Approval Revocation", approval.contract);
  }));
}

function renderPoisoning() {
  const hide = elements.hidePoisoning.checked;
  const rows = hide ? poisoningRows.filter((row) => !row.scam) : poisoningRows;
  const poisoningHidden = poisoningRows.length - rows.length;
  const phishingHidden = elements.hidePhishing.checked ? phishingRows.filter((row) => row.phishing).length : 0;
  elements.poisoningHiddenText.textContent = hide ? `${poisoningHidden} scam transactions hidden` : "";
  elements.centerHidden.textContent = walletState.connected ? poisoningHidden + phishingHidden : "--";
  elements.poisoningList.innerHTML = rows.map((row) => `
    <article class="table-row">
      <strong>${row.date} ${row.time}</strong>
      <span>${row.address}</span>
      <span class="badge ${row.scam ? "high" : "safe"}">${row.scam ? "Potential Scam" : "Normal"}</span>
    </article>
  `).join("");
}

function renderActivity() {
  const list = load(storageKeys.activity, []);
  elements.activityList.innerHTML = list.length ? list.map((item) => `
    <article class="table-row">
      <strong>${item.date} ${item.time}</strong>
      <span>${item.action}</span>
      <span>${item.detail}</span>
    </article>
  `).join("") : '<article class="table-row"><strong>No activity yet</strong><span>Actions will appear here.</span><span class="badge medium">Ready</span></article>';
}

function setAuthMode(mode) {
  authMode = mode;
  elements.signupFields.classList.toggle("hidden", mode !== "signup");
  elements.forgotFields.classList.toggle("hidden", mode !== "forgot");
  elements.password.parentElement.classList.toggle("hidden", mode === "forgot");
  elements.demoLogin.classList.toggle("hidden", mode !== "login");
  elements.authTitle.textContent = mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in";
  elements.authSubmit.textContent = mode === "signup" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : "Login";
  elements.authSwitchText.innerHTML = mode === "login"
    ? 'New here? <button class="text-button" id="signupLink" type="button">Sign Up</button>'
    : 'Already have an account? <button class="text-button" id="signupLink" type="button">Back to Login</button>';
  elements.signupLink = $("#signupLink");
  elements.signupLink.addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
  elements.loginMessage.textContent = "";
}

function enterApp(user) {
  save(storageKeys.session, user);
  elements.loginScreen.classList.add("hidden");
  elements.app.classList.remove("hidden");
  const profile = load(storageKeys.profile, { name: user.name || "Demo User", email: user.email, walletNickname: "Main wallet", profilePicture: "" });
  profile.email = profile.email || user.email;
  save(storageKeys.profile, profile);
  renderProfile();
  showToast(`Welcome, ${profile.name}`);
}

function handleAuth(event) {
  event.preventDefault();
  const email = elements.email.value.trim();
  const password = elements.password.value;
  const users = load(storageKeys.users, []);
  if (!email) {
    elements.loginMessage.textContent = "Email is required.";
    return;
  }
  if (authMode === "forgot") {
    elements.loginMessage.textContent = "Password reset request sent.";
    addActivity("Password Reset", email);
    return;
  }
  if (!password) {
    elements.loginMessage.textContent = "Password is required.";
    return;
  }
  if (authMode === "signup") {
    if (!elements.fullName.value.trim()) {
      elements.loginMessage.textContent = "Full name is required.";
      return;
    }
    if (password.length < 6) {
      elements.loginMessage.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (password !== elements.confirmPassword.value) {
      elements.loginMessage.textContent = "Passwords do not match.";
      return;
    }
    if (users.some((user) => user.email === email)) {
      elements.loginMessage.textContent = "Account already exists.";
      return;
    }
    users.push({ name: elements.fullName.value.trim(), email, password });
    save(storageKeys.users, users);
    elements.loginMessage.textContent = "Account created. Please log in.";
    setAuthMode("login");
    return;
  }
  const user = users.find((item) => item.email === email && item.password === password);
  if (!user) {
    elements.loginMessage.textContent = "Invalid email or password.";
    return;
  }
  enterApp(user);
  addActivity("Login", email);
}

function connectWallet() {
  walletState = {
    connected: true,
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    network: "Ethereum",
    balance: "10.00 ETH",
    nickname: load(storageKeys.profile, {}).walletNickname || "Main wallet",
  };
  save(storageKeys.wallet, walletState);
  elements.connectWallet.textContent = "Connected";
  renderWallet();
  renderApprovals();
  renderPoisoning();
  renderAlerts(currentRisk);
  renderRecommendations(currentRisk);
  showToast("Wallet connected");
  addActivity("Wallet Connection", shortAddress(walletState.address));
}

function disconnectWallet() {
  walletState = { connected: false };
  save(storageKeys.wallet, walletState);
  elements.connectWallet.textContent = "Connect Wallet";
  renderWallet();
  renderApprovals();
  renderPoisoning();
  renderAlerts(currentRisk);
  renderRecommendations(currentRisk);
  showToast("Wallet disconnected");
  addActivity("Wallet Disconnection", "Session cleared");
}

function renderSettings() {
  const settings = load(storageKeys.settings, defaultSettings);
  Object.entries(defaultSettings).forEach(([key]) => {
    elements[key].checked = settings[key] !== false;
  });
}

function saveSettings() {
  const settings = {};
  Object.entries(defaultSettings).forEach(([key]) => {
    settings[key] = elements[key].checked;
  });
  save(storageKeys.settings, settings);
  showToast("Settings saved");
  addActivity("Settings Updates", "Protection preferences saved");
}

function renderProfile() {
  const session = load(storageKeys.session, null);
  const profile = load(storageKeys.profile, { name: session?.name || "Demo User", email: session?.email || "demo@chainshield.local", walletNickname: "Main wallet", profilePicture: "" });
  elements.profileName.value = profile.name || "";
  elements.profileEmail.value = profile.email || "";
  elements.walletNickname.value = profile.walletNickname || "";
  elements.profilePicture.value = profile.profilePicture || "";
  elements.profileButton.textContent = (profile.name || "Demo User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function saveProfile(event) {
  event.preventDefault();
  const profile = {
    name: elements.profileName.value.trim() || "Demo User",
    email: elements.profileEmail.value.trim(),
    walletNickname: elements.walletNickname.value.trim() || "Main wallet",
    profilePicture: elements.profilePicture.value.trim(),
  };
  save(storageKeys.profile, profile);
  walletState.nickname = profile.walletNickname;
  save(storageKeys.wallet, walletState);
  renderProfile();
  renderWallet();
  showToast("Profile saved");
  addActivity("Profile Update", profile.name);
}

function applyScenario(name) {
  const scenario = scenarios[name];
  elements.destination.value = scenario.address;
  elements.amount.value = scenario.amount;
  elements.token.value = scenario.token;
  elements.addressType.value = scenario.type;
  elements.approvalType.value = scenario.approval;
  const result = calculateRisk(scenario);
  applyRisk(result);
  showToast(`${result.status}: score ${result.score}`);
  addActivity("Transaction Simulation", `${name} scenario score ${result.score}`);
  if (result.score > 65) openSimulationModal(result);
}

function toggleMenu() {
  elements.walletMenu.classList.toggle("hidden");
}

function boot() {
  const users = load(storageKeys.users, []);
  if (!users.some((user) => user.email === "demo@chainshield.local")) {
    users.push({ name: "Demo User", email: "demo@chainshield.local", password: "password" });
    save(storageKeys.users, users);
  }
  save(storageKeys.wallet, walletState);
  renderSettings();
  renderProfile();
  renderActivity();
  renderPhishing();
  renderApprovals();
  applyRisk(calculateRisk(scenarios.low));
  renderWallet();
}

elements.loginForm.addEventListener("submit", handleAuth);
elements.demoLogin.addEventListener("click", () => {
  enterApp({ name: "Demo User", email: "demo@chainshield.local" });
  addActivity("Login", "Demo Account");
});
elements.signupLink.addEventListener("click", () => setAuthMode("signup"));
elements.forgotLink.addEventListener("click", () => setAuthMode("forgot"));
elements.connectWallet.addEventListener("click", connectWallet);
elements.disconnectWallet.addEventListener("click", disconnectWallet);
elements.walletMenuButton.addEventListener("click", toggleMenu);
elements.profileButton.addEventListener("click", toggleMenu);
elements.walletMenu.querySelectorAll("[data-target]").forEach((button) => {
  button.addEventListener("click", () => {
    $(`#${button.dataset.target}`).scrollIntoView({ behavior: "smooth" });
    elements.walletMenu.classList.add("hidden");
  });
});
elements.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  elements.themeToggle.textContent = document.body.classList.contains("light") ? "Dark Mode" : "Light Mode";
});
elements.presentationMode.addEventListener("click", () => {
  document.body.classList.toggle("presentation");
  elements.presentationMode.textContent = document.body.classList.contains("presentation") ? "Exit Presentation" : "Presentation Mode";
});
elements.transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = calculateRisk();
  applyRisk(result);
  openSimulationModal(result);
  addActivity("Transaction Simulation", `${result.token} score ${result.score}`);
});
$$(".scenario").forEach((button) => button.addEventListener("click", () => applyScenario(button.dataset.scenario)));
elements.hidePhishing.addEventListener("change", () => {
  renderPhishing();
  addActivity("Phishing Protection", elements.hidePhishing.checked ? "Phishing entries hidden" : "Phishing entries visible");
});
elements.hidePoisoning.addEventListener("change", () => {
  renderPoisoning();
  addActivity("Address Poisoning", elements.hidePoisoning.checked ? "Scam entries hidden" : "Scam entries visible");
});
elements.saveSettings.addEventListener("click", saveSettings);
elements.profileForm.addEventListener("submit", saveProfile);
elements.abortTransaction.addEventListener("click", () => {
  elements.simulationModal.classList.add("hidden");
  elements.resultPreview.textContent = "Transaction Aborted";
  showToast("Transaction aborted");
  addActivity("Transaction Decision", "Aborted");
});
elements.continueTransaction.addEventListener("click", () => {
  elements.simulationModal.classList.add("hidden");
  elements.resultPreview.textContent = "Continued by user";
  showToast("Transaction continued");
  addActivity("Transaction Decision", "Continued anyway");
});
elements.rejectSignature.addEventListener("click", () => {
  showToast("Signature rejected");
  addActivity("Signature Decisions", "Rejected BAYC #1234 signature");
});
elements.continueSignature.addEventListener("click", () => {
  showToast("Signature continued by user");
  addActivity("Signature Decisions", "Continued high risk signature");
});
$$(".close-review").forEach((button) => button.addEventListener("click", () => elements.reviewModal.classList.add("hidden")));
[elements.simulationModal, elements.reviewModal].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.add("hidden");
  });
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".topbar")) elements.walletMenu.classList.add("hidden");
});

boot();
