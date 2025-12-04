# Design & Architecture

## Purpose
- Explain VPN concepts visually and in plain language.
- Guide non-technical users through selecting region, protocol, and credentials with minimal inputs.
- Show real-time status (latency/throughput/loss) and troubleshooting hints without exposing sensitive data.

## UX pillars
- **Guided wizard:** four steps (Identity → Region → Protocol → Review/Launch) keep users oriented.
- **Interactive network map:** SVG arcs animate the path (device → gateway → internet) with tooltips and live status badge.
- **Protocol coach:** cards summarize speed/security/compatibility with plain-language trade-offs.
- **Personalization:** accent color + animation speed controls so presenters can tailor demos.
- **Help everywhere:** glossary and troubleshooting snippets embedded near the flow.

## Component layout (src/App.tsx)
- `Wizard` handles step navigation and collects inputs (name, auth method, region, protocol).
- `Deployment target` selector supports Custom, AWS Client VPN, AWS Site-to-Site, and AWS Sidecar patterns with VPC/subnet/SG/CIDR callouts.
- `ProtocolSelector` shows protocol cards; reused in wizard and sidebar.
- `NetworkMap` renders SVG nodes/arcs with animated gradients and legend, always animating for previews; node labels, target/protocol badges, per-target line styles, and packet patterns vary by target.
- `MetricsPanel` simulates live metrics post-connect; telemetry profile changes per target (custom vs AWS).
- `ConfigPreview` emits copy-ready snippets (OpenVPN for Client VPN, IPsec runbook, sidecar notes, WireGuard).
- `CustomizationPanel` adjusts CSS variables for accent color and animation speed.
- `Troubleshoot` + `HelpPanel` provide quick diagnostics and glossary.

## State & data
- Local React state holds wizard selections, connection status, and simulated metrics.
- Protocol/region catalogs are static arrays for now (seed for future API-driven lists).
- AWS catalog stub (`src/awsData.ts`) provides sample Client VPN, Site-to-Site, and sidecar metadata; auto-fills VPC/subnet/SG/CIDR when target/region changes.
- Metrics update on an interval only when “connected” to mimic live telemetry.
- Accent + animation speed update CSS variables to keep styling centralized.
- Settings persist in `localStorage` (target, region, protocol, AWS fields, theme).

## Styling
- Theme defined in `src/index.css`; component-level layout/animation in `src/App.css`.
- Gradient panels, pulsating arcs, and dot indicators emphasize “live tunnel” feel.
- Contrast tuned (lighter base text/muted values) to avoid near-black text on dark backgrounds.
- Responsive grid adapts panels for tablet/mobile; map/legend stack on narrow widths.

## Build & runtime
- Frontend: React + Vite + TypeScript.
- Containerized dev: `docker-compose` runs Vite dev server with mounted workspace and node_modules volume.
- Production: multi-stage `Dockerfile` builds static assets then serves with Nginx.

## Security considerations (future)
- Keep credentials client-side until a secure backend exists; avoid logging sensitive input.
- When adding backend: store secrets securely, enforce TLS, validate configs, and avoid persisting raw keys.
- Provide clear warnings for insecure protocol/port choices and DNS leak checks.
- Export/share configs as files or QR codes for mobile onboarding.

## Future integration points
- AWS: pull Client VPN/Site-to-Site endpoint metadata, validate SG/route table wiring, and generate OpenVPN/IPsec configs for download.
- Fetch provider/server catalogs via API and drive region cards dynamically.
- Replace simulated metrics with telemetry from VPN daemons (WireGuard/OpenVPN) or CloudWatch for AWS VPNs.
- Add diagnostics that run real checks (MTU discovery, DNS leak test, port reachability).
- Export/share configs as files or QR codes for mobile onboarding.
- Partner/hospital site-to-site: include presets and diagrams for vendor ↔ hospital tunnels with scoped CIDRs and no public ingress.
