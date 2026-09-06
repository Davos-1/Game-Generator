/**
 * Blacklist für die Prüfung generierter Wortsuchrätsel-Gitter.
 *
 * Beim Auffüllen der Gitter mit zufälligen Füllbuchstaben kann es durch
 * Zufall vorkommen, dass unerwünschte Wörter entstehen (waagrecht, senkrecht
 * oder diagonal lesbar). Diese Liste dient dazu, ein generiertes Gitter
 * nachträglich zu prüfen und bei einem Treffer neu zu generieren, damit auf
 * einem Kinder-Rätsel keine anstössigen Wörter erscheinen.
 *
 * Die Liste ist bewusst kurz gehalten und enthält nur Wortstämme (keine
 * Wortformen, Pluralformen oder zusammengesetzte Wörter), damit die Prüfung
 * einfach per Teilstring-Suche funktioniert. Umlaute sind hier als Ä/Ö/Ü
 * geschrieben; die Engine ist dafür verantwortlich, beim Abgleich auch die
 * AE/OE/UE-Schreibweisen zu berücksichtigen.
 *
 * Diese Liste ist reine Filterdaten für eine Kindersicherheitsfunktion und
 * stellt keine Billigung der enthaltenen Begriffe dar.
 */
export const DEFAULT_BLACKLIST: readonly string[] = [
  'ARSCH',
  'ARSCHLOCH',
  'ASSHOLE',
  'BASTARD',
  'BITCH',
  'BOOBS',
  'BUMS',
  'BUMSEN',
  'CRAP',
  'CUNT',
  'DRECKSACK',
  'DRECKSAU',
  'FICK',
  'FICKEN',
  'FICKER',
  'FOTZE',
  'FOTZEN',
  'FUCK',
  'FURZ',
  'HURE',
  'KACK',
  'KACKE',
  'KACKER',
  'KANAKE',
  'KOTZ',
  'KOTZE',
  'LUDER',
  'MISTSTÜCK',
  'MONGO',
  'MUSCHI',
  'NEGER',
  'NIGGA',
  'NIGGER',
  'NUTTE',
  'PENIS',
  'PISS',
  'PISSE',
  'PISSER',
  'POLACK',
  'PORN',
  'PORNO',
  'PUSSY',
  'SAU',
  'SAUKERL',
  'SCHEISS',
  'SCHEISSE',
  'SCHLAMPE',
  'SCHWANZ',
  'SCHWUCHTEL',
  'SEX',
  'SHIT',
  'SLUT',
  'SPAST',
  'SPASTI',
  'TITTE',
  'TITTEN',
  'TSCHUSCH',
  'TUNTE',
  'VAGINA',
  'VOTZE',
  'WHORE',
  'WICHSEN',
  'WICHSER',
  'ZIGEUNER',
];
