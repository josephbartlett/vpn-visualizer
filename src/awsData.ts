import type { DeploymentTargetId } from './types'

export type AwsClientVpnEndpoint = {
  id: string
  name: string
  region: string
  vpcId: string
  subnetId: string
  securityGroupId: string
  cidr: string
  splitTunnel: boolean
}

export type AwsSiteToSite = {
  id: string
  name: string
  region: string
  vpcId: string
  tunnelCidr: string
  customerGateway: string
  transitGateway?: string
  bgpAsn?: number
}

export type AwsSidecar = {
  id: string
  name: string
  region: string
  vpcId: string
  securityGroupId: string
  service: string
}

const clientVpnEndpoints: AwsClientVpnEndpoint[] = [
  {
    id: 'cvpn-endpoint-0a12bc3d45',
    name: 'Navina Workforce EU',
    region: 'eu-west-1',
    vpcId: 'vpc-0e12aa10',
    subnetId: 'subnet-08ff2c01',
    securityGroupId: 'sg-0cafe12a',
    cidr: '10.42.0.0/16',
    splitTunnel: true,
  },
  {
    id: 'cvpn-endpoint-0de98f7a1',
    name: 'Navina Workforce US',
    region: 'us-east-1',
    vpcId: 'vpc-0ba9cd31',
    subnetId: 'subnet-0c91d2b3',
    securityGroupId: 'sg-0123ab45',
    cidr: '10.20.0.0/16',
    splitTunnel: true,
  },
]

const siteToSiteTunnels: AwsSiteToSite[] = [
  {
    id: 'vpn-0aa1bb22',
    name: 'Sidecar IPsec to TGW',
    region: 'eu-west-1',
    vpcId: 'vpc-0e12aa10',
    tunnelCidr: '169.254.12.0/30',
    customerGateway: 'cgw-012aa0bb',
    transitGateway: 'tgw-0dd11ff2',
    bgpAsn: 65010,
  },
  {
    id: 'vpn-0cc44dd5',
    name: 'On-prem to VPC',
    region: 'us-east-1',
    vpcId: 'vpc-0ba9cd31',
    tunnelCidr: '169.254.28.0/30',
    customerGateway: 'cgw-0acbd12e',
    transitGateway: 'tgw-0bd09c12',
    bgpAsn: 65020,
  },
]

const sidecars: AwsSidecar[] = [
  {
    id: 'sidecar-eu-app',
    name: 'ECS App Sidecar',
    region: 'eu-west-1',
    vpcId: 'vpc-0e12aa10',
    securityGroupId: 'sg-0cafe12a',
    service: 'ECS Service navina-app',
  },
  {
    id: 'sidecar-us-batch',
    name: 'Batch Sidecar',
    region: 'us-east-1',
    vpcId: 'vpc-0ba9cd31',
    securityGroupId: 'sg-0123ab45',
    service: 'EKS batch namespace',
  },
]

export function pickAwsDefaults(target: DeploymentTargetId, region: string) {
  if (target === 'aws-client-vpn') {
    return clientVpnEndpoints.find((e) => e.region === region) ?? clientVpnEndpoints[0]
  }
  if (target === 'aws-site-to-site') {
    return siteToSiteTunnels.find((t) => t.region === region) ?? siteToSiteTunnels[0]
  }
  if (target === 'aws-sidecar') {
    return sidecars.find((s) => s.region === region) ?? sidecars[0]
  }
  return undefined
}

export function getAwsCatalog() {
  return { clientVpnEndpoints, siteToSiteTunnels, sidecars }
}
