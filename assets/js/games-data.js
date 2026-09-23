// Games page data: live from the Cloudflare Worker when possible, the
// saved snapshot in data/*.json otherwise. The processing below is the
// same logic the old games page used, just returning data instead of
// drawing it. Exposes window.GamesData = { steam, rivals, hypixel, overwatch },
// each a promise of { data, isLive }.
(function () {
    const WORKER = 'https://gentle-violet-8223.landont2015.workers.dev';
    const getJSON = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });

    // A hung Worker shouldn't stall the page: give up after a few seconds.
    function liveJSON(path, ms = 4000) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), ms);
        return fetch(WORKER + path, { signal: controller.signal })
            .then(r => { clearTimeout(t); if (!r.ok) throw new Error('Worker request failed'); return r.json(); });
    }

    // ---------------- Steam ----------------
    function processSteamRaw(raw) {
        const games = raw.response.games || [];
        const totalMinutes = games.reduce((sum, g) => sum + g.playtime_forever, 0);
        const processed = games.map(g => {
            const minutes = g.playtime_forever;
            const ts = g.rtime_last_played || 0;
            return {
                appid: g.appid,
                name: g.name,
                minutes,
                hours: Math.round((minutes / 60) * 10) / 10,
                pct: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 1000) / 10 : 0,
                last_played: ts ? new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : null,
                last_played_ts: ts,
                header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`
            };
        });
        processed.sort((a, b) => b.minutes - a.minutes);
        return { game_count: raw.response.game_count, total_hours: Math.round(totalMinutes / 60), games: processed };
    }

    const steam = liveJSON('/steam/library')
        .then(raw => ({ data: processSteamRaw(raw), isLive: true }))
        .catch(() => getJSON('data/games.json').then(data => ({ data, isLive: false })));

    // ---------------- Hypixel ----------------
    const networkLevel = exp => Math.floor((Math.sqrt((exp || 0) + 15312.5) - (125 / Math.sqrt(2))) / (25 * Math.sqrt(2)));
    const fmt = n => (n || 0).toLocaleString();
    const formatDate = ms => ms ? new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown';
    const RANKS = { NONE: 'Default', VIP: 'VIP', VIP_PLUS: 'VIP+', MVP: 'MVP', MVP_PLUS: 'MVP+' };

    function buildGeneral(player) {
        return {
            username: player.displayname,
            rank: RANKS[player.newPackageRank] || 'Default',
            network_level: networkLevel(player.networkExp),
            karma: fmt(player.karma),
            achievement_points: fmt(player.achievementPoints),
            first_login: formatDate(player.firstLogin),
            last_login: formatDate(player.lastLogin)
        };
    }

    function buildGames(player) {
        const s = player.stats || {}, ach = player.achievements || {};
        const bw = s.Bedwars || {}, sw = s.SkyWars || {}, du = s.Duels || {}, bb = s.BuildBattle || {}, mm = s.MurderMystery || {};
        return [
            { name: 'Bedwars', icon: 'red_wool', stats: [
                { label: 'Level', value: `${fmt(ach.bedwars_level)}★` }, { label: 'Wins', value: fmt(bw.wins_bedwars) },
                { label: 'Losses', value: fmt(bw.losses_bedwars) }, { label: 'Final Kills', value: fmt(bw.final_kills_bedwars) },
                { label: 'Final Deaths', value: fmt(bw.final_deaths_bedwars) }, { label: 'Beds Broken', value: fmt(bw.beds_broken_bedwars) }] },
            { name: 'SkyWars', icon: 'feather', stats: [
                { label: 'Kills', value: fmt(sw.kills) }, { label: 'Wins', value: fmt(sw.wins) }, { label: 'Losses', value: fmt(sw.losses) },
                { label: 'Deaths', value: fmt(sw.deaths) }, { label: 'Games Played', value: fmt(sw.games) }] },
            { name: 'Duels — Classic', icon: 'fishing_rod', stats: [
                { label: 'Wins', value: fmt(du.classic_duel_wins) }, { label: 'Losses', value: fmt(du.classic_duel_losses) },
                { label: 'Kills', value: fmt(du.classic_duel_kills) }, { label: 'Deaths', value: fmt(du.classic_duel_deaths) }] },
            { name: 'Duels — UHC (Solo)', icon: 'golden_apple', stats: [
                { label: 'Wins', value: fmt(du.uhc_duel_wins) }, { label: 'Losses', value: fmt(du.uhc_duel_losses) },
                { label: 'Kills', value: fmt(du.uhc_duel_kills) }, { label: 'Deaths', value: fmt(du.uhc_duel_deaths) }] },
            { name: 'Guess The Build', icon: 'painting', stats: [
                { label: 'Wins', value: fmt(bb.wins_guess_the_build) }, { label: 'Correct Guesses', value: fmt(bb.correct_guesses) }] },
            { name: 'Murder Mystery', icon: 'iron_sword', stats: [
                { label: 'Wins', value: fmt(mm.wins) }, { label: 'Kills', value: fmt(mm.kills) }, { label: 'Deaths', value: fmt(mm.deaths) },
                { label: 'Wins as Murderer', value: fmt(mm.murderer_wins) }, { label: 'Wins as Detective', value: fmt(mm.detective_wins) }] }
        ];
    }

    // SkyBlock always comes from the snapshot; player + minigames go live.
    const hypixel = getJSON('data/hypixel.json').then(snapshot =>
        liveJSON('/hypixel/player')
            .then(raw => ({ data: { ...snapshot, general: { ...snapshot.general, ...buildGeneral(raw.player) }, games: buildGames(raw.player) }, isLive: true }))
            .catch(() => ({ data: snapshot, isLive: false })));

    // ---------------- Marvel Rivals ----------------
    const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const HERO_ROLE_MAP = {
        'thor': 'Vanguard', 'magneto': 'Vanguard', 'doctor strange': 'Vanguard', 'devil dinosaur': 'Vanguard',
        'captain america': 'Vanguard', 'emma frost': 'Vanguard', 'rogue': 'Vanguard', 'peni parker': 'Vanguard',
        'groot': 'Vanguard', 'venom': 'Vanguard', 'bruce banner': 'Vanguard', 'hulk': 'Vanguard',
        'the thing': 'Vanguard', 'angela': 'Vanguard',
        'moon knight': 'Duelist', 'star-lord': 'Duelist', 'cyclops': 'Duelist', 'iron fist': 'Duelist',
        'mister fantastic': 'Duelist', 'the punisher': 'Duelist', 'wolverine': 'Duelist', 'blade': 'Duelist',
        'phoenix': 'Duelist', 'iron man': 'Duelist', 'hela': 'Duelist', 'psylocke': 'Duelist', 'namor': 'Duelist',
        'scarlet witch': 'Duelist', 'daredevil': 'Duelist', 'winter soldier': 'Duelist', 'squirrel girl': 'Duelist',
        'human torch': 'Duelist', 'black widow': 'Duelist', 'hawkeye': 'Duelist', 'spider-man': 'Duelist',
        'storm': 'Duelist', 'magik': 'Duelist', 'elsa bloodstone': 'Duelist', 'black panther': 'Duelist', 'black cat': 'Duelist',
        'rocket raccoon': 'Strategist', 'gambit': 'Strategist', 'jeff the land shark': 'Strategist', 'ultron': 'Strategist',
        'loki': 'Strategist', 'mantis': 'Strategist', 'adam warlock': 'Strategist', 'invisible woman': 'Strategist',
        'cloak & dagger': 'Strategist', 'cloak and dagger': 'Strategist', 'luna snow': 'Strategist', 'white fox': 'Strategist', 'jubilee': 'Strategist'
    };

    function processRivalsLive(raw) {
        const os = raw.overall_stats, heroes = raw.heroes_ranked || [];
        const totals = { Vanguard: {}, Duelist: {}, Strategist: {} };
        Object.values(totals).forEach(t => Object.assign(t, { matches: 0, wins: 0, k: 0, d: 0, a: 0 }));
        heroes.forEach(h => {
            const role = HERO_ROLE_MAP[(h.hero_name || '').toLowerCase()];
            if (!role) return;
            const t = totals[role];
            t.matches += +h.matches || 0; t.wins += +h.wins || 0; t.k += +h.kills || 0; t.d += +h.deaths || 0; t.a += +h.assists || 0;
        });
        const roles = ['Strategist', 'Duelist', 'Vanguard'].map(name => {
            const t = totals[name], per = m => t.matches > 0 ? (m / t.matches).toFixed(1) : '0.0';
            return {
                name, icon: `./assets/images/rivals/${name.toLowerCase()}.jpg`,
                wr: t.matches > 0 ? (t.wins / t.matches * 100).toFixed(1) + '%' : '0.0%',
                record: `${t.wins} W / ${t.matches - t.wins} L`,
                kda: (t.d > 0 ? (t.k + t.a) / t.d : 0).toFixed(2),
                kdaSplit: `${per(t.k)} / ${per(t.d)} / ${per(t.a)}`
            };
        });
        const topHeroes = heroes.slice().sort((x, y) => (y.play_time || 0) - (x.play_time || 0)).slice(0, 5).map(h => {
            const m = +h.matches || 0, w = +h.wins || 0, k = +h.kills || 0, d = +h.deaths || 0, a = +h.assists || 0;
            return {
                name: h.hero_name, icon: `./assets/images/rivals/${slug(h.hero_name)}.jpg`,
                wr: m > 0 ? (w / m * 100).toFixed(1) + '%' : '0.0%', record: `${w} W / ${m - w} L`,
                kda: (d > 0 ? (k + a) / d : 0).toFixed(2)
            };
        });
        const ranked = os.ranked || {}, unranked = os.unranked || {};
        const matches = +os.total_matches || 0, wins = +os.total_wins || 0;
        const K = (+ranked.total_kills || 0) + (+unranked.total_kills || 0);
        const A = (+ranked.total_assists || 0) + (+unranked.total_assists || 0);
        return {
            roles, topHeroes,
            summary: {
                winRate: matches > 0 ? Math.floor(wins / matches * 100) : 0,
                matches: matches.toLocaleString(), wins: wins.toLocaleString(),
                kos: K.toLocaleString(), assists: A.toLocaleString()
            }
        };
    }

    const rivals = getJSON('data/rivals.json').then(data =>
        liveJSON('/rivals/player')
            .then(raw => {
                const live = processRivalsLive(raw);
                return { data: { ...data, ...live, summary: { ...data.summary, ...live.summary } }, isLive: true };
            })
            .catch(() => ({ data, isLive: false })));

    // ---------------- Overwatch ----------------
    // OverFast (a free public Overwatch stats API) allows browser requests,
    // so this goes straight there; the snapshot keeps hero names and portraits.
    const OVERFAST = 'https://overfast-api.tekrop.fr/players/landon-12471';
    function overfast(path, ms = 6000) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), ms);
        return fetch(OVERFAST + path, { signal: controller.signal })
            .then(r => { clearTimeout(t); if (!r.ok) throw new Error('OverFast request failed'); return r.json(); });
    }
    const overwatch = getJSON('data/overwatch.json').then(data =>
        Promise.all([overfast('/stats/summary'), overfast('/summary')])
            .then(([stats, profile]) => {
                if (!stats?.general || !profile?.username) throw new Error('OverFast returned no profile');
                return { data: { ...data, stats, profile }, isLive: true };
            })
            .catch(() => ({ data, isLive: false })));

    window.GamesData = { steam, rivals, hypixel, overwatch };
})();
