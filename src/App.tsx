import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { pickAwsDefaults } from './awsData'
import type { DeploymentTargetId } from './types'

type Protocol = {
  id: string
  name: string
  summary: string
  description: string
  speed: string
  security: string
  compatibility: string
  ports: string
  bestFor: string
}

type Region = {
  id: string
  name: string
  latency: number
  load: number
  country: string
  awsRegion: string
}

type Metrics = {
  latency: number
  throughput: number
  loss: number
}

type DeploymentTarget = {
  id: DeploymentTargetId
  name: string
  summary: string
  notes: string
}


const protocolCatalog: Protocol[] = [
  {
    id: 'wireguard',
    name: 'WireGuard',
    summary: 'Modern, lean tunneling with rapid handshakes.',
    description:
      'Built on ChaCha20 and Curve25519. Low overhead and quick roaming make it ideal for laptops and mobile devices.',
    speed: 'Ultra-fast',
    security: 'ChaCha20-Poly1305, Curve25519, PFS',
    compatibility: 'Windows, macOS, Linux, iOS, Android, routers',
    ports: 'UDP 51820',
    bestFor: 'Remote work, streaming, mobile roaming',
  },
  {
    id: 'openvpn',
    name: 'OpenVPN',
    summary: 'Battle-tested standard with deep configurability.',
    description:
      'Runs over TCP or UDP and can masquerade as HTTPS on port 443. Great when you need compatibility and resilience.',
    speed: 'Balanced',
    security: 'AES-256-GCM, RSA/ECDSA, TLS-based control channel',
    compatibility: 'Every major OS and network appliance',
    ports: 'TCP/UDP 1194 or 443',
    bestFor: 'Restrictive networks, cross-platform fleets',
  },
  {
    id: 'ikev2',
    name: 'IKEv2/IPsec',
    summary: 'Stable on the move with automatic re-keying.',
    description:
      'Pairs the IKEv2 key exchange with IPsec encryption. Strong choice for mobile devices that change networks.',
    speed: 'Fast',
    security: 'AES-GCM suites, MOBIKE mobility, certificate-based',
    compatibility: 'Windows, macOS, iOS, some Android builds',
    ports: 'UDP 500 / 4500',
    bestFor: 'Phones, tablets, quick failover',
  },
  {
    id: 'aws-client-vpn',
    name: 'AWS Client VPN (OpenVPN)',
    summary: 'Managed AWS endpoint for user/device access.',
    description:
      'AWS-managed OpenVPN service. Integrates with VPC subnets, security groups, and directory/SSO options.',
    speed: 'Balanced',
    security: 'AES-256-GCM, cert or SSO auth via IAM/AD',
    compatibility: 'OpenVPN clients; works with AWS CLI/SSO flows',
    ports: 'UDP/TCP 443',
    bestFor: 'Hybrid remote access with AWS identity',
  },
  {
    id: 'aws-site-to-site',
    name: 'AWS Site-to-Site (IPsec)',
    summary: 'Attach on-prem to AWS VPC/TGW with IPsec.',
    description:
      'Traditional IPsec tunnel for connecting data centers to AWS VPCs or Transit Gateways. High-availability via multi-AZ endpoints.',
    speed: 'Balanced',
    security: 'IPsec (AES-GCM), BGP/route-based',
    compatibility: 'Routers/firewalls supporting IPsec+BGP',
    ports: 'UDP 500 / 4500',
    bestFor: 'Branch/VPC interconnects and sidecars',
  },
]

const regionOptions: Region[] = [
  {
    id: 'nyc',
    name: 'New York',
    latency: 32,
    load: 0.35,
    country: 'United States',
    awsRegion: 'us-east-1',
  },
  {
    id: 'ams',
    name: 'Amsterdam',
    latency: 58,
    load: 0.42,
    country: 'Netherlands',
    awsRegion: 'eu-west-1',
  },
  {
    id: 'sin',
    name: 'Singapore',
    latency: 183,
    load: 0.51,
    country: 'Singapore',
    awsRegion: 'ap-southeast-1',
  },
  {
    id: 'syd',
    name: 'Sydney',
    latency: 212,
    load: 0.38,
    country: 'Australia',
    awsRegion: 'ap-southeast-2',
  },
  {
    id: 'sao',
    name: 'São Paulo',
    latency: 145,
    load: 0.46,
    country: 'Brazil',
    awsRegion: 'sa-east-1',
  },
]

const deploymentTargets: DeploymentTarget[] = [
  {
    id: 'custom',
    name: 'Custom / on-prem',
    summary: 'Self-hosted VPN gateways on metal or cloud instances.',
    notes: 'Use when managing your own WireGuard/OpenVPN fleet.',
  },
  {
    id: 'aws-client-vpn',
    name: 'AWS Client VPN',
    summary: 'AWS-managed OpenVPN endpoint for workforce access.',
    notes: 'Attach to subnets and security groups; supports SSO/AD and split tunneling.',
  },
  {
    id: 'aws-site-to-site',
    name: 'AWS Site-to-Site',
    summary: 'IPsec tunnels for VPC/TGW connectivity.',
    notes: 'Great for Navina sidecars or hybrid branch links.',
  },
  {
    id: 'aws-sidecar',
    name: 'AWS Sidecar',
    summary: 'Service-to-service tunnels riding alongside apps.',
    notes: 'Place sidecar with ECS/EKS tasks; route via VPC endpoints.',
  },
]

