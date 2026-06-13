// Maps team IDs to their sticker image filenames in /public/imgs/Stickers/
export const STICKER_MAP: Record<string, string> = {
  ARG: "001_ARGENTINA.jpg", AUS: "002_AUSTRALIA.jpg", AUT: "003_AUSTRIA.jpg",
  BEL: "004_BELGIUM_31245203.jpg", BRA: "005_BRAZIL.jpg", CAN: "006_CANADA.jpg",
  CRO: "008_CROATIA.jpg", CZE: "009_CZECH_REPUBLIC.jpg", ECU: "011_ECUADOR.jpg",
  EGY: "012_EGYPT.jpg", ENG: "013_ENGLAND_1861c69d.jpg", FRA: "014_FRANCE_50f489c3.jpg",
  GER: "015_GERMANY.jpg", GHA: "016_GHANA.jpg", IRN: "017_IRAN.jpg",
  JPN: "019_JAPAN.jpg", KOR: "020_SOUTH_KOREA_faaad415.jpg", MEX: "021_MEXICO_6c4f3ab4.jpg",
  MAR: "022_MOROCCO.jpg", NED: "023_NETHERLANDS.jpg", NZL: "024_NEW_ZEALAND_8b255506.jpg",
  NOR: "026_NORWAY.jpg", PAN: "027_PANAMA.jpg", PAR: "028_PARAGUAY.jpg",
  POR: "030_PORTUGAL.jpg", KSA: "031_SAUDI_ARABIA.jpg", SEN: "032_SENEGAL.jpg",
  RSA: "034_SOUTH_AFRICA.jpg", ESP: "035_SPAIN.jpg", SWE: "036_SWEDEN.jpg",
  SUI: "037_SWITZERLAND.jpg", TUN: "038_TUNISIA.jpg", TUR: "039_TURKEY.jpg",
  USA: "041_UNITED_STATES.jpg", URU: "042_URUGUAY.jpg", UZB: "043_UZBEKISTAN.jpg",
  ALG: "045_ALGERIA.jpg", COL: "046_COLOMBIA.jpg", BIH: "049_BOSNIA_AND_HERZEGOVINA.jpg",
  CIV: "050_IVORY_COAST.jpg", COD: "051_DR_CONGO.jpg", CPV: "052_CAPE_VERDE.jpg",
  CUW: "053_CURACAO.jpg", HAI: "054_HAITI.jpg", IRQ: "055_IRAQ.jpg",
  JOR: "056_JORDAN.jpg", QAT: "057_QATAR.jpg", SCO: "058_SCOTLAND.jpg",
};

export function getStickerPath(teamId: string): string | null {
  const file = STICKER_MAP[teamId];
  return file ? `/imgs/Stickers/${file}` : null;
}
