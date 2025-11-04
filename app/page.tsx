import data from '@/data/chinese_players_2025.json';
import Link from 'next/link';

type TournamentEntry = {
  tournament: string;
  team: string;
};

type PlayerEntry = {
  name: string;
  title: string;
  tournaments: TournamentEntry[];
};

type Dataset = {
  updatedAt: string;
  players: PlayerEntry[];
};

const dataset = data as Dataset;

const tournaments = Array.from(
  new Map(
    dataset.players
      .flatMap((player) => player.tournaments)
      .map((entry) => [entry.tournament, entry])
  ).values()
).map((entry) => entry.tournament);

tournaments.sort();

export default function Page() {
  const players = dataset.players;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">
          Chinese Dota 2 Players in 2025 Tier 1 Tournaments
        </h1>
        <p className="muted max-w-3xl">
          Data snapshot aggregated from Liquipedia rosters for Tier 1 events during 2025. The list groups
          every Chinese player that appeared on published team lineups and maps them to the tournaments and
          teams they represented.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="badge">{players.length} Chinese players</span>
          <span className="badge">{tournaments.length} Tier 1 tournaments</span>
          <span className="muted text-sm">Last updated: {new Date(dataset.updatedAt).toLocaleDateString()}</span>
        </div>
      </header>

      <section className="card space-y-4">
        <h2 className="text-2xl">Covered Tournaments</h2>
        <ul className="tournament-list">
          {tournaments.map((tournament) => (
            <li key={tournament}>
              <Link
                href={`https://liquipedia.net/dota2/${tournament.replace(/ /g, '_')}`}
                target="_blank"
                rel="noopener"
              >
                {tournament}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl">Players</h2>
        <div className="list-column">
          {players.map((player) => (
            <article key={player.title} className="card space-y-3">
              <div>
                <h3 className="text-xl font-semibold">
                  <Link href={`https://liquipedia.net/dota2/${player.title}`} target="_blank" rel="noopener">
                    {player.name}
                  </Link>
                </h3>
              </div>
              <div className="space-y-2">
                {player.tournaments.map((entry, index) => (
                  <div key={`${player.title}-${entry.tournament}-${index}`}>
                    <span className="font-medium">{entry.team}</span>
                    <span className="muted"> — {entry.tournament}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
