import fs from 'fs/promises';

const PROXY_PREFIX = 'https://r.jina.ai/https://liquipedia.net/dota2';
const MARKDOWN_TOKEN = 'Markdown Content:\n';
const OUTPUT_PATH = 'data/chinese_players_2025.json';
const TOURNAMENTS = [
  'The International/2025',
  'Esports World Cup/2025',
  'ESL One/Raleigh/2025',
  'DreamLeague/Season 25',
  'DreamLeague/Season 26',
  'DreamLeague/27',
  'BLAST/Slam/2',
  'BLAST/Slam/3',
  'BLAST/Slam/4',
  'PGL/Wallachia/3',
  'PGL/Wallachia/4',
  'PGL/Wallachia/5',
  'FISSURE/PLAYGROUND/1',
  'FISSURE/PLAYGROUND/2',
  'FISSURE/Universe/4',
  'Clavision/Masters/2025'
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProxy(path: string): Promise<string> {
  const url = `${PROXY_PREFIX}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'agentic-a141ca82-data-fetcher/1.0 (https://vercel.app)'
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const index = text.indexOf(MARKDOWN_TOKEN);
  return index === -1 ? text : text.slice(index + MARKDOWN_TOKEN.length);
}

type Template = {
  name: string;
  params: Record<string, string>;
};

type PlayerSlot = {
  name: string;
  link?: string;
};

type TeamCard = {
  team: string;
  players: PlayerSlot[];
};

function parseTemplate(raw: string): Template {
  const inner = raw.replace(/^{{/, '').replace(/}}$/, '');
  const segments: string[] = [];
  let braceDepth = 0;
  let bracketDepth = 0;
  let current = '';
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    const next = inner[i + 1];
    if (char === '{' && next === '{') {
      braceDepth += 1;
      current += '{{';
      i += 1;
      continue;
    }
    if (char === '}' && next === '}') {
      braceDepth = Math.max(braceDepth - 1, 0);
      current += '}}';
      i += 1;
      continue;
    }
    if (char === '[' && next === '[') {
      bracketDepth += 1;
      current += '[[';
      i += 1;
      continue;
    }
    if (char === ']' && next === ']') {
      bracketDepth = Math.max(bracketDepth - 1, 0);
      current += ']]';
      i += 1;
      continue;
    }
    if (char === '|' && braceDepth === 0 && bracketDepth === 0) {
      segments.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  segments.push(current);
  const [name, ...rest] = segments;
  const params: Record<string, string> = {};
  rest.forEach((segment) => {
    const trimmed = segment.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim().toLowerCase();
    const value = trimmed.slice(eqIndex + 1).trim();
    params[key] = value;
  });
  return { name: name.trim().toLowerCase(), params };
}

function extractTemplates(source: string, targets: string[]): Template[] {
  const lowerTargets = targets.map((t) => t.toLowerCase());
  const templates: Template[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '{' && source[i + 1] === '{') {
      let depth = 1;
      let j = i + 2;
      while (j < source.length && depth > 0) {
        if (source[j] === '{' && source[j + 1] === '{') {
          depth += 1;
          j += 2;
          continue;
        }
        if (source[j] === '}' && source[j + 1] === '}') {
          depth -= 1;
          j += 2;
          continue;
        }
        j += 1;
      }
      if (depth === 0) {
        const raw = source.slice(i, j);
        const template = parseTemplate(raw);
        if (lowerTargets.includes(template.name)) {
          templates.push(template);
        }
        i = j - 1;
      } else {
        i = source.length;
      }
    }
  }
  return templates;
}

function parseTeamCards(wikitext: string): TeamCard[] {
  return extractTemplates(wikitext, ['teamcard', 'teamcardshort', 'teamcardsmall'])
    .map((template) => {
      const team = template.params['team'];
      if (!team) return null;
      const players: PlayerSlot[] = [];
      for (let idx = 1; idx <= 8; idx += 1) {
        const key = `p${idx}`;
        const value = template.params[key];
        if (!value) continue;
        const linkKey = `${key}link`;
        let link = template.params[linkKey];
        if (link && link.startsWith('[[') && link.endsWith(']]')) {
          link = link.slice(2, -2);
        }
        players.push({
          name: value.replace(/{{.*?}}/g, '').replace(/\[\[|\]\]/g, '').trim(),
          link: (link || value).replace(/ /g, '_')
        });
      }
      if (!players.length) return null;
      return {
        team: team.replace(/{{.*?}}/g, '').trim(),
        players
      };
    })
    .filter((card): card is TeamCard => Boolean(card));
}

async function fetchTournamentPlayers(title: string): Promise<{ team: string; players: PlayerSlot[] }[]> {
  const pageTitle = title.replace(/ /g, '_');
  const wikitext = await fetchProxy(`/index.php?title=${encodeURIComponent(pageTitle)}&action=raw`);
  return parseTeamCards(wikitext);
}

async function fetchTeamRoster(teamTitle: string): Promise<Map<string, string>> {
  const roster = new Map<string, string>();
  try {
    const pageTitle = teamTitle.replace(/ /g, '_');
    const wikitext = await fetchProxy(`/index.php?title=${encodeURIComponent(pageTitle)}&action=raw`);
    const persons = extractTemplates(wikitext, ['person']);
    persons.forEach((template) => {
      const id = template.params['id']?.replace(/ /g, '_');
      const flag = template.params['flag']?.toLowerCase();
      if (id && flag) {
        roster.set(id, flag);
      }
    });
  } catch (error) {
    console.error(`Failed to fetch roster for ${teamTitle}`, error);
  }
  return roster;
}

async function fetchPlayerCountry(playerTitle: string): Promise<string[]> {
  const visited = new Set<string>();
  let current = playerTitle.replace(/ /g, '_');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await delay(1500);
      const raw = await fetchProxy(`/index.php?title=${encodeURIComponent(current)}&action=raw`);
      const trimmed = raw.trim();
      if (/^#redirect/i.test(trimmed)) {
        const match = trimmed.match(/\[\[(.+?)\]\]/i);
        if (match) {
          const target = match[1].replace(/ /g, '_');
          if (visited.has(target)) break;
          visited.add(target);
          current = target;
          continue;
        }
        break;
      }
      const infobox = extractTemplates(raw, ['infobox player'])[0];
      if (!infobox) return [];
      const keys = ['country', 'nationality', 'country1', 'country2'];
      const countries: string[] = [];
      keys.forEach((key) => {
        const value = infobox.params[key];
        if (value) {
          const cleaned = value
            .replace(/{{flag\|([^|}]+).*?}}/gi, '$1')
            .replace(/{{.*?}}/g, '')
            .replace(/\[\[|\]\]/g, '')
            .trim();
          if (cleaned) {
            cleaned.split(/\s*[,\/]\s*|\s+and\s+/i).forEach((part) => {
              const trimmed = part.trim();
              if (trimmed) countries.push(trimmed.toLowerCase());
            });
          }
        }
      });
      return Array.from(new Set(countries));
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 429 && attempt < 4) {
        await delay(3000 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  return [];
}

async function main() {
  const appearances: Record<string, { team: string; tournament: string }> = {};
  const playerAppearances = new Map<string, { name: string; appearances: { team: string; tournament: string }[] }>();
  const teamSet = new Set<string>();

  for (const tournament of TOURNAMENTS) {
    console.log(`Processing tournament: ${tournament}`);
    try {
      const cards = await fetchTournamentPlayers(tournament);
      for (const card of cards) {
        teamSet.add(card.team);
        for (const player of card.players) {
          const key = player.link ?? player.name;
          if (!playerAppearances.has(key)) {
            playerAppearances.set(key, { name: player.name, appearances: [] });
          }
          playerAppearances.get(key)?.appearances.push({ team: card.team, tournament });
        }
      }
    } catch (error) {
      console.error(`Failed to process tournament ${tournament}`, error);
    }
  }

  const teamRosters = new Map<string, Map<string, string>>();
  for (const team of teamSet) {
    const roster = await fetchTeamRoster(team);
    teamRosters.set(team, roster);
    await delay(1000);
  }

  const chinesePlayers: {
    name: string;
    title: string;
    tournaments: { tournament: string; team: string }[];
  }[] = [];

  for (const [title, data] of playerAppearances.entries()) {
    try {
      let isChinese = false;
      for (const appearance of data.appearances) {
        const roster = teamRosters.get(appearance.team);
        const flag = roster?.get(title.replace(/ /g, '_'));
        if (flag && ['cn', 'china'].includes(flag)) {
          isChinese = true;
          break;
        }
      }
      if (!isChinese) {
        const countries = await fetchPlayerCountry(title);
        isChinese = countries.some((country) => ['china', 'cn', "people's republic of china", 'prc'].includes(country));
      }
      if (!isChinese) continue;
      chinesePlayers.push({
        name: data.name,
        title,
        tournaments: data.appearances
      });
      console.log(`Chinese player found: ${data.name}`);
    } catch (error) {
      console.error(`Failed to fetch player ${title}`, error);
    }
  }

  chinesePlayers.sort((a, b) => a.name.localeCompare(b.name));

  await fs.mkdir('public/data', { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), players: chinesePlayers }, null, 2),
    'utf8'
  );

  console.log(`Saved ${chinesePlayers.length} players to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
