import type { MessageKey } from "../i18n";

export type PortalLink =
  | { kind: "internal"; to: string }
  | { kind: "external"; href: string }
  | { kind: "comingSoon" };

export interface PortalDoor {
  id: "sovereign" | "corporate";
  to: string;
  titleKey: MessageKey;
  descKey: MessageKey;
}

export interface SovereignChannel {
  id: string;
  titleKey: MessageKey;
  descKey: MessageKey;
  link: PortalLink;
}

export interface ToolChannel {
  id: string;
  titleKey: MessageKey;
  descKey: MessageKey;
  href: string;
}

export const portalDoors: PortalDoor[] = [
  {
    id: "sovereign",
    to: "/sovereign",
    titleKey: "portalDoorSovereign",
    descKey: "portalDoorSovereignDesc",
  },
  {
    id: "corporate",
    to: "/corporate",
    titleKey: "portalDoorCorporate",
    descKey: "portalDoorCorporateDesc",
  },
];

export const sovereignChannels: SovereignChannel[] = [
  {
    id: "digital-bazaar",
    titleKey: "portalChannelBazaar",
    descKey: "portalChannelBazaarDesc",
    link: { kind: "internal", to: "/forge" },
  },
  {
    id: "token-gallery",
    titleKey: "portalChannelTokenGallery",
    descKey: "portalChannelTokenGalleryDesc",
    link: { kind: "external", href: "https://spl-token.hashspace.me/" },
  },
  {
    id: "credit-foundry",
    titleKey: "portalChannelCreditFoundry",
    descKey: "portalChannelCreditFoundryDesc",
    link: { kind: "external", href: "https://fair.hashspace.me/current-event/registration" },
  },
  {
    id: "mintforge",
    titleKey: "portalChannelMintforge",
    descKey: "portalChannelMintforgeDesc",
    link: { kind: "comingSoon" },
  },
  {
    id: "rwa",
    titleKey: "portalChannelRwa",
    descKey: "portalChannelRwaDesc",
    link: { kind: "comingSoon" },
  },
  {
    id: "tools",
    titleKey: "portalChannelTools",
    descKey: "portalChannelToolsDesc",
    link: { kind: "internal", to: "/sovereign/tools" },
  },
  {
    id: "for-fun",
    titleKey: "portalChannelForFun",
    descKey: "portalChannelForFunDesc",
    link: { kind: "external", href: "https://aethervane.hashspace.me/" },
  },
];

export const toolChannels: ToolChannel[] = [
  {
    id: "solrisk",
    titleKey: "portalToolSolrisk",
    descKey: "portalToolSolriskDesc",
    href: "https://solrisk.signer-payer.me/",
  },
  {
    id: "spl-token-balance",
    titleKey: "portalToolSplBalance",
    descKey: "portalToolSplBalanceDesc",
    href: "https://spl-token.signer-payer.me/",
  },
  {
    id: "promptlean",
    titleKey: "portalToolPromptlean",
    descKey: "portalToolPromptleanDesc",
    href: "https://promptlean.signer-payer.me/",
  },
];