const glossary = [
  { term: 'Tunnel', def: 'An encrypted path your traffic travels through to the VPN gateway.' },
  { term: 'Handshake', def: 'How two peers authenticate and agree on keys before data flows.' },
  { term: 'MTU', def: 'Maximum packet size. Lowering it can fix stalls on some networks.' },
  { term: 'Kill switch', def: 'Blocks traffic if the VPN drops, preventing leaks.' },
  { term: 'DNS leak', def: 'When DNS requests bypass the tunnel. Prevent with VPN DNS servers.' },
]

const wizardSteps = [
  { id: 'identity', title: 'Identity', detail: 'Name the tunnel and set how you sign in.' },
  { id: 'region', title: 'Region', detail: 'Choose a gateway close to your users.' },
  { id: 'protocol', title: 'Protocol', detail: 'Pick the balance of speed and security.' },
  { id: 'review', title: 'Review & launch', detail: 'Visualize the route, then connect.' },
]

const telemetryProfiles: Record<DeploymentTargetId, Metrics> = {
  custom: { latency: 52, throughput: 180, loss: 0.28 },
  'aws-client-vpn': { latency: 38, throughput: 215, loss: 0.18 },
  'aws-site-to-site': { latency: 42, throughput: 260, loss: 0.12 },
  'aws-sidecar': { latency: 32, throughput: 240, loss: 0.14 },
}

const STORAGE_KEY = 'vpn-visualizer-settings'

