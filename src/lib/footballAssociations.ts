export interface FootballAssociation {
  country: string
  name: string
  url: string
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
}

export const FOOTBALL_ASSOCIATIONS: FootballAssociation[] = [
  // UEFA — Europe
  { country: 'England', name: 'The Football Association (FA)', url: 'https://www.thefa.com', confederation: 'UEFA' },
  { country: 'Spain', name: 'Real Federación Española de Fútbol (RFEF)', url: 'https://www.rfef.es', confederation: 'UEFA' },
  { country: 'Germany', name: 'Deutscher Fußball-Bund (DFB)', url: 'https://www.dfb.de', confederation: 'UEFA' },
  { country: 'France', name: 'Fédération Française de Football (FFF)', url: 'https://www.fff.fr', confederation: 'UEFA' },
  { country: 'Italy', name: 'Federazione Italiana Giuoco Calcio (FIGC)', url: 'https://www.figc.it', confederation: 'UEFA' },
  { country: 'Portugal', name: 'Federação Portuguesa de Futebol (FPF)', url: 'https://www.fpf.pt', confederation: 'UEFA' },
  { country: 'Netherlands', name: 'Koninklijke Nederlandse Voetbalbond (KNVB)', url: 'https://www.knvb.nl', confederation: 'UEFA' },
  { country: 'Belgium', name: 'Royal Belgian Football Association (RBFA)', url: 'https://www.rbfa.be', confederation: 'UEFA' },
  { country: 'Turkey', name: 'Türkiye Futbol Federasyonu (TFF)', url: 'https://www.tff.org', confederation: 'UEFA' },
  { country: 'Greece', name: 'Hellenic Football Federation (EPO)', url: 'https://www.epo.gr', confederation: 'UEFA' },
  { country: 'Ukraine', name: 'Ukrainian Association of Football (UAF)', url: 'https://www.uaf.ua', confederation: 'UEFA' },
  { country: 'Russia', name: 'Russian Football Union (RFU)', url: 'https://www.rfs.ru', confederation: 'UEFA' },
  { country: 'Switzerland', name: 'Swiss Football Association (SFA)', url: 'https://www.football.ch', confederation: 'UEFA' },
  { country: 'Austria', name: 'Austrian Football Association (ÖFB)', url: 'https://www.oefb.at', confederation: 'UEFA' },
  { country: 'Croatia', name: 'Croatian Football Federation (HNS)', url: 'https://www.hns-cff.hr', confederation: 'UEFA' },
  { country: 'Denmark', name: 'Danish Football Union (DBU)', url: 'https://www.dbu.dk', confederation: 'UEFA' },
  { country: 'Sweden', name: 'Swedish Football Association (SvFF)', url: 'https://www.svenskfotboll.se', confederation: 'UEFA' },
  { country: 'Norway', name: 'Football Federation of Norway (NFF)', url: 'https://www.fotball.no', confederation: 'UEFA' },
  { country: 'Poland', name: 'Polish Football Association (PZPN)', url: 'https://www.pzpn.pl', confederation: 'UEFA' },
  { country: 'Czech Republic', name: 'Football Association of Czech Republic (FAČR)', url: 'https://www.fotbal.cz', confederation: 'UEFA' },
  { country: 'Romania', name: 'Romanian Football Federation (FRF)', url: 'https://www.frf.ro', confederation: 'UEFA' },
  { country: 'Scotland', name: 'Scottish Football Association (SFA)', url: 'https://www.scottishfa.co.uk', confederation: 'UEFA' },
  { country: 'Israel', name: 'Israel Football Association (IFA)', url: 'https://www.football.org.il', confederation: 'UEFA' },
  { country: 'Serbia', name: 'Football Association of Serbia (FSS)', url: 'https://www.fss.rs', confederation: 'UEFA' },

  // CONMEBOL — South America
  { country: 'Brazil', name: 'Brazilian Football Confederation (CBF)', url: 'https://www.cbf.com.br', confederation: 'CONMEBOL' },
  { country: 'Argentina', name: 'Argentine Football Association (AFA)', url: 'https://www.afa.com.ar', confederation: 'CONMEBOL' },
  { country: 'Uruguay', name: 'Uruguayan Football Association (AUF)', url: 'https://www.auf.org.uy', confederation: 'CONMEBOL' },
  { country: 'Colombia', name: 'Colombian Football Federation (FCF)', url: 'https://www.fcf.com.co', confederation: 'CONMEBOL' },
  { country: 'Chile', name: 'Chilean Football Federation (ANFP)', url: 'https://www.anfp.cl', confederation: 'CONMEBOL' },
  { country: 'Peru', name: 'Peruvian Football Federation (FPF)', url: 'https://www.fpf.com.pe', confederation: 'CONMEBOL' },
  { country: 'Ecuador', name: 'Ecuadorian Football Federation (FEF)', url: 'https://www.fef.ec', confederation: 'CONMEBOL' },
  { country: 'Paraguay', name: 'Paraguayan Football Association (APF)', url: 'https://www.apf.org.py', confederation: 'CONMEBOL' },
  { country: 'Bolivia', name: 'Bolivian Football Federation (FBF)', url: 'https://www.fbf.com.bo', confederation: 'CONMEBOL' },
  { country: 'Venezuela', name: 'Venezuelan Football Federation (FVF)', url: 'https://www.fvf.com.ve', confederation: 'CONMEBOL' },

  // CONCACAF — North/Central America & Caribbean
  { country: 'USA', name: 'U.S. Soccer Federation (USSF)', url: 'https://www.ussoccer.com', confederation: 'CONCACAF' },
  { country: 'Mexico', name: 'Mexican Football Federation (FMF)', url: 'https://www.femexfut.org.mx', confederation: 'CONCACAF' },
  { country: 'Canada', name: 'Canada Soccer', url: 'https://www.canadasoccer.com', confederation: 'CONCACAF' },
  { country: 'Costa Rica', name: 'Costa Rican Football Federation (FEDEFÚTBOL)', url: 'https://www.fedefutbol.com', confederation: 'CONCACAF' },

  // CAF — Africa
  { country: 'Nigeria', name: 'Nigeria Football Federation (NFF)', url: 'https://www.thenff.com', confederation: 'CAF' },
  { country: 'Egypt', name: 'Egyptian Football Association (EFA)', url: 'https://www.efa.com.eg', confederation: 'CAF' },
  { country: 'South Africa', name: 'South African Football Association (SAFA)', url: 'https://www.safa.net', confederation: 'CAF' },
  { country: 'Ghana', name: 'Ghana Football Association (GFA)', url: 'https://www.ghanafa.org', confederation: 'CAF' },
  { country: 'Morocco', name: 'Royal Moroccan Football Federation (FRMF)', url: 'https://www.frmf.ma', confederation: 'CAF' },
  { country: 'Senegal', name: 'Senegalese Football Federation (FSF)', url: 'https://www.fsf.sn', confederation: 'CAF' },
  { country: 'Ivory Coast', name: 'Ivorian Football Federation (FIF)', url: 'https://www.fif.ci', confederation: 'CAF' },
  { country: 'Cameroon', name: 'Cameroon Football Federation (FECAFOOT)', url: 'https://www.fecafoot.org', confederation: 'CAF' },

  // AFC — Asia
  { country: 'Japan', name: 'Japan Football Association (JFA)', url: 'https://www.jfa.jp', confederation: 'AFC' },
  { country: 'South Korea', name: 'Korea Football Association (KFA)', url: 'https://www.kfa.or.kr', confederation: 'AFC' },
  { country: 'Saudi Arabia', name: 'Saudi Arabian Football Federation (SAFF)', url: 'https://www.saff.com.sa', confederation: 'AFC' },
  { country: 'Iran', name: 'Football Federation of the Islamic Republic of Iran (FFIRI)', url: 'https://www.ffiri.ir', confederation: 'AFC' },
  { country: 'Australia', name: 'Football Australia (FA)', url: 'https://www.footballaustralia.com.au', confederation: 'AFC' },
  { country: 'China', name: 'Chinese Football Association (CFA)', url: 'https://www.thecfa.cn', confederation: 'AFC' },
  { country: 'India', name: 'All India Football Federation (AIFF)', url: 'https://www.the-aiff.com', confederation: 'AFC' },
  { country: 'UAE', name: 'UAE Football Association (UAEFA)', url: 'https://www.uaefa.ae', confederation: 'AFC' },
  { country: 'Qatar', name: 'Qatar Football Association (QFA)', url: 'https://www.qfa.qa', confederation: 'AFC' },
]

