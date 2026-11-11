const ink = "#252B26";
const paper = "#FFFEFA";
const sage = "#4C624E";

export const BrandColors = {
  primary: sage,
  primaryDark: "#354439",
  primaryLight: "#596E5A",
  primarySoft: "#E3EBDD",
  onPrimary: "#FFFFFF",
  secondaryGold: "#404040",
  accentMint: "#303030",
  accentRose: "#222222",

  headerGradient: ["#252B26", "#2C372E", "#354439", "#405044"] as const,
  buttonGradient: [sage, sage] as const,
  footerGradient: ["#405044", "#354439", "#252B26"] as const,

  background: "#F7F8F3",
  surfaceCard: paper,
  surfaceMuted: "#E9EDE4",
  inputBg: "#ECEFE7",
  inputBgFocus: paper,
  borderLight: "#E0E5DA",
  borderFocus: sage,

  textDark: ink,
  textBody: "#384139",
  textMuted: "#596459",
  textPlaceholder: "#647064",
  textLink: sage,
} as const;
