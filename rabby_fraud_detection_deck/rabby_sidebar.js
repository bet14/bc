/* ============================================================
   Rabby Fraud Detection — shared sidebar navigation
   Injects a collapsible nav listing every section of the deck.
   Add new pages by editing RB_NAV below — every page picks
   up the change automatically.
   ============================================================ */
(function () {
  var RB_NAV = [
    { label: 'Overview', href: 'rabby_overview_slide.html' },
    { group: 'How It Works', items: [
      { label: '5-Layer Detection Pipeline', href: '5-layer-detection-with-demo-2.html' },
      { label: 'Rules Engine', href: 'rabby_rule_engine_with_demo.html' }
    ]},
    { group: 'Core Features', items: [
      { label: 'Pre-Sign Transaction Simulation', href: 'rabby_placeholder_tx_simulation.html', soon: true },
      { label: 'Approval Risk Alerts', href: 'rabby_approval_alerts_feature.html' },
      { label: 'Phishing & Malicious Site Detection', href: 'rabby_placeholder_phishing_detection.html', soon: true },
      { label: 'Address Poisoning Filtering', href: 'rabby_placeholder_address_labels.html', soon: true },
      { label: 'Signature Risk Explanations', href: 'rabby_placeholder_signature_risk.html' }
    ]},
    { label: 'Wallet Comparison', href: 'rabby_placeholder_wallet_comparison.html' },
    { label: 'Proof of Concept', href: 'wallet_demo/frontend/index.html' },
    { label: 'Conclusion', href: 'rabby_placeholder_conclusion.html' },
    { label: 'References', href: 'rabby_placeholder_references.html' }
  ];

  function currentFile() {
    var p = window.location.pathname;
    return decodeURIComponent(p.substring(p.lastIndexOf('/') + 1)) || '';
  }

  function buildLink(item) {
    var a = document.createElement('a');
    a.className = 'rb-link' + (item.sub ? ' rb-sub-link' : '') + (item.soon ? ' rb-soon' : '');
    a.href = item.href;
    a.innerHTML = item.label + (item.soon ? ' <span class="rb-soon-tag">soon</span>' : '');
    if (item.href === currentFile()) a.classList.add('active');
    return a;
  }

  function buildNav(nav) {
    RB_NAV.forEach(function (entry) {
      if (entry.group) {
        var t = document.createElement('div');
        t.className = 'rb-group-title';
        t.textContent = entry.group;
        nav.appendChild(t);
        entry.items.forEach(function (item) {
          nav.appendChild(buildLink(Object.assign({ sub: true }, item)));
        });
      } else {
        nav.appendChild(buildLink(entry));
      }
    });
  }

  function setCollapsed(collapsed) {
    var sidebar = document.getElementById('rb-sidebar');
    var toggle = document.getElementById('rb-toggle');
    var bars = document.querySelectorAll('.rb-shifted-bar');
    var mains = document.querySelectorAll('.rb-shifted-main');

    sidebar.classList.toggle('collapsed', collapsed);
    toggle.classList.toggle('rb-toggle-shifted', !collapsed);
    toggle.textContent = collapsed ? '☰' : '✕';
    toggle.title = collapsed ? 'Show navigation' : 'Hide navigation';

    bars.forEach(function (el) { el.classList.toggle('rb-collapsed-bar', collapsed); });
    mains.forEach(function (el) { el.classList.toggle('rb-collapsed-main', collapsed); });

    try { localStorage.setItem('rb-sidebar-collapsed', collapsed ? '1' : '0'); } catch (e) {}
  }

  function init() {
    var sidebar = document.createElement('div');
    sidebar.id = 'rb-sidebar';

    var head = document.createElement('div');
    head.className = 'rb-head';
    head.innerHTML =
      '<div><div class="rb-title">Rabby Fraud Detection</div>' +
      '<div class="rb-sub">Deep-dive sessions</div></div>';
    sidebar.appendChild(head);

    var nav = document.createElement('nav');
    buildNav(nav);
    sidebar.appendChild(nav);

    var toggle = document.createElement('button');
    toggle.id = 'rb-toggle';
    toggle.type = 'button';

    document.body.appendChild(sidebar);
    document.body.appendChild(toggle);

    // Mark the host page's top bar / main wrapper so CSS can shift them.
    ['topbar', 'main'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add(id === 'topbar' ? 'rb-shifted-bar' : 'rb-shifted-main');
    });

    var startCollapsed = false;
    try { startCollapsed = localStorage.getItem('rb-sidebar-collapsed') === '1'; } catch (e) {}
    // Default to collapsed on narrow viewports so the deck isn't cramped.
    if (window.innerWidth < 880 && localStorage.getItem('rb-sidebar-collapsed') === null) {
      startCollapsed = true;
    }
    setCollapsed(startCollapsed);

    toggle.addEventListener('click', function () {
      setCollapsed(!sidebar.classList.contains('collapsed'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
