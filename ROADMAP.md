# Roadmap

## Phase 1 – Frontend polish (current)
- [x] Build React + Vite shell with dark theme and gradients.
- [x] Guided wizard (identity, region, protocol, review/connect).
- [x] Interactive map with animated tunnel arcs and legend.
- [x] Simulated metrics panel and diagnostics stub.
- [x] Personalization controls (accent, animation speed).
- [x] Docker-only dev + prod images.
- [x] Contrast tuning for dark backgrounds.
- [x] Target-aware map animation and basic Playwright visual smoke test.

## Phase 2 – Data & content
- [x] Local persistence of wizard/theme/AWS fields (browser storage for demos).
- [x] Config preview snippets (AWS Client VPN / IPsec runbook / sidecar notes / WireGuard).
- [ ] Replace static region/protocol lists with provider-fed data.
- [ ] Add glossary expansions and inline tooltips tied to steps.
- [ ] AWS metadata fetch: Client VPN endpoints, Site-to-Site/TGW associations, SGs, route tables (stubbed today).
- [ ] AWS export: generate OpenVPN profiles for Client VPN and IPsec runbooks for Site-to-Site (download-ready).

## Phase 3 – Backend integration
- [ ] Wire real telemetry from WireGuard/OpenVPN daemons to metrics panel.
- [ ] Config generation/download (wg-quick, .ovpn) from wizard inputs.
- [ ] Basic auth/key storage strategy (env-backed secrets, no plaintext logging).
- [ ] Troubleshooting checks: MTU probe, DNS leak test, port reachability.
- [ ] AWS checks: SG/ACL reachability, TGW propagation, split-tunnel flags, CloudWatch metrics feed.

## Phase 4 – Sharing & education
- [ ] Export/share flows as PDFs or slide snippets with screenshots.
- [ ] Interactive lessons/quizzes on VPN concepts.
- [ ] Community sharing for custom configurations and visualizations.