function App() {
  const [connectionName, setConnectionName] = useState('Training Lab Tunnel')
  const [authMethod, setAuthMethod] = useState<'credentials' | 'keys'>('credentials')
  const [username, setUsername] = useState('analyst')
  const [deploymentTarget, setDeploymentTarget] = useState<DeploymentTargetId>('aws-client-vpn')
  const [awsVpcId, setAwsVpcId] = useState('vpc-0abc1234')
  const [awsSubnet, setAwsSubnet] = useState('subnet-0ff45e2a')
  const [awsSecurityGroup, setAwsSecurityGroup] = useState('sg-0d931ac1')
  const [awsCidr, setAwsCidr] = useState('10.20.0.0/16')
  const [selectedRegion, setSelectedRegion] = useState('ams')
  const [selectedProtocol, setSelectedProtocol] = useState('wireguard')
  const [activeStep, setActiveStep] = useState(0)
  const [importedConfig, setImportedConfig] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [metrics, setMetrics] = useState<Metrics>(telemetryProfiles['aws-client-vpn'])
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [accent, setAccent] = useState('#7cf6d2')
  const [animationSpeed, setAnimationSpeed] = useState(1.4)
  const [protocolsExpanded, setProtocolsExpanded] = useState(false)
  const prevTargetRef = useRef<DeploymentTargetId>(deploymentTarget)
  const prevRegionRef = useRef<string>(selectedRegion)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (typeof parsed.connectionName === 'string') setConnectionName(parsed.connectionName)
      if (parsed.authMethod === 'credentials' || parsed.authMethod === 'keys')
        setAuthMethod(parsed.authMethod)
      if (
        parsed.deploymentTarget === 'custom' ||
        parsed.deploymentTarget === 'aws-client-vpn' ||
        parsed.deploymentTarget === 'aws-site-to-site' ||
        parsed.deploymentTarget === 'aws-sidecar'
      )
        setDeploymentTarget(parsed.deploymentTarget)
      if (typeof parsed.username === 'string') setUsername(parsed.username)
      if (typeof parsed.selectedRegion === 'string') setSelectedRegion(parsed.selectedRegion)
      if (typeof parsed.selectedProtocol === 'string') setSelectedProtocol(parsed.selectedProtocol)
      if (typeof parsed.accent === 'string') setAccent(parsed.accent)
      if (typeof parsed.animationSpeed === 'number') setAnimationSpeed(parsed.animationSpeed)
      if (typeof parsed.awsVpcId === 'string') setAwsVpcId(parsed.awsVpcId)
      if (typeof parsed.awsSubnet === 'string') setAwsSubnet(parsed.awsSubnet)
      if (typeof parsed.awsSecurityGroup === 'string') setAwsSecurityGroup(parsed.awsSecurityGroup)
      if (typeof parsed.awsCidr === 'string') setAwsCidr(parsed.awsCidr)
    } catch (error) {
      console.warn('Unable to load saved settings', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload = {
      connectionName,
      authMethod,
      deploymentTarget,
      username,
      selectedRegion,
      selectedProtocol,
      accent,
      animationSpeed,
      awsVpcId,
      awsSubnet,
      awsSecurityGroup,
      awsCidr,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    connectionName,
    authMethod,
    deploymentTarget,
    username,
    selectedRegion,
    selectedProtocol,
    accent,
    animationSpeed,
    awsVpcId,
    awsSubnet,
    awsSecurityGroup,
    awsCidr,
  ])

  const selectedProtocolInfo = useMemo(
    () => protocolCatalog.find((p) => p.id === selectedProtocol) ?? protocolCatalog[0],
    [selectedProtocol],
  )

  const selectedTargetInfo = useMemo(
    () => deploymentTargets.find((t) => t.id === deploymentTarget) ?? deploymentTargets[0],
    [deploymentTarget],
  )

  const selectedRegionInfo = useMemo(
    () => regionOptions.find((r) => r.id === selectedRegion) ?? regionOptions[0],
    [selectedRegion],
  )

  const telemetrySource =
    deploymentTarget === 'custom' ? 'Simulated local agent' : 'Simulated AWS CloudWatch'

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--pulse-speed', `${animationSpeed}s`)
  }, [accent, animationSpeed])

  useEffect(() => {
    const targetChanged = prevTargetRef.current !== deploymentTarget
    const regionChanged = prevRegionRef.current !== selectedRegion

    if (deploymentTarget !== 'custom') {
      const defaults = pickAwsDefaults(deploymentTarget, selectedRegionInfo.awsRegion)
      if (defaults && (targetChanged || regionChanged)) {
        if ('vpcId' in defaults && defaults.vpcId) setAwsVpcId(defaults.vpcId)
        if ('subnetId' in defaults && defaults.subnetId) setAwsSubnet(defaults.subnetId)
        if ('securityGroupId' in defaults && defaults.securityGroupId)
          setAwsSecurityGroup(defaults.securityGroupId)
        if ('cidr' in defaults && defaults.cidr) setAwsCidr(defaults.cidr)
        if ('tunnelCidr' in defaults && defaults.tunnelCidr) setAwsCidr(defaults.tunnelCidr)
      }
    }
    prevTargetRef.current = deploymentTarget
    prevRegionRef.current = selectedRegion
  }, [deploymentTarget, selectedRegion, selectedRegionInfo])

  useEffect(() => {
    if (!isConnected) return

    const interval = window.setInterval(() => {
      const profile = telemetryProfiles[deploymentTarget]
      setMetrics(() => ({
        latency: Math.max(
          12,
          profile.latency + (Math.random() - 0.5) * 10 + (Math.random() - 0.5) * 2,
        ),
        throughput: Math.max(
          90,
          profile.throughput + (Math.random() - 0.5) * 30 + (Math.random() - 0.5) * 10,
        ),
        loss: Math.max(
          0,
          Math.min(1.4, profile.loss + (Math.random() - 0.5) * 0.25),
        ),
      }))
    }, 1400)

    return () => clearInterval(interval)
  }, [isConnected, deploymentTarget])

  useEffect(() => {
    setMetrics(telemetryProfiles[deploymentTarget])
  }, [deploymentTarget])

  const handleConnect = () => {
    setActiveStep(wizardSteps.length - 1)
    setImportedConfig(false)
    setIsConnected(true)
    const base = [
      '✅ Key exchange succeeded (Curve25519) in 63ms.',
      '✅ Gateway responds over UDP 51820.',
      '✅ VPN DNS reachable, no leaks detected.',
      'ℹ️ Suggested MTU 1420 for this path.',
    ]
    const awsExtras =
      deploymentTarget === 'aws-client-vpn'
        ? [
            `✅ VPC ${awsVpcId} attached; SG ${awsSecurityGroup} allows 443.`,
            `ℹ️ Subnet ${awsSubnet} advertises ${awsCidr} with split tunnel enabled.`,
          ]
        : deploymentTarget === 'aws-site-to-site'
          ? [
              `✅ IPsec phase 1/2 established; CIDR ${awsCidr} routed.`,
              `ℹ️ BGP neighbor up on ${selectedRegionInfo.name}; check TGW propagation.`,
            ]
          : deploymentTarget === 'aws-sidecar'
            ? [
                '✅ Sidecar ready for ECS/EKS task attachment.',
                'ℹ️ Ensure ENI has SGs permitting app→sidecar traffic.',
              ]
            : []
    setDiagnostics([...awsExtras, ...base])
  }

  const handleImport = () => {
    setImportedConfig(true)
    setActiveStep(wizardSteps.length - 1)
    setIsConnected(false)
    setDiagnostics(['Imported config ready. Validate keys before connecting.'])
  }

  const runTroubleshoot = () => {
    const base = [
      '✅ Auth endpoint reachable.',
      '✅ Certificate chain valid.',
      '⚠️ High latency upstream (212ms). Consider closer region.',
      '⚠️ UDP 1194 blocked by firewall. Try TCP/443 fallback.',
    ]
    const awsSpecific =
      deploymentTarget === 'aws-client-vpn'
        ? [
            '⚠️ Verify SG allows 443 from clients to endpoint.',
            'ℹ️ Ensure split tunnel matches advertised routes.',
            'ℹ️ Directory/SSO mapping required for user auth.',
          ]
        : deploymentTarget === 'aws-site-to-site'
          ? [
              '⚠️ Confirm IPsec policy matches customer gateway (phase 1/2).',
              'ℹ️ Check BGP routes propagated to TGW/VPC route tables.',
            ]
          : deploymentTarget === 'aws-sidecar'
            ? [
                '⚠️ Confirm sidecar ENI has correct SGs for app egress.',
                'ℹ️ Ensure task IAM role allows CreateNetworkInterface if needed.',
              ]
            : []
    setDiagnostics([...awsSpecific, ...base])
  }

  const heroSubtitle = importedConfig
    ? 'Config imported. Review settings, then visualize the route before you connect.'
    : 'Guide non-technical teammates through VPN setup with visuals, not jargon.'

  return (
    <div className="page">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <header className="hero">
        <div className="hero__text">
          <p className="eyebrow">VPN Visualizer</p>
          <h1>
            Explain, configure, and launch VPN tunnels with clarity and live visuals.
          </h1>
          <p className="lede">{heroSubtitle}</p>
          <div className="cta-row">
            <button className="cta primary" onClick={() => setActiveStep(0)}>
              Create a new VPN connection
            </button>
            <button className="cta ghost" onClick={handleImport}>
              Import existing config
            </button>
          </div>
          <div className="hero__meta">
            <span>Visual tutorial</span>
            <span>Protocol coach</span>
            <span>Live metrics</span>
            <span>Documentation-ready</span>
          </div>
        </div>
        <div className="hero__card">
          <h3>Quick preview</h3>
          <p className="muted">Pick a region, choose a protocol, and watch the tunnel animate.</p>
          <div className="mini-map">
            <span className="node node-local">You</span>
            <span className="node node-gateway">{selectedRegionInfo.name}</span>
            <span className="node node-internet">Web</span>
            <div className="path path-primary" />
            <div className="path path-secondary" />
          </div>
          <div className="pill-row">
            <span className="pill">Protocol · {selectedProtocolInfo.name}</span>
            <span className="pill">Region · {selectedRegionInfo.name}</span>
            <span className="pill">Target · {selectedTargetInfo.name}</span>
            <span className="pill">Status · {isConnected ? 'Connected' : 'Ready'}</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel panel-wide">
          <Wizard
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            connectionName={connectionName}
            setConnectionName={setConnectionName}
            authMethod={authMethod}
            setAuthMethod={setAuthMethod}
            deploymentTarget={deploymentTarget}
            setDeploymentTarget={setDeploymentTarget}
            selectedTargetInfo={selectedTargetInfo}
            awsVpcId={awsVpcId}
            setAwsVpcId={setAwsVpcId}
            awsSubnet={awsSubnet}
            setAwsSubnet={setAwsSubnet}
            awsSecurityGroup={awsSecurityGroup}
            setAwsSecurityGroup={setAwsSecurityGroup}
            awsCidr={awsCidr}
            setAwsCidr={setAwsCidr}
            username={username}
            setUsername={setUsername}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            selectedProtocol={selectedProtocol}
          setSelectedProtocol={setSelectedProtocol}
          selectedProtocolInfo={selectedProtocolInfo}
          selectedRegionInfo={selectedRegionInfo}
          onConnect={handleConnect}
        />
      </section>

        <section className="panel panel-map">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Interactive network map</p>
          <h3>Visualize the tunnel and traffic path</h3>
          <p className="muted">
            Animated arcs show how your device reaches {selectedRegionInfo.name} before
            hitting the open internet. Target/protocol change the palette and packet animation.
          </p>
        </div>
        <div className="status">
          <span className={`dot ${isConnected ? 'dot-live' : ''}`} />
          {isConnected ? 'Connected' : 'Not connected'}
            </div>
          </div>
          <NetworkMap
            connected={isConnected}
            region={selectedRegionInfo}
            protocol={selectedProtocolInfo}
            animationSpeed={animationSpeed}
            deploymentTarget={deploymentTarget}
          />
        </section>

        <section className="panel panel-side">
          <ProtocolPanel
            protocols={protocolCatalog}
            selectedProtocol={selectedProtocol}
            setSelectedProtocol={setSelectedProtocol}
            expanded={protocolsExpanded}
            setExpanded={setProtocolsExpanded}
          />
          <MetricsPanel
            metrics={metrics}
            protocol={selectedProtocolInfo}
            connected={isConnected}
            telemetrySource={telemetrySource}
          />
          <CustomizationPanel
            accent={accent}
            setAccent={setAccent}
            animationSpeed={animationSpeed}
            setAnimationSpeed={setAnimationSpeed}
          />
        </section>

        <section className="panel panel-support">
          <ConfigPreview
            deploymentTarget={deploymentTarget}
            region={selectedRegionInfo}
            protocol={selectedProtocolInfo}
            awsVpcId={awsVpcId}
            awsSubnet={awsSubnet}
            awsSecurityGroup={awsSecurityGroup}
            awsCidr={awsCidr}
          />
          <Troubleshoot diagnostics={diagnostics} onRun={runTroubleshoot} />
          <HelpPanel />
        </section>
      </main>
    </div>
  )
}