export const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const

// ISO 3166-1 alpha-2 codes for flagcdn.com
const COUNTRY_CODES: Record<string, string> = {
  'England': 'gb-eng',
  'Scotland': 'gb-sct',
  'Spain': 'es',
  'Germany': 'de',
  'France': 'fr',
  'Italy': 'it',
  'Portugal': 'pt',
  'Netherlands': 'nl',
  'Belgium': 'be',
  'Turkey': 'tr',
  'Greece': 'gr',
  'Ukraine': 'ua',
  'Russia': 'ru',
  'Switzerland': 'ch',
  'Austria': 'at',
  'Croatia': 'hr',
  'Denmark': 'dk',
  'Sweden': 'se',
  'Norway': 'no',
  'Poland': 'pl',
  'Czech Republic': 'cz',
  'Romania': 'ro',
  'Israel': 'il',
  'Serbia': 'rs',
  'Brazil': 'br',
  'Argentina': 'ar',
  'Uruguay': 'uy',
  'Colombia': 'co',
  'Chile': 'cl',
  'Peru': 'pe',
  'Ecuador': 'ec',
  'Paraguay': 'py',
  'Bolivia': 'bo',
  'Venezuela': 've',
  'USA': 'us',
  'Mexico': 'mx',
  'Canada': 'ca',
  'Costa Rica': 'cr',
  'Nigeria': 'ng',
  'Egypt': 'eg',
  'South Africa': 'za',
  'Ghana': 'gh',
  'Morocco': 'ma',
  'Senegal': 'sn',
  'Ivory Coast': 'ci',
  'Cameroon': 'cm',
  'Japan': 'jp',
  'South Korea': 'kr',
  'Saudi Arabia': 'sa',
  'Iran': 'ir',
  'Australia': 'au',
  'China': 'cn',
  'India': 'in',
  'UAE': 'ae',
  'Qatar': 'qa',
}

export function getCountryFlag(country: string): string {
  return COUNTRY_CODES[country] ?? ''
}