type WizardProps = {
  activeStep: number
  setActiveStep: (step: number) => void
  connectionName: string
  setConnectionName: (value: string) => void
  authMethod: 'credentials' | 'keys'
  setAuthMethod: (value: 'credentials' | 'keys') => void
  deploymentTarget: DeploymentTargetId
  setDeploymentTarget: (value: DeploymentTargetId) => void
  selectedTargetInfo: DeploymentTarget
  awsVpcId: string
  setAwsVpcId: (value: string) => void
  awsSubnet: string
  setAwsSubnet: (value: string) => void
  awsSecurityGroup: string
  setAwsSecurityGroup: (value: string) => void
  awsCidr: string
  setAwsCidr: (value: string) => void
  username: string
  setUsername: (value: string) => void
  selectedRegion: string
  setSelectedRegion: (value: string) => void
  selectedProtocol: string
  setSelectedProtocol: (value: string) => void
  selectedProtocolInfo: Protocol
  selectedRegionInfo: Region
  onConnect: () => void
}

function Wizard({
  activeStep,
  setActiveStep,
  connectionName,
  setConnectionName,
  authMethod,
  setAuthMethod,
  deploymentTarget,
  setDeploymentTarget,
  selectedTargetInfo,
  awsVpcId,
  setAwsVpcId,
  awsSubnet,
  setAwsSubnet,
  awsSecurityGroup,
  setAwsSecurityGroup,
  awsCidr,
  setAwsCidr,
  username,
  setUsername,
  selectedRegion,
  setSelectedRegion,
  selectedProtocol,
  setSelectedProtocol,
  selectedProtocolInfo,
  selectedRegionInfo,
  onConnect,
}: WizardProps) {
  return (
    <div className="wizard">
      <div className="wizard__header">
        <div>
          <p className="eyebrow">Guided setup</p>
          <h2>Walk through, visualize, and launch</h2>
          <p className="muted">
            Collect only the essentials. Visual feedback keeps non-technical teammates oriented.
          </p>
        </div>
        <div className="wizard__steps">
          {wizardSteps.map((step, index) => (
            <button
              key={step.id}
              className={`step ${index === activeStep ? 'active' : ''} ${
                index < activeStep ? 'done' : ''
              }`}
              onClick={() => setActiveStep(index)}
            >
              <span className="step__index">{index + 1}</span>
              <div>
                <div className="step__title">{step.title}</div>
                <div className="step__detail">{step.detail}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard__body">
        {activeStep === 0 && (
          <div className="grid two">
            <div className="card">
              <h4>Name & purpose</h4>
              <label className="field">
                <span>Connection label</span>
                <input
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="Training Lab Tunnel"
                />
              </label>
              <label className="field">
                <span>Deployment target</span>
                <div className="choice-row">
                  {deploymentTargets.map((target) => (
                    <button
                      key={target.id}
                      className={`chip ${deploymentTarget === target.id ? 'chip-active' : ''}`}
                      onClick={() => setDeploymentTarget(target.id)}
                    >
                      {target.name}
                    </button>
                  ))}
                </div>
                <div className="muted">{selectedTargetInfo.summary}</div>
              </label>
              <label className="field">
                <span>Authentication</span>
                <div className="choice-row">
                  <button
                    className={`chip ${authMethod === 'credentials' ? 'chip-active' : ''}`}
                    onClick={() => setAuthMethod('credentials')}
                  >
                    Username & password
                  </button>
                  <button
                    className={`chip ${authMethod === 'keys' ? 'chip-active' : ''}`}
                    onClick={() => setAuthMethod('keys')}
                  >
                    Public/private keys
                  </button>
                </div>
              </label>
              <label className="field">
                <span>{authMethod === 'credentials' ? 'Username' : 'Key comment'}</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst"
                />
              </label>
              {deploymentTarget !== 'custom' && (
                <div className="aws-grid">
                  <div className="aws-field">
                    <span className="muted">VPC</span>
                    <input value={awsVpcId} onChange={(e) => setAwsVpcId(e.target.value)} />
                  </div>
                  <div className="aws-field">
                    <span className="muted">Subnet</span>
                    <input value={awsSubnet} onChange={(e) => setAwsSubnet(e.target.value)} />
                  </div>
                  <div className="aws-field">
                    <span className="muted">Security group</span>
                    <input
                      value={awsSecurityGroup}
                      onChange={(e) => setAwsSecurityGroup(e.target.value)}
                    />
                  </div>
                  <div className="aws-field">
                    <span className="muted">CIDR</span>
                    <input value={awsCidr} onChange={(e) => setAwsCidr(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="card">
              <h4>What you get</h4>
              <ul className="bullets">
                <li>Visual explanation of the tunnel as you configure.</li>
                <li>Protocol tips with trade-offs in plain language.</li>
                <li>Live metrics once connected: latency, throughput, loss.</li>
                {deploymentTarget !== 'custom' && (
                  <li>
                    AWS checklist: VPC/subnet/SG/CIDR callouts for Client VPN, Site-to-Site, or sidecars.
                  </li>
                )}
              </ul>
              <p className="muted">
                We avoid logging sensitive fields. Demo values stay local to your browser.
              </p>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="grid three">
            {regionOptions.map((region) => (
              <button
                key={region.id}
                className={`region-card ${selectedRegion === region.id ? 'region-active' : ''}`}
                onClick={() => setSelectedRegion(region.id)}
              >
                <div className="region-top">
                  <div>
                    <div className="region-name">{region.name}</div>
                    <div className="muted">{region.country}</div>
                  </div>
                  <span className="pill">Load {(region.load * 100).toFixed(0)}%</span>
                </div>
                <div className="region-meta">
                  <div>
                    <div className="muted">Latency</div>
                    <div className="metric">{region.latency} ms</div>
                  </div>
                  <div>
                    <div className="muted">Distance sense</div>
                    <div className="metric">
                      {region.latency < 80 ? 'Nearby' : region.latency < 150 ? 'Medium' : 'Far'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeStep === 2 && (
          <ProtocolSelector
            selectedProtocol={selectedProtocol}
            setSelectedProtocol={setSelectedProtocol}
            protocols={protocolCatalog}
            compact
          />
        )}

        {activeStep === 3 && (
          <div className="grid two">
            <div className="card">
              <h4>Summary</h4>
              <div className="summary-line">
                <span>Connection</span>
                <strong>{connectionName}</strong>
              </div>
              <div className="summary-line">
                <span>Target</span>
                <strong>{selectedTargetInfo.name}</strong>
              </div>
              <div className="summary-line">
                <span>Protocol</span>
                <strong>{selectedProtocolInfo.name}</strong>
              </div>
              <div className="summary-line">
                <span>Region</span>
                <strong>{selectedRegionInfo.name}</strong>
              </div>
              {deploymentTarget !== 'custom' && (
                <>
                  <div className="summary-line">
                    <span>VPC / Subnet</span>
                    <strong>
                      {awsVpcId} / {awsSubnet}
                    </strong>
                  </div>
                  <div className="summary-line">
                    <span>SG / CIDR</span>
                    <strong>
                      {awsSecurityGroup} / {awsCidr}
                    </strong>
                  </div>
                </>
              )}
              <div className="summary-line">
                <span>Auth</span>
                <strong>{authMethod === 'credentials' ? `Username: ${username}` : 'Key-based'}</strong>
              </div>
              <p className="muted">
                You can tweak the accent colour and animation speed under Personalize before you
                present this flow to others.
              </p>
            </div>
            <div className="card">
              <h4>Ready to connect?</h4>
              <p className="muted">Launch the tunnel and watch the map animate in real time.</p>
              <div className="cta-row">
                <button className="cta primary" onClick={onConnect}>
                  Connect & visualize
                </button>
                <button className="cta ghost" onClick={() => setActiveStep(1)}>
                  Change region
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type ProtocolSelectorProps = {
  selectedProtocol: string
  setSelectedProtocol: (value: string) => void
  protocols: Protocol[]
  compact?: boolean
}

function ProtocolSelector({ selectedProtocol, setSelectedProtocol, protocols, compact }: ProtocolSelectorProps) {
  return (
    <div className={`protocols ${compact ? 'protocols-compact' : ''}`}>
      {!compact && (
        <div className="panel-header">
          <div>
            <p className="eyebrow">Protocol guide</p>
            <h3>Compare tunneling options quickly</h3>
            <p className="muted">Hover or tap to see trade-offs in plain language.</p>
          </div>
        </div>
      )}
      <div className="protocol-grid">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            className={`protocol-card ${selectedProtocol === protocol.id ? 'protocol-active' : ''}`}
            onClick={() => setSelectedProtocol(protocol.id)}
          >
            <div className="protocol-top">
              <div>
                <div className="protocol-name">{protocol.name}</div>
                <div className="muted">{protocol.summary}</div>
              </div>
              <span className="pill">{protocol.speed}</span>
            </div>
            <div className="protocol-body">
              <div className="protocol-stat">
                <span className="muted">Security</span>
                <strong>{protocol.security}</strong>
              </div>
              <div className="protocol-stat">
                <span className="muted">Ports</span>
                <strong>{protocol.ports}</strong>
              </div>
              <div className="protocol-stat">
                <span className="muted">Best for</span>
                <strong>{protocol.bestFor}</strong>
              </div>
              <div className="protocol-stat">
                <span className="muted">Compatibility</span>
                <strong>{protocol.compatibility}</strong>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

type ProtocolPanelProps = {
  protocols: Protocol[]
  selectedProtocol: string
  setSelectedProtocol: (value: string) => void
  expanded: boolean
  setExpanded: (value: boolean) => void
}

function ProtocolPanel({
  protocols,
  selectedProtocol,
  setSelectedProtocol,
  expanded,
  setExpanded,
}: ProtocolPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Protocol guide</p>
          <h3>Pick a tunnel style</h3>
          <p className="muted">
            Collapse to shorten the page; expand for details and comparisons.
          </p>
        </div>
        <button className="cta ghost" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>
      {expanded ? (
        <div className="protocol-scroll">
          <ProtocolSelector
            selectedProtocol={selectedProtocol}
            setSelectedProtocol={setSelectedProtocol}
            protocols={protocols}
            compact
          />
        </div>
      ) : (
        <div className="protocol-summary">
          {protocols.map((protocol) => (
            <button
              key={protocol.id}
              className={`pill ${selectedProtocol === protocol.id ? 'pill-live' : ''}`}
              onClick={() => setSelectedProtocol(protocol.id)}
            >
              {protocol.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type NetworkMapProps = {
  connected: boolean
  region: Region
  protocol: Protocol
  animationSpeed: number
  deploymentTarget: DeploymentTargetId
}

function NetworkMap({ connected, region, protocol, animationSpeed, deploymentTarget }: NetworkMapProps) {
  const targetColor =
    deploymentTarget === 'aws-client-vpn'
      ? '#7cf6d2'
      : deploymentTarget === 'aws-site-to-site'
        ? '#89a8ff'
        : deploymentTarget === 'aws-sidecar'
          ? '#f6d27c'
          : 'var(--accent)'

  return (
    <div className="map-shell">
      <svg viewBox="0 0 100 46" className={`map ${connected ? 'map-live' : ''}`}>
        <defs>
          <linearGradient id="tunnel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={targetColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#89a8ff" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="packets" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={targetColor} stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="30" r="3.5" className="node-svg node-local" />
        <circle cx="48" cy="18" r="4" className="node-svg node-gateway" />
        <circle cx="82" cy="12" r="3" className="node-svg node-cloud" />
        <circle cx="86" cy="32" r="3" className="node-svg node-cloud" />
        <path d="M12 30 C 30 24, 34 22, 48 18" className="arc" stroke="url(#tunnel)" />
        <path d="M48 18 C 65 14, 70 11, 82 12" className="arc" stroke="url(#tunnel)" />
        <path d="M48 18 C 64 22, 72 26, 86 32" className="arc" stroke="url(#tunnel)" />
        {connected && (
          <>
            <circle cx="32" cy="24" r="0.8" className="packet" stroke="url(#packets)" />
            <circle cx="60" cy="14" r="0.8" className="packet packet-delay" stroke="url(#packets)" />
            <circle cx="70" cy="28" r="0.8" className="packet packet-delay2" stroke="url(#packets)" />
          </>
        )}
      </svg>

      <div className="map-legend">
        <LegendItem label="Your device" detail="Traffic encrypted before leaving" />
        <LegendItem label={`VPN gateway · ${region.name}`} detail={`${region.latency}ms est. RTT`} />
        <LegendItem label="Internet destination" detail="IP masked beyond the gateway" />
        <LegendItem label="Protocol" detail={protocol.name} />
      </div>

      <div className="map-hint">
        <span className={`dot ${connected ? 'dot-live' : ''}`} />
        {connected
          ? `Live stream · Target ${region.name} (${deploymentTarget}) · Animations at ${animationSpeed.toFixed(
              1,
            )}s`
          : 'Click connect to animate the tunnel'}
      </div>
    </div>
  )
}

function LegendItem({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="legend-item">
      <div className="legend-label">{label}</div>
      <div className="muted">{detail}</div>
    </div>
  )
}

type MetricsPanelProps = {
  metrics: Metrics
  protocol: Protocol
  connected: boolean
  telemetrySource: string
}

function MetricsPanel({ metrics, protocol, connected, telemetrySource }: MetricsPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Real-time status</p>
          <h3>Connection health</h3>
          <p className="muted">Live metrics refresh while connected.</p>
        </div>
        <div className="pill-row">
          <span className={`pill ${connected ? 'pill-live' : ''}`}>
            {connected ? 'Live' : 'Idle'}
          </span>
          <span className="pill">Telemetry · {telemetrySource}</span>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric label="Latency" value={`${metrics.latency.toFixed(0)} ms`} />
        <Metric label="Throughput" value={`${metrics.throughput.toFixed(0)} Mbps`} />
        <Metric label="Packet loss" value={`${metrics.loss.toFixed(2)} %`} />
        <Metric label="Protocol" value={protocol.name} />
      </div>
      <div className="timeline">
        <div className="timeline__bar" />
        <div className="timeline__labels">
          <span>Handshake</span>
          <span>Tunnel established</span>
          <span>Data flowing</span>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

type CustomizationPanelProps = {
  accent: string
  setAccent: (value: string) => void
  animationSpeed: number
  setAnimationSpeed: (value: number) => void
}

function CustomizationPanel({
  accent,
  setAccent,
  animationSpeed,
  setAnimationSpeed,
}: CustomizationPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Personalize</p>
          <h3>Make the demo yours</h3>
          <p className="muted">Adjust accent colours and animation speed for presentations.</p>
        </div>
      </div>
      <label className="field">
        <span>Accent colour</span>
        <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
      </label>
      <label className="field">
        <span>Animation speed</span>
        <input
          type="range"
          min={0.6}
          max={3}
          step={0.1}
          value={animationSpeed}
          onChange={(e) => setAnimationSpeed(Number(e.target.value))}
        />
        <div className="muted">Current: {animationSpeed.toFixed(1)}s loop</div>
      </label>
    </div>
  )
}

type ConfigPreviewProps = {
  deploymentTarget: DeploymentTargetId
  region: Region
  protocol: Protocol
  awsVpcId: string
  awsSubnet: string
  awsSecurityGroup: string
  awsCidr: string
}

function buildConfigSnippet({
  deploymentTarget,
  region,
  protocol,
  awsVpcId,
  awsSubnet,
  awsSecurityGroup,
  awsCidr,
}: ConfigPreviewProps) {
  const regionCode = region.awsRegion
  if (deploymentTarget === 'aws-client-vpn') {
    return `client
dev tun
proto udp
remote ${regionCode}.clientvpn.amazonaws.com 443
auth-user-pass
remote-cert-tls server
explicit-exit-notify
; Attachments
; VPC ${awsVpcId}, Subnet ${awsSubnet}, SG ${awsSecurityGroup}
; Routes ${awsCidr} (split-tunnel ${awsCidr ? 'enabled' : 'pending'})`
  }
  if (deploymentTarget === 'aws-site-to-site') {
    return `# AWS Site-to-Site (IPsec) runbook
Phase1: AES256-GCM / SHA256 / DH14
Phase2: AES256-GCM / PFS14 / 3600s
Tunnel CIDR: ${awsCidr || '169.254.x.x/30'}
Customer Gateway: ${awsSecurityGroup || 'cgw-xxxx'}
Region: ${regionCode}
Route: advertise ${awsCidr || '10.0.0.0/16'} via BGP`
  }
  if (deploymentTarget === 'aws-sidecar') {
    return `# AWS Sidecar notes
Service region: ${regionCode}
Sidecar SG: ${awsSecurityGroup}
VPC: ${awsVpcId}, Subnet: ${awsSubnet}
Ensure task/service role allows ENI mgmt and SG rules permit app -> sidecar egress.`
  }
  return `[Interface]
PrivateKey = <your-private-key>
Address = 10.7.0.2/32
DNS = 10.7.0.1

[Peer]
PublicKey = <peer-public-key>
AllowedIPs = ${awsCidr || '0.0.0.0/0'}
Endpoint = ${region.name.toLowerCase()}.vpn.local:51820
# Protocol ${protocol.name}`
}

function ConfigPreview(props: ConfigPreviewProps) {
  const snippet = buildConfigSnippet(props)
  const [copyLabel, setCopyLabel] = useState('Copy snippet')

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      setCopyLabel('Clipboard unavailable')
      return
    }
    await navigator.clipboard.writeText(snippet)
    setCopyLabel('Copied!')
    window.setTimeout(() => setCopyLabel('Copy snippet'), 1200)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Config preview</p>
          <h3>Export-ready snippet</h3>
          <p className="muted">
            Tailored for {props.deploymentTarget === 'custom' ? 'self-managed VPN' : 'AWS'} using
            current selections.
          </p>
        </div>
        <button className="cta ghost" onClick={handleCopy}>
          {copyLabel}
        </button>
      </div>
      <div className="config-preview">
        <div className="config-meta">
          <span className="pill">Target · {props.deploymentTarget}</span>
          <span className="pill">Region · {props.region.awsRegion}</span>
          <span className="pill">Protocol · {props.protocol.name}</span>
        </div>
        <pre>{snippet}</pre>
      </div>
    </div>
  )
}

function Troubleshoot({ diagnostics, onRun }: { diagnostics: string[]; onRun: () => void }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Troubleshoot</p>
          <h3>Common checks</h3>
          <p className="muted">
            Run quick diagnostics to explain why a tunnel might fail. Nothing sensitive is logged.
          </p>
        </div>
        <button className="cta ghost" onClick={onRun}>
          Run checks
        </button>
      </div>
      <ul className="bullets">
        {diagnostics.length === 0 && <li className="muted">No diagnostics yet.</li>}
        {diagnostics.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  )
}

function HelpPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Contextual help</p>
          <h3>Glossary & tips</h3>
          <p className="muted">Give newcomers the language they need to feel confident.</p>
        </div>
      </div>
      <div className="glossary">
        {glossary.map((item) => (
          <div className="glossary-item" key={item.term}>
            <div className="legend-label">{item.term}</div>
            <div className="muted">{item.def}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
