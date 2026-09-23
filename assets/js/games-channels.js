// Draws the three channel pages (Marvel Rivals, Steam, Hypixel) from
// window.GamesData. Each render runs once, the first time its channel
// is opened. Exposes window.GamesChannels = { rivals, steam, hypixel, realm }.
(function () {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
    const commas = n => Math.round(n).toLocaleString();
    const short = n => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));
    const MC_ICON = n => `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/${n}.png`;
    const store = {
        get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
    };

    // Small line icons used in stat tiles.
    const ICON = {
        clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        games: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v4M6 13h4"/><circle cx="15.5" cy="12" r="1"/><circle cx="17.5" cy="14.5" r="1"/></svg>',
        calendar: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
        box: '<svg viewBox="0 0 24 24"><path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z"/><path d="m3.5 8 8.5 4 8.5-4M12 12v8"/></svg>',
        trophy: '<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8"/></svg>',
        swords: '<svg viewBox="0 0 24 24"><path d="m4 4 9 9M20 4l-9 9M6 16l-2 2 2 2 2-2M18 16l2 2-2 2-2-2M9 14l-3 3M15 14l3 3"/></svg>',
        target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>',
        star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
        coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v12"/></svg>',
        users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="16.5" cy="8" r="2.6"/><path d="M16 13.2c2.3.1 4 1.4 4.5 4"/></svg>',
        scroll: '<svg viewBox="0 0 24 24"><path d="M7 4h11v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1h11v1a3 3 0 0 0 3 3"/><path d="M7 4a2 2 0 0 0-2 2v10M10 9h5M10 12h5"/></svg>'
    };

    function tile(icon, value, label, extra = '') {
        return `<div class="card tile-stat"><span class="ti">${ICON[icon] || ''}</span><div><b>${value}</b><span>${label}</span>${extra}</div></div>`;
    }

    function head(title, sub, isLive, savedOn) {
        return `<header class="ch-head">
            <div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
            <span class="live-chip ${isLive ? 'on' : ''}">${isLive ? '● Live' : `Saved ${esc(savedOn || '')}`}</span>
        </header>`;
    }

    // ============================================================
    // Marvel Rivals
    // ============================================================
    function minutesPlayed(hero) {
        const tp = hero.statistics.find(s => s.label === 'Time Played');
        if (!tp) return hero.hours * 60;
        if (tp.total.includes('Hrs')) return parseFloat(tp.total) * 60;
        if (tp.total.includes('<')) return 0.5;
        const m = tp.total.match(/(\d+)/);
        return m ? +m[1] : hero.hours * 60;
    }
    const hoursLabel = h => { const m = minutesPlayed(h); return m === 0 ? '0 MINS' : m < 1 ? '<1 MIN' : m < 60 ? `${Math.round(m)} MINS` : `${h.hours} HRS`; };
    // Hero colours range from near-black (Punisher) to near-white (Emma Frost);
    // heroTint nudges them into a range that reads on the white cards.
    function luma(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
        if (!m) return 0.4;
        const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    function heroTint(hex) {
        const c = hex || '#7b4fd6', l = luma(c);
        if (l < 0.18) return `color-mix(in srgb, ${c} 70%, #8a8fa3)`;
        if (l > 0.62) return `color-mix(in srgb, ${c} 45%, #4a5068)`;
        return c;
    }

    // Icons for the career screen's Stat Highlights row.
    const RIVAL_ICON = {
        'Time Played': '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="11"/><path d="M16 10v7l5 3M12 3h8"/></svg>',
        'Matches Played': '<svg viewBox="0 0 32 32"><path d="M5 26 16 6l11 20z"/><path d="m11 26 5-9 5 9"/></svg>',
        'Wins': '<svg viewBox="0 0 32 32"><path d="M8 28V5M8 6h15l-3 5 3 5H8"/></svg>',
        'KOs': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/><path d="m10 10 12 12M22 10 10 22"/></svg>',
        'Assists': '<svg viewBox="0 0 32 32"><path d="M9 17v-5a2 2 0 0 1 4 0v3-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v6c0 5-4 8-8 8h-2c-3 0-5-2-6-4l-3-5a2 2 0 0 1 3-2z"/></svg>',
        'Best KO Streak': '<svg viewBox="0 0 32 32"><path d="M16 3 27 7v8c0 7-5 12-11 14C10 27 5 22 5 15V7z"/><path d="m11 16 4 4 7-8"/></svg>'
    };

    // Hero proficiency tiers, lowest level of each.
    const TIERS = [[20, 'Lord', '#e0a100'], [15, 'Centurion', '#a45bff'], [10, 'Captain', '#4f6bef'], [5, 'Knight', '#2f9fc4'], [1, 'Agent', '#8d93a3']];
    const tierOf = lv => { const t = TIERS.find(([min]) => lv >= min) || TIERS[TIERS.length - 1]; return { name: t[1], color: t[2] }; };

    // Competitive rank from rank score: every 100 points is one division, starting at Bronze III (3000).
    const RANKS = [['Bronze', '#c07a45'], ['Silver', '#8fa1b5'], ['Gold', '#e8a820'], ['Platinum', '#2fb5bf'], ['Diamond', '#4f86f7'], ['Grandmaster', '#9b55f2'], ['Celestial', '#f2609e']];
    function rankOf(score) {
        const lv = Math.max(1, Math.floor((score - 3000) / 100) + 1);
        if (lv >= 23) return { name: 'One Above All', color: '#ff4655' };
        if (lv === 22) return { name: 'Eternity', color: '#ff7a45' };
        const [tier, color] = RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 3))];
        return { name: `${tier} ${['III', 'II', 'I'][(lv - 1) % 3]}`, color };
    }

    // Career overview award badges, drawn after the in-game icons.
    const AWARD_ICON = {
        'MVP': '<i class="aw-txt mvp">MVP</i>',
        'SVP': '<i class="aw-txt svp">SVP</i>',
        'Mighty Vanquisher': '<svg viewBox="0 0 32 32" style="--ic:#e0444e"><path d="M5 5l14 14M27 5 13 19M9 21l-4 4 2 2 4-4M23 21l4 4-2 2-4-4M5 5l3 0 0 3M27 5h-3v3"/></svg>',
        'Relentless Offense': '<svg viewBox="0 0 32 32" style="--ic:#f07a22"><path class="f" d="M16 3c1 5 7 8 7 15a7 7 0 0 1-14 0c0-4 2-6 3-8 1 3 2 4 3 4 0-4-1-7 1-11z"/></svg>',
        'Impenetrable Defense': '<svg viewBox="0 0 32 32" style="--ic:#4a9ca8"><path class="f" d="M16 3 26 7v8c0 7-4 12-10 14C10 27 6 22 6 15V7z"/></svg>',
        'Trusty Sidekick': '<svg viewBox="0 0 32 32" style="--ic:#a8844c"><path class="f" d="M9 13a2 2 0 0 1 4 0v-2a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v6c0 5-3 8-8 8h-1c-4 0-7-3-7-7z"/></svg>',
        'Gifted Healer': '<svg viewBox="0 0 32 32" style="--ic:#7cb342"><path class="f" d="M12 4h8v8h8v8h-8v8h-8v-8H4v-8h8z"/></svg>',
        'Triple!': '<i class="aw-txt tri">3</i>'
    };

    async function rivals(el) {
        const { data: d, isLive } = await window.GamesData.rivals;
        const s = d.summary;
        const heroes = d.heroStats.slice().sort((a, b) => minutesPlayed(b) - minutesPlayed(a));
        const maxMin = minutesPlayed(heroes[0]);
        const lordArt = Object.fromEntries(d.heroes.map(h => [h.name.toLowerCase(), h]));
        const perGame = v => (num(v) / num(s.matches)).toFixed(1);
        const prof = d.proficiency || {};
        const lvOf = name => prof[name] || 1;
        const upNext = Object.entries(prof).filter(([, lv]) => lv < 20).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const iconFor = name => `./assets/images/rivals/${name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`;
        const ranks = d.rankHistory || [];
        const rankMax = Math.max(4400, ...ranks.map(r => r.peak));
        const best = ranks.reduce((b, r) => r.peak > (b?.peak || 0) ? r : b, null);

        el.innerHTML = `<div class="ch-body">
            ${head('Marvel Rivals', 'career stats, roles, and every lord I\'ve earned', isLive, d.last_updated)}

            <section class="card rv-profile">
                <div class="rv-top">
                    <div class="rv-banner"><img src="${esc(d.profile.icon)}" alt="${esc(d.profile.username)}'s nameplate banner"></div>
                    <div class="rv-tiles">
                        <div class="ring" style="--p:${s.winRate}"><div><b>${s.winRate}%</b><span>win rate</span></div></div>
                        <div class="rv-fig"><b>${esc(s.wins)}</b><span>wins</span></div>
                        <div class="rv-fig"><b>${esc(s.matches)}</b><span>matches</span></div>
                        ${s.hours ? `<div class="rv-fig accent"><b>${s.hours}</b><span>hours</span></div>` : ''}
                    </div>
                </div>
                <div class="rv-name">
                    <b>${esc(d.profile.username)}</b>
                    <span>${esc(s.matches)} games · ${d.heroes.length} lords</span>
                    ${s.highest ? `<em class="rv-rank">Career best · ${esc(s.highest)}</em>` : ''}
                </div>
                <div class="rv-kda">
                    <div class="rv-kda-label">Career totals</div>
                    <div class="rv-totals">
                        <div><b>${esc(s.kos)}</b><span>KOs · ${perGame(s.kos)} a game</span></div>
                        <div><b>${esc(s.assists)}</b><span>assists · ${perGame(s.assists)} a game</span></div>
                        ${s.bestStreak ? `<div><b>${s.bestStreak}</b><span>best KO streak</span></div>` : ''}
                    </div>
                    ${(s.awards || []).length ? `<div class="rv-awards">${s.awards.map(([name, n]) => `
                        <div class="aw">${AWARD_ICON[name] || ''}<div><b>${n.toLocaleString()}</b><span>${esc(name)}</span></div></div>`).join('')}
                    </div>` : ''}
                </div>
            </section>

            <h2 class="ch-h">Roles</h2>
            <div class="row3">${d.roles.map(r => `
                <div class="card role">
                    <img src="${esc(r.icon)}" alt="">
                    <div class="role-main">
                        <b>${esc(r.name)}</b>
                        <div class="rbar"><i style="width:${num(r.wr)}%"></i></div>
                        <span>${esc(r.wr)} win rate</span>
                        <small>${esc(r.record)}</small>
                    </div>
                    <div class="role-kda">${r.hours != null ? `<b>${r.hours}</b><span>hours</span>` : `<b>${esc(r.kda)}</b><span>KDA</span>`}</div>
                </div>`).join('')}
            </div>

            <h2 class="ch-h">Top Heroes</h2>
            <div class="tops">${d.topHeroes.map((h, i) => `
                <div class="card top">
                    <span class="place">#${i + 1}</span>
                    <img src="${esc(h.icon)}" alt="" onerror="this.style.visibility='hidden'">
                    <b>${esc(h.name)}</b>
                    <span class="wr">${esc(h.wr)}</span>
                    <small>${esc(h.record)} · ${h.hours != null ? `${h.hours} hrs` : `${esc(h.kda)} KDA`}</small>
                </div>`).join('')}
            </div>

            ${ranks.length ? `
            <h2 class="ch-h">Ranked Journey ${best ? `<span class="count">best ${esc(rankOf(best.peak).name)}</span>` : ''}</h2>
            <section class="card journey">${ranks.map(r => {
                const rk = rankOf(r.peak), idle = r.current && !r.games;
                return `
                <div class="jr ${idle ? 'idle' : ''}" style="--rc:${rk.color}">
                    <span class="jr-col"><span class="jr-bar" style="height:${Math.max(8, (r.peak - 3000) / (rankMax - 3000) * 100).toFixed(1)}%"><i class="gem"></i></span></span>
                    <b>${esc(r.season)}</b>
                    <span class="jr-rank">${idle ? 'Not played yet' : esc(rk.name)}</span>
                    <small>${idle ? 'current season' : r.games ? `${r.wins} W · ${r.games} games` : `${r.wins} wins`}</small>
                </div>`;
            }).join('')}
            </section>` : ''}

            <h2 class="ch-h gold">Lord Heroes <span class="count">${d.heroes.length}</span></h2>
            <div class="lords">${d.heroes.map(h => `
                <figure class="lord" style="--hc:${esc(h.color || '#7b4fd6')}">
                    <div class="lord-art"><img src="${esc(h.image)}" alt="${esc(h.name)} lord card" onerror="this.onerror=null;this.src='${esc(iconFor(h.name))}'"><span class="crown">LORD</span></div>
                    <figcaption><b>${esc(h.name)}</b><span>${h.dateObtained ? esc(h.dateObtained) : 'New this season'}</span></figcaption>
                </figure>`).join('')}
            </div>
            ${upNext.length ? `
            <div class="up-next">
                <span class="up-cap">Next Lords</span>
                ${upNext.map(([name, lv]) => { const t = tierOf(lv); return `
                <div class="card up" style="--tc:${t.color}">
                    <img src="${esc(iconFor(name))}" alt="" onerror="this.style.visibility='hidden'">
                    <div>
                        <b>${esc(name)}</b>
                        <span>${t.name} · Lv ${lv}</span>
                        <div class="rbar"><i style="width:${(lv / 20 * 100).toFixed(0)}%"></i></div>
                        <small>${20 - lv} levels to Lord</small>
                    </div>
                </div>`; }).join('')}
            </div>` : ''}

            <h2 class="ch-h">Career <span class="count">${heroes.length} heroes</span></h2>
            <section class="card career" id="career">
                <div class="cr-heroes">
                    <div class="cr-cap">Hero</div>
                    <div class="cr-list">${heroes.map((h, i) => `
                        <button class="cr-hero" data-i="${i}" style="--hc:${esc(heroTint(h.color))}" aria-label="${esc(h.name)}, ${hoursLabel(h)}">
                            <span class="cr-thumb" style="--tc:${tierOf(lvOf(h.name)).color}"><img src="${esc(h.icon)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><i title="${tierOf(lvOf(h.name)).name} level ${lvOf(h.name)}">${lvOf(h.name)}</i></span>
                            <span class="cr-meta">
                                <span class="cr-line"><b>${esc(h.name)}</b><em>${hoursLabel(h)}</em></span>
                                <span class="cr-track"><i style="width:${minutesPlayed(h) ? Math.max(3, minutesPlayed(h) / maxMin * 100).toFixed(1) : 0}%"></i></span>
                            </span>
                        </button>`).join('')}
                    </div>
                </div>
                <div class="cr-main" id="crMain"></div>
            </section>
        </div>`;

        const mainEl = el.querySelector('#crMain'), careerEl = el.querySelector('#career');
        function show(i) {
            const h = heroes[i];
            el.querySelectorAll('.cr-hero').forEach((b, j) => b.classList.toggle('on', j === i));
            const tp = h.statistics.find(x => x.label === 'Time Played');
            const tpVal = tp ? tp.total.replace(/\s*Hrs/i, '') : String(h.hours);
            const highlights = [{ label: 'Time Played', value: tpVal, unit: /Hrs/i.test(tp?.total || 'Hrs') ? 'HRS' : '' }, ...h.highlights];
            const lord = lordArt[h.name.toLowerCase()];
            careerEl.style.setProperty('--hc', heroTint(h.color));
            careerEl.style.setProperty('--hc-bg', h.color || '#7b4fd6');
            careerEl.classList.toggle('light', luma(h.color) > 0.62);
            mainEl.innerHTML = `
                <div class="cr-spot">
                    <div class="cr-who">
                        ${lord ? `<span class="cr-badge">★ Lord · Lv ${lvOf(h.name)}</span>` : `<span class="cr-badge tier" style="--tc:${tierOf(lvOf(h.name)).color}">${tierOf(lvOf(h.name)).name} · Lv ${lvOf(h.name)}</span>`}
                        <b>${esc(h.name)}</b>
                        <span>#${i + 1} most played · ${hoursLabel(h).toLowerCase()}</span>
                    </div>
                    <img class="cr-face" src="${esc(h.icon)}" alt="">
                </div>
                <div class="cr-cap">Stat Highlights</div>
                <div class="cr-high">${highlights.slice(0, 6).map(x => `
                    <div>${RIVAL_ICON[x.label] || ''}<b>${esc(x.value)}${x.unit ? `<small>${x.unit}</small>` : ''}</b><span>${esc(x.label)}</span></div>`).join('')}
                </div>
                <div class="cr-cap">Statistics</div>
                <div class="cr-table">
                    <div class="cr-row cr-th"><span></span><span>Total</span><span>Best</span><span>Avg / 10 min</span></div>
                    ${h.statistics.map(x => `<div class="cr-row"><span>${esc(x.label)}</span><span>${esc(x.total)}</span><span>${x.best === '—' ? '' : esc(x.best)}</span><span>${x.avg === '—' ? '' : esc(x.avg)}</span></div>`).join('')}
                </div>`;
        }
        el.querySelectorAll('.cr-hero').forEach(b => b.addEventListener('click', () => show(+b.dataset.i)));
        show(0);
    }

    // ============================================================
    // Steam
    // ============================================================
    const PIE_COLORS = ['#1aa3e8', '#7b4fd6', '#f5a623', '#4caf50', '#e8505b', '#00bfa5', '#b8c2cc'];

    // Games that belong together ("WWE 2K22", "WWE 2K23"…) for franchise totals.
    function franchiseOf(name) {
        const n = name.replace(/[®™]/g, '').trim();
        const known = ['WWE 2K', 'LEGO', 'Grand Theft Auto', 'Call of Duty', 'Minecraft', 'Borderlands', 'Five Nights at Freddy', 'Resident Evil', 'Portal', 'Left 4 Dead', 'Dark Souls', 'Plants vs', 'Sonic', 'Marvel'];
        return known.find(k => n.toLowerCase().startsWith(k.toLowerCase())) || null;
    }

    async function steam(el) {
        const { data, isLive } = await window.GamesData.steam;
        const games = (data.games || []).slice().sort((a, b) => b.minutes - a.minutes);
        const total = data.total_hours || 0;
        const pile = games.filter(g => g.minutes < 6);
        const top = games.slice(0, 10);
        const byRecent = games.filter(g => g.last_played_ts).sort((a, b) => b.last_played_ts - a.last_played_ts);
        const recent = byRecent.slice(0, 6);

        const slices = games.slice(0, 6).map((g, i) => ({ name: g.name, hours: g.hours, color: PIE_COLORS[i] }));
        slices.push({ name: 'Everything else', hours: Math.max(0, Math.round(total - slices.reduce((s, x) => s + x.hours, 0))), color: PIE_COLORS[6] });
        const podium = [top[1], top[0], top[2]].filter(Boolean);

        // Franchise totals (only franchises with 2+ games)
        const fr = {};
        games.forEach(g => { const f = franchiseOf(g.name); if (f) { (fr[f] ||= { hours: 0, count: 0 }); fr[f].hours += g.hours; fr[f].count++; } });
        const franchises = Object.entries(fr).filter(([, v]) => v.count > 1).sort((a, b) => b[1].hours - a[1].hours).slice(0, 4);

        // Superlatives: each award goes to a different game.
        const used = new Set();
        const pick = list => { const g = list.find(x => !used.has(x.appid)); if (g) used.add(g.appid); return g; };
        const twoMonthsAgo = Date.now() / 1000 - 60 * 86400;
        const main = pick(top);
        const obsessed = pick(byRecent);
        const fresh = pick(byRecent.filter(g => g.hours >= 0.3 && g.hours < 15));
        const oldFlame = pick(games.filter(g => g.hours >= 20 && g.last_played_ts).sort((a, b) => a.last_played_ts - b.last_played_ts));
        const onceOnly = pick(games.filter(g => g.minutes >= 6 && g.minutes <= 60 && g.last_played_ts < twoMonthsAgo).sort((a, b) => b.last_played_ts - a.last_played_ts));
        const awards = [
            main && ['Main Character', main, `${commas(main.hours)}h, ${main.pct}% of everything`],
            obsessed && ['Currently Obsessed', obsessed, `last played ${obsessed.last_played} · ${obsessed.hours}h`],
            fresh && ['Honeymoon Phase', fresh, `just started · ${fresh.hours}h so far`],
            oldFlame && ['Old Flame', oldFlame, `${commas(oldFlame.hours)}h, untouched since ${oldFlame.last_played}`],
            onceOnly && ['Tried It Once', onceOnly, `${onceOnly.minutes} minutes and never again`]
        ].filter(Boolean);

        el.innerHTML = `<div class="ch-body">
            ${head('Steam', 'everything in the library, and where all the hours went', isLive, data.last_updated)}

            <div class="tiles4">
                ${tile('games', (data.game_count || games.length).toLocaleString(), 'games owned')}
                ${tile('clock', total.toLocaleString(), 'hours played')}
                ${tile('calendar', (total / 24).toFixed(1), 'days of my life')}
                ${tile('box', pile.length, 'never really played')}
            </div>
            <div class="fun-chips">
                <span>≈ <b>${commas(total / 2)}</b> movies back to back</span>
                <span>≈ <b>${commas(total / 60)}</b> flights around the world</span>
                <span>≈ <b>${(total / 2080).toFixed(1)}</b> years of full-time work</span>
            </div>

            <h2 class="ch-h">Most Played</h2>
            <div class="podium">${podium.map(g => {
                const place = g === top[0] ? 1 : g === top[1] ? 2 : 3;
                return `<a class="pod p${place}" href="https://store.steampowered.com/app/${g.appid}" target="_blank" rel="noopener">
                    <img src="${esc(g.header_image)}" alt="" loading="lazy">
                    <b>${esc(g.name)}</b><span>${g.hours.toLocaleString()}h</span>
                    <div class="step">${place}</div>
                </a>`;
            }).join('')}</div>
            <div class="card ranks">${top.slice(3).map((g, i) => `
                <a class="rank" href="https://store.steampowered.com/app/${g.appid}" target="_blank" rel="noopener">
                    <span class="n">${i + 4}</span>
                    <img src="${esc(g.header_image)}" alt="" loading="lazy">
                    <span class="name">${esc(g.name)}</span>
                    <span class="rbar"><i style="width:${(g.minutes / top[0].minutes * 100).toFixed(1)}%"></i></span>
                    <span class="h">${g.hours.toLocaleString()}h</span>
                </a>`).join('')}
            </div>

            <h2 class="ch-h">Where The Time Went</h2>
            <div class="card split">
                <div class="split-bar">${slices.map(x => `<i style="flex:${Math.max(x.hours, 0.5)};background:${x.color}" title="${esc(x.name)}: ${x.hours}h"></i>`).join('')}</div>
                <div class="legend">${slices.map(x => `<span><i style="background:${x.color}"></i>${esc(x.name)} <em>${Math.round(x.hours / total * 100)}%</em></span>`).join('')}</div>
                ${franchises.length ? `<div class="franchises">${franchises.map(([f, v]) => `<div><b>${esc(f)}</b><span>${commas(v.hours)}h across ${v.count} games</span></div>`).join('')}</div>` : ''}
            </div>

            <h2 class="ch-h">Superlatives</h2>
            <div class="awards">${awards.map(([title, g, why]) => `
                <a class="card award" href="https://store.steampowered.com/app/${g.appid}" target="_blank" rel="noopener">
                    <span class="ribbon">${esc(title)}</span>
                    <img src="${esc(g.header_image)}" alt="" loading="lazy">
                    <b>${esc(g.name)}</b><span>${esc(why)}</span>
                </a>`).join('')}
            </div>

            <h2 class="ch-h">Higher or Lower</h2>
            <div class="card hol" id="hol">
                <p class="hol-q">Which one have I played more?</p>
                <div class="hol-pair" id="holPair"></div>
                <div class="hol-foot"><span>Streak <b id="holStreak">0</b></span><span>Best <b id="holBest">${store.get('holBest') || 0}</b></span><button class="ch-btn" id="holNext" hidden>Next round</button></div>
            </div>

            <div class="two">
                <div>
                    <h2 class="ch-h">Recently Played</h2>
                    <div class="card recent">${recent.map(g => `
                        <div class="rec"><img src="${esc(g.header_image)}" alt="" loading="lazy"><div><b>${esc(g.name)}</b><span>${esc(g.last_played || '')} · ${g.hours}h</span></div></div>`).join('')}
                    </div>
                </div>
                <div>
                    <h2 class="ch-h">The Pile Of Shame</h2>
                    <div class="card shame">
                        <p><b>${pile.length}</b> games I own and have barely (or never) opened.</p>
                        <div class="shame-pick" id="shamePick"><span>?</span></div>
                        <button class="ch-btn" id="shameBtn">Pick one for me</button>
                    </div>
                </div>
            </div>

            <h2 class="ch-h">Full Library <span class="count">${games.length}</span></h2>
            <div class="lib-tools">
                <input class="ch-search" id="libSearch" type="search" placeholder="Search the library…" aria-label="Search the library">
                <div class="chips" id="libSort">
                    <button class="chip on" data-sort="hours">Most played</button>
                    <button class="chip" data-sort="recent">Recent</button>
                    <button class="chip" data-sort="name">A–Z</button>
                    <button class="chip" data-sort="pile">Unplayed</button>
                </div>
            </div>
            <div class="lib-grid" id="libGrid"></div>
            <div class="lib-more"><button class="ch-btn" id="libMore">Show more</button></div>
        </div>`;

        // Pile of shame
        el.querySelector('#shameBtn').addEventListener('click', () => {
            if (!pile.length) return;
            const g = pile[Math.floor(Math.random() * pile.length)];
            el.querySelector('#shamePick').innerHTML = `<a href="https://store.steampowered.com/app/${g.appid}" target="_blank" rel="noopener"><img src="${esc(g.header_image)}" alt=""><b>${esc(g.name)}</b></a>`;
        });

        // Higher or Lower: pick two played games with different hours.
        const pool = games.filter(g => g.hours >= 1);
        let streak = 0, best = +(store.get('holBest') || 0), pair = [];
        const pairEl = el.querySelector('#holPair'), nextBtn = el.querySelector('#holNext');
        function round() {
            do { pair = [pool[Math.floor(Math.random() * pool.length)], pool[Math.floor(Math.random() * pool.length)]]; }
            while (pair[0] === pair[1] || pair[0].hours === pair[1].hours);
            nextBtn.hidden = true;
            pairEl.innerHTML = pair.map((g, i) => `
                <button class="hol-card" data-i="${i}">
                    <img src="${esc(g.header_image)}" alt="">
                    <b>${esc(g.name)}</b>
                    <span class="hol-h">?</span>
                </button>`).join('<span class="hol-vs">VS</span>');
            pairEl.querySelectorAll('.hol-card').forEach(b => b.addEventListener('click', () => guess(+b.dataset.i)));
        }
        function guess(i) {
            if (!nextBtn.hidden) return;
            const right = pair[i].hours > pair[1 - i].hours;
            pairEl.querySelectorAll('.hol-card').forEach((b, j) => {
                b.querySelector('.hol-h').textContent = `${pair[j].hours.toLocaleString()}h`;
                b.classList.add(pair[j].hours > pair[1 - j].hours ? 'win' : 'lose');
                if (j === i) b.classList.add('picked');
            });
            streak = right ? streak + 1 : 0;
            if (streak > best) { best = streak; store.set('holBest', best); }
            el.querySelector('#holStreak').textContent = streak;
            el.querySelector('#holBest').textContent = best;
            nextBtn.textContent = right ? 'Next round' : 'Try again';
            nextBtn.hidden = false;
        }
        nextBtn.addEventListener('click', round);
        if (pool.length > 1) round();

        // Library grid
        let sort = 'hours', query = '', shown = 24;
        const grid = el.querySelector('#libGrid'), more = el.querySelector('#libMore');
        function list() {
            let l = games.filter(g => g.name.toLowerCase().includes(query));
            if (sort === 'name') l = l.slice().sort((a, b) => a.name.localeCompare(b.name));
            if (sort === 'recent') l = l.slice().sort((a, b) => (b.last_played_ts || 0) - (a.last_played_ts || 0));
            if (sort === 'pile') l = l.filter(g => g.minutes < 6);
            return l;
        }
        function draw() {
            const l = list();
            grid.innerHTML = l.length ? l.slice(0, shown).map(g => `
                <a class="cap" href="https://store.steampowered.com/app/${g.appid}" target="_blank" rel="noopener" title="${esc(g.name)}">
                    <img src="${esc(g.header_image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
                    <span class="cap-name">${esc(g.name)}</span>
                    <span class="cap-h">${g.minutes < 6 ? 'unplayed' : g.hours.toLocaleString() + 'h'}</span>
                </a>`).join('') : '<p class="empty">No games match that.</p>';
            more.hidden = l.length <= shown;
        }
        el.querySelector('#libSearch').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); shown = 24; draw(); });
        el.querySelectorAll('#libSort .chip').forEach(c => c.addEventListener('click', () => {
            sort = c.dataset.sort; shown = 24;
            el.querySelectorAll('#libSort .chip').forEach(x => x.classList.toggle('on', x === c));
            draw();
        }));
        more.addEventListener('click', () => { shown += 24; draw(); });
        draw();
    }

    // ============================================================
    // Hypixel
    // ============================================================
    const SKILL_MAX = { runecrafting: 25, social: 25, carpentry: 50, alchemy: 50, taming: 60, fishing: 50, enchanting: 60, farming: 60, mining: 60, combat: 60, foraging: 54, hunting: 25 };
    const SKILL_ICON = { alchemy: 'brewing_stand', carpentry: 'oak_sign', combat: 'stone_sword', enchanting: 'enchanted_book', farming: 'golden_hoe', fishing: 'fishing_rod', foraging: 'iron_axe', hunting: 'lead', mining: 'stone_pickaxe', runecrafting: 'magma_cream', social: 'emerald', taming: 'bone' };
    const RARITY = { COMMON: '#ffffff', UNCOMMON: '#55ff55', RARE: '#5555ff', EPIC: '#aa00aa', LEGENDARY: '#ffaa00', MYTHIC: '#ff55ff', SPECIAL: '#ff5555' };
    const CLASS_ICON = { archer: 'bow', berserk: 'iron_sword', healer: 'potion', mage: 'blaze_rod', tank: 'leather_chestplate' };
    const mmss = ms => ms ? `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}` : '—';
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

    function skinViewer(canvas, skin, w, h) {
        try {
            const v = new skinview3d.SkinViewer({ canvas, width: w, height: h, skin });
            v.controls.enableRotate = true;
            v.controls.enableZoom = false;
            v.controls.enablePan = false;
            v.zoom = 0.9;
            v.background = null;
            try { v.animation = new skinview3d.IdleAnimation(); } catch (e) {}
            return v;
        } catch (e) {
            canvas.replaceWith(Object.assign(document.createElement('p'), { className: 'empty', textContent: '3D skin unavailable' }));
        }
    }

    function slot(icon) {
        return `<span class="slot"><img src="${MC_ICON(icon)}" alt="" onerror="this.style.visibility='hidden'"></span>`;
    }

    function gameCard(g) {
        const find = label => g.stats.find(s => s[0] === label);
        const wins = find('Wins'), losses = find('Losses');
        const wl = wins && losses ? num(wins[1]) / (num(wins[1]) + num(losses[1])) * 100 : null;
        const wide = g.modes ? ' wide' : '';
        return `<div class="card mini${wide}">
            <div class="mini-head">${slot(g.icon)}<b>${esc(g.name)}</b></div>
            <div class="mini-big"><b>${esc(g.headline[0])}</b><span>${esc(g.headline[1])}</span></div>
            ${wl !== null ? `<div class="wl" title="win share"><i style="width:${wl.toFixed(1)}%"></i></div>` : ''}
            <div class="mini-body">
                <div class="mini-rows">${g.stats.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
                    ${(g.extra || []).map(([k, v]) => `<div class="x"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
                ${g.modes ? `<div class="modes"><div class="m-row m-th">${g.modes.cols.map(c => `<span>${esc(c)}</span>`).join('')}</div>
                    ${g.modes.rows.map(r => `<div class="m-row">${r.map(c => `<span>${esc(c)}</span>`).join('')}</div>`).join('')}</div>` : ''}
            </div>
        </div>`;
    }

    async function hypixel(el) {
        const { data, isLive } = await window.GamesData.hypixel;
        const g = data.general, net = data.network, sp = data.skyblock_plus, sb = data.skyblock;
        const games = net ? net.games : [];
        const totalWins = games.reduce((sum, x) => {
            const w = x.stats.find(s => s[0] === 'Wins');
            return sum + (w ? num(w[1]) : x.headline[1] === 'Wins' ? num(x.headline[0]) : 0);
        }, 0);
        const bw = games.find(x => x.name === 'Bed Wars'), duels = games.find(x => x.name === 'Duels');

        el.innerHTML = `<div class="ch-body">
            ${head('Hypixel', 'eleven years of minigames, and a very serious SkyBlock profile', isLive, data.last_updated)}

            <section class="card mc-profile">
                <canvas id="skinMe" class="skin"></canvas>
                <div class="mc-info">
                    <div class="mc-name"><span class="rank-badge">[${esc(g.rank).replace('+', '<i>+</i>')}]</span> ${esc(g.username || 'landay')}</div>
                    <div class="mc-level"><span class="lvl">${esc(g.network_level)}</span><div><b>Network Level ${g.level_exact ? `<small>${g.level_exact}</small>` : ''}</b><span>${esc(g.highest_monthly_rank || '')}</span></div>
                        ${g.guild ? `<div class="guild">${ICON.users}<div><b>${esc(g.guild.name)}</b><span>${esc(g.guild.rank)} · since ${esc(g.guild.joined)}</span></div></div>` : ''}
                    </div>
                    <div class="mc-stats">
                        <div><b>${esc(g.karma)}</b><span>Karma</span></div>
                        <div><b>${esc(g.achievement_points)}</b><span>Achievement points</span></div>
                        ${g.quests_completed ? `<div><b>${esc(g.quests_completed)}</b><span>Quests completed</span></div>` : ''}
                        <div><b>${esc(g.first_login)}</b><span>First login</span></div>
                        <div><b>${esc(g.last_login)}</b><span>Last login</span></div>
                    </div>
                </div>
            </section>

            ${net ? `
            <div class="tiles4" style="margin-top:1.2rem">
                ${tile('trophy', commas(totalWins), 'wins across the network')}
                ${tile('swords', esc(duels?.stats.find(s => s[0] === 'W/L')?.[1] || '—'), 'Duels W/L')}
                ${tile('target', esc(bw?.stats.find(s => s[0] === 'FKDR')?.[1] || '—'), 'Bed Wars FKDR')}
                ${tile('scroll', esc(g.quests_completed || '—'), 'quests completed')}
            </div>

            <h2 class="ch-h mc">Minigames</h2>
            <div class="mini-grid">${games.map(gameCard).join('')}</div>` : ''}

            ${sp ? `
            <h2 class="ch-h mc">SkyBlock · ${esc(sp.summary.profile)}</h2>
            <div class="sb-top">
                <div class="card sb-money">
                    <span class="lbl">Networth</span><b class="big">${short(sp.summary.networth.normal)}</b>
                    <div class="sb-coins"><div><span>Purse</span><b>${short(sp.summary.purse)}</b></div><div><span>Bank</span><b>${short(sp.summary.bank)}</b></div><div><span>No cosmetics</span><b>${short(sp.summary.networth.nonCosmetic)}</b></div></div>
                </div>
                <div class="card sb-level">
                    <span class="lbl">SkyBlock level</span><b class="big">${Math.floor(sp.summary.level)}</b>
                    <div class="souls lvlbar"><i style="width:${((sp.summary.level % 1) * 100).toFixed(0)}%"></i></div>
                    <span class="lbl">Skill average <b>${esc(sb?.average_skill_level ?? sp.summary.skills.skillAverage)}</b> · Fairy souls <b>${esc(sb?.fairy_souls || '')}</b></span>
                    <span class="lbl">Playing since ${new Date(sp.summary.joined).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div class="card sb-coop">
                    <span class="lbl">Co-op</span>
                    <canvas id="skinCoop" class="skin small"></canvas>
                    <b>${esc((sb?.coop_members || []).map(m => m.name).join(', '))}</b>
                </div>
            </div>

            <h3 class="sb-h">Skills</h3>
            <div class="skills-grid">${Object.entries(sp.summary.skills.skills).sort((a, b) => b[1] - a[1]).map(([k, lvl]) => {
                const max = SKILL_MAX[k] || 60;
                return `<div class="card skill-card${lvl >= max ? ' maxed' : ''}">${slot(SKILL_ICON[k] || 'book')}<div><b>${cap(k)} <em>${lvl}</em></b><div class="sbar"><i style="width:${Math.min(100, lvl / max * 100).toFixed(1)}%"></i></div></div></div>`;
            }).join('')}</div>

            <div class="sb-cols">
                <div class="card">
                    <h3>Dungeons · Catacombs ${sp.dungeons.catacombs.level}</h3>
                    <div class="dg-top">
                        <div><b>${sp.dungeons.secrets.found}</b><span>secrets (${sp.dungeons.secrets.secretsPerRun}/run)</span></div>
                        <div><b>F${sp.dungeons.highest_normal}</b><span>highest floor</span></div>
                        <div><b>${esc(sp.dungeons.selected)}</b><span>main class</span></div>
                    </div>
                    ${Object.entries(sp.dungeons.classes).map(([k, c]) => `<div class="skill">${slot(CLASS_ICON[k] || 'iron_sword')}<span>${cap(k)}</span><div class="sbar"><i style="width:${(Math.min(1, (c.level + c.progress) / c.max) * 100).toFixed(1)}%"></i></div><b>${c.level}</b></div>`).join('')}
                    <div class="modes floors"><div class="m-row m-th"><span>Floor</span><span>Clears</span><span>Fastest</span><span>Best</span></div>
                        ${sp.dungeons.floors.map(f => `<div class="m-row"><span>${esc(f.name)}</span><span>${f.completions}</span><span>${mmss(f.fastest)}</span><span class="grade g-${esc((f.grade || '').replace('+', 'p'))}">${esc(f.grade || '—')}</span></div>`).join('')}
                    </div>
                </div>
                <div class="card">
                    <h3>Slayers · ${short(sp.slayer_xp)} XP</h3>
                    ${sp.slayers.map(x => `<div class="slayer"><span>${esc(x.name)}</span><div class="pips">${Array.from({ length: x.max }, (_, i) => `<i class="${i < x.level ? 'on' : ''}"></i>`).join('')}</div><b>${x.level ? `Lv${x.level}` : '—'}</b></div>`).join('')}
                    <h3 style="margin-top:1.4rem">Kills & Deaths</h3>
                    <div class="kd-top"><div><b>${commas(sp.kills.total)}</b><span>mobs killed</span></div><div><b>${commas(sp.kills.deaths)}</b><span>deaths</span></div></div>
                    ${sp.kills.top.map(k => `<div class="kd-row"><span>${esc(k.name)}</span><b>${commas(k.amount)}</b></div>`).join('')}
                    <p class="kd-note">the Void has killed me ${sp.kills.top_deaths.find(x => x.name === 'Void')?.amount ?? 0} times.</p>
                </div>
            </div>

            <h3 class="sb-h">Pets · ${sp.pets.unique} of ${sp.pets.total} <small>pet score ${sp.pets.score}</small></h3>
            <div class="pets">${sp.pets.list.map(p => `<div class="mc-tip" style="--r:${RARITY[p.rarity] || '#fff'}"><b>[Lvl ${p.level}] ${esc(p.name)}</b><span>${esc(p.rarity)}</span></div>`).join('')}</div>

            <h3 class="sb-h">Everything Else</h3>
            <div class="facts">
                <div class="card fact">${slot('ender_eye')}<div><b>${sp.accessories.magical_power}</b><span>magical power · ${sp.accessories.unique} accessories</span></div></div>
                <div class="card fact">${slot('hopper')}<div><b>${sp.minions.unique}</b><span>minions crafted · ${sp.minions.slots} slots</span></div></div>
                <div class="card fact">${slot('book')}<div><b>${sp.collections.maxed} / ${sp.collections.total}</b><span>collections maxed</span></div></div>
                <div class="card fact">${slot('rotten_flesh')}<div><b>${sp.bestiary.level}</b><span>bestiary level · ${sp.bestiary.completed} families done</span></div></div>
                <div class="card fact">${slot('diamond_pickaxe')}<div><b>HOTM ${sp.mining.hotm.level}</b><span>heart of the mountain · Mining ${sp.mining.mining.level}</span></div></div>
                <div class="card fact">${slot('wheat')}<div><b>${sp.farming.medals.gold}🥇 ${sp.farming.medals.silver}🥈 ${sp.farming.medals.bronze}🥉</b><span>farming contest medals</span></div></div>
                <div class="card fact">${slot('cod')}<div><b>${sp.fishing.sea_creatures}</b><span>sea creatures fished · ${sp.fishing.treasure} treasures</span></div></div>
                <div class="card fact">${slot('dragon_breath')}<div><b>${(sp.dragons.fastest / 1000).toFixed(1)}s</b><span>fastest dragon kill · ${short(sp.dragons.most_damage)} best damage</span></div></div>
                <div class="card fact">${slot('amethyst_shard')}<div><b>${sp.rift.enigma} / ${sp.rift.enigma_total}</b><span>enigma souls · ${sp.rift.visits} Rift visits</span></div></div>
                <div class="card fact">${slot('gold_ingot')}<div><b>${short(sp.auctions.gold_spent)}</b><span>coins spent on auctions · ${sp.auctions.won} won</span></div></div>
                <div class="card fact">${slot('blaze_powder')}<div><b>${commas(sp.dojo.points)}</b><span>dojo points · ${sp.dojo.challenges.map(c => c.rank).join(' ')}</span></div></div>
                <div class="card fact">${slot('cake')}<div><b>${sp.gifts.given} / ${sp.gifts.received}</b><span>gifts given / received</span></div></div>
            </div>
            <div class="essence">${sp.essence.map(e => `<span><b>${commas(e.amount)}</b> ${esc(e.name)}</span>`).join('')}<em>essence</em></div>
            <p class="source">SkyBlock details from SkyCrypt · network stats from Plancke · saved ${esc(sp.updated)}</p>
            ` : ''}
        </div>`;

        skinViewer(el.querySelector('#skinMe'), './assets/images/skin.png', 240, 320);
        const coop = el.querySelector('#skinCoop');
        if (coop) skinViewer(coop, './assets/images/coop-skin.png', 150, 200);
    }

    // ============================================================
    // Our Realm: the family world, rendered with BlueMap into ./realm/
    // and shown in a frame with our own day/night and camera buttons.
    // ============================================================
    const REALM_NIGHT_SKY = 0x0b122e;

    async function realm(el) {
        el.innerHTML = `<div class="ch-body">
            ${head('Our Realm', 'the family world in 3D, spawn to the snowy peaks', false, 'September 23, 2026')}
            <section class="card realm-stage">
                <iframe src="./realm/index.html" title="3D map of the family Minecraft world" allow="fullscreen"></iframe>
                <div class="realm-loading" aria-hidden="true"><span class="block"></span>Loading the world…</div>
                <div class="realm-street">
                    <p class="street-hint">Click the map to look around · <b>WASD</b> to walk · <b>Space</b> / <b>Shift</b> to fly up and down · scroll to change speed · <b>Esc</b> to let go</p>
                    <div class="street-pad" aria-label="Movement pad">
                        <button data-key="KeyW" aria-label="Forward">▲</button>
                        <button data-key="KeyA" aria-label="Left">◀</button>
                        <button data-key="KeyS" aria-label="Back">▼</button>
                        <button data-key="KeyD" aria-label="Right">▶</button>
                    </div>
                    <div class="street-lift" aria-label="Fly up and down">
                        <button data-key="Space" aria-label="Up">Up</button>
                        <button data-key="ShiftLeft" aria-label="Down">Down</button>
                    </div>
                </div>
            </section>
            <div class="realm-bar" role="toolbar" aria-label="Map controls">
                <button class="realm-btn daynight" data-act="daynight" aria-pressed="false"><span class="sun" aria-hidden="true"></span><span class="lbl">Day</span></button>
                <button class="realm-btn" data-act="street" aria-pressed="false"><svg class="walk" viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m9 21 2-6 3 3v3M8 11l3-3 3 1 2 3M11 8l-1 7"/></svg><span class="lbl">Street view</span></button>
                <button class="realm-btn" data-act="spawn">Back to spawn</button>
                <button class="realm-btn" data-act="view" aria-pressed="false">Top-down</button>
                <button class="realm-btn" data-act="full">Full screen</button>
            </div>
            <p class="realm-hint">Drag to move · right-drag or two fingers to turn · scroll or pinch to zoom</p>
        </div>`;

        const frame = el.querySelector('iframe'), stage = el.querySelector('.realm-stage');
        let bm = null, uni = null, daySky = null, nightSky = null, night = false, flat = false, street = false, anim = 0;

        // Wait for BlueMap inside the frame, then hide its own toolbar (ours replaces it).
        frame.addEventListener('load', () => {
            const doc = frame.contentDocument;
            const style = doc.createElement('style');
            style.textContent = '.control-bar{display:none!important}';
            doc.head.appendChild(style);
            const wait = setInterval(() => {
                const app = frame.contentWindow.bluemap;
                if (app?.mapViewer?.map) {
                    clearInterval(wait);
                    bm = app;
                    uni = app.mapViewer.data.uniforms;
                    daySky = uni.skyColor.value.clone();
                    nightSky = daySky.clone().setHex(REALM_NIGHT_SKY);
                    // Keep full-detail tiles loaded further out than BlueMap's default 100 blocks,
                    // so the blocky low-detail stand-in doesn't show up near the camera.
                    // Phones get less, since every detailed tile costs memory.
                    app.mapViewer.data.loadedHiresViewDistance = matchMedia('(pointer: coarse)').matches ? 200 : 350;
                    app.mapViewer.updateLoadedMapArea();
                    setTimeout(() => { spawnView(); stage.classList.add('ready'); }, 300);
                }
            }, 200);
        });

        // Spawn (14, 66, 94), looking down at the village at an angle.
        function spawnView() {
            const cm = bm.mapViewer.controlsManager;
            cm.position.set(14, 66, 94);
            cm.distance = 190;
            cm.angle = 0.85;
            cm.rotation = 0.3;
            cm.tilt = 0;
            cm.ortho = 0;
        }

        function setNight(on) {
            if (!bm) return;
            night = on;
            const u = uni, from = u.sunlightStrength.value, to = on ? 0.25 : 1;
            const sky = u.skyColor.value, a = sky.clone(), b = on ? nightSky : daySky;
            const start = performance.now(), id = ++anim;
            const step = now => {
                if (id !== anim) return;
                const t = Math.min(1, (now - start) / 600), e = 1 - (1 - t) * (1 - t);
                u.sunlightStrength.value = from + (to - from) * e;
                sky.copy(a).lerp(b, e);
                bm.mapViewer.redraw();
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            const btn = el.querySelector('[data-act="daynight"]');
            btn.setAttribute('aria-pressed', String(on));
            btn.classList.toggle('is-night', on);
            btn.querySelector('.lbl').textContent = on ? 'Night' : 'Day';
            stage.classList.toggle('night', on);
        }

        el.querySelector('.realm-bar').addEventListener('click', e => {
            const btn = e.target.closest('[data-act]');
            if (!btn || !bm) return;
            const act = btn.dataset.act;
            if (act === 'daynight') setNight(!night);
            if (act === 'street') {
                street = !street;
                flat = false;
                street ? bm.setFreeFlight(500) : bm.setPerspectiveView(500, 0);
                syncView();
            }
            if (act === 'spawn') { if (flat || street) bm.setPerspectiveView(0, 0); spawnView(); flat = street = false; syncView(); }
            if (act === 'view') { flat = !flat; street = false; flat ? bm.setFlatView(500, 0) : bm.setPerspectiveView(500, 0); syncView(); }
            if (act === 'full') stage.requestFullscreen?.() ?? frame.webkitEnterFullscreen?.();
        });
        function syncView() {
            const b = el.querySelector('[data-act="view"]');
            b.setAttribute('aria-pressed', String(flat));
            b.textContent = flat ? '3D view' : 'Top-down';
            const w = el.querySelector('[data-act="street"]');
            w.setAttribute('aria-pressed', String(street));
            w.querySelector('.lbl').textContent = street ? 'Leave street view' : 'Street view';
            stage.classList.toggle('street', street);
        }

        // Phones have no keyboard, so the pad holds the same keys down inside the map.
        function sendKey(code, down) {
            if (!bm) return;
            const target = bm.mapViewer.renderer.domElement;
            const Ev = frame.contentWindow.KeyboardEvent;
            target.dispatchEvent(new Ev(down ? 'keydown' : 'keyup', { code, key: code === 'Space' ? ' ' : code, bubbles: true }));
        }
        el.querySelectorAll('.realm-street [data-key]').forEach(btn => {
            const code = btn.dataset.key;
            const up = () => { btn.classList.remove('held'); sendKey(code, false); };
            btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.setPointerCapture(e.pointerId); btn.classList.add('held'); sendKey(code, true); });
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
            btn.addEventListener('contextmenu', e => e.preventDefault());
        });
    }

    // ============================================================
    // Overwatch: live from OverFast, snapshot in data/overwatch.json
    // ============================================================
    const owHours = s => s >= 3600 ? `${(s / 3600).toFixed(1)}h` : `${Math.round(s / 60)}m`;
    const OW_ROLE_ORDER = ['tank', 'damage', 'support'];

    async function overwatch(el) {
        const { data: d, isLive } = await window.GamesData.overwatch;
        const g = d.stats.general, p = d.profile;
        const meta = k => d.heroes[k] || { name: k.replace(/-/g, ' '), portrait: '', role: '' };
        const heroes = Object.entries(d.stats.heroes).map(([k, v]) => ({ key: k, ...meta(k), ...v }))
            .sort((a, b) => b.time_played - a.time_played);
        const maxTime = heroes[0]?.time_played || 1;
        const roleTime = OW_ROLE_ORDER.map(r => d.stats.roles[r]?.time_played || 0);
        const roleTotal = roleTime.reduce((a, b) => a + b, 0) || 1;
        const kd = (g.total.eliminations / Math.max(1, g.total.deaths)).toFixed(2);

        el.innerHTML = `<div class="ch-body">
            ${head('Overwatch', 'every hero I\'ve played, with the numbers to prove it', isLive, d.last_updated)}

            <section class="card ow-profile" style="${p.namecard ? `--namecard:url('${esc(p.namecard)}')` : ''}">
                <div class="ow-plate">
                    <img class="ow-avatar" src="${esc(p.avatar)}" alt="">
                    <div class="ow-who">
                        <b>${esc(p.username)}</b>
                        ${p.title ? `<span class="ow-title">${esc(p.title)}</span>` : ''}
                    </div>
                    ${p.endorsement?.level ? `<div class="ow-endorse" title="Endorsement level ${p.endorsement.level}"><img src="${esc(p.endorsement.frame)}" alt=""><span>${p.endorsement.level}</span></div>` : ''}
                </div>
                <div class="ow-tiles">
                    <div class="ow-fig accent"><b>${Math.round(g.time_played / 3600).toLocaleString()}</b><span>hours</span></div>
                    <div class="ow-fig"><b>${g.games_played.toLocaleString()}</b><span>games</span></div>
                    <div class="ow-fig"><b>${g.winrate.toFixed(1)}%</b><span>win rate</span></div>
                    <div class="ow-fig"><b>${kd}</b><span>elims per death</span></div>
                </div>
                <div class="ow-totals">
                    <div><b>${short(g.total.eliminations)}</b><span>eliminations</span></div>
                    <div><b>${short(g.total.damage)}</b><span>damage</span></div>
                    <div><b>${short(g.total.healing)}</b><span>healing</span></div>
                    <div><b>${short(g.total.deaths)}</b><span>deaths</span></div>
                </div>
            </section>

            <h2 class="ch-h">Roles</h2>
            <div class="ow-split" aria-label="Time played by role">${OW_ROLE_ORDER.map((r, i) => `<i class="r-${r}" style="flex:${roleTime[i]}"><b>${Math.round(roleTime[i] / roleTotal * 100)}%</b><span>${esc(d.roles[r]?.name || r)}</span></i>`).join('')}</div>
            <div class="row3">${OW_ROLE_ORDER.map(r => {
                const v = d.stats.roles[r];
                if (!v) return '';
                return `<div class="card ow-role r-${r}">
                    <div class="ow-role-top">${d.roles[r]?.icon ? `<img src="${esc(d.roles[r].icon)}" alt="">` : ''}<b>${esc(d.roles[r]?.name || r)}</b><em>${owHours(v.time_played)}</em></div>
                    <div class="rbar"><i style="width:${v.winrate}%"></i></div>
                    <span>${v.winrate.toFixed(1)}% win rate · ${v.games_played.toLocaleString()} games</span>
                    <div class="ow-avg">
                        <div><b>${v.average.eliminations.toFixed(1)}</b><small>elims</small></div>
                        <div><b>${short(v.average.damage)}</b><small>damage</small></div>
                        <div><b>${short(v.average.healing)}</b><small>healing</small></div>
                    </div>
                </div>`;
            }).join('')}</div>
            <p class="ow-note">Averages are per game.</p>

            <h2 class="ch-h">Hero Pool <span class="count">${heroes.length} heroes</span></h2>
            <div class="fun-chips ow-filter" role="group" aria-label="Filter heroes by role">
                <button class="on" data-role="all">All</button>${OW_ROLE_ORDER.map(r => `<button data-role="${r}">${esc(d.roles[r]?.name || r)}</button>`).join('')}
            </div>
            <div class="ow-heroes">${heroes.map((h, i) => `
                <div class="card ow-hero r-${esc(h.role)}" data-role="${esc(h.role)}">
                    ${h.portrait ? `<img src="${esc(h.portrait)}" alt="" loading="lazy">` : ''}
                    <div class="ow-hero-main">
                        <b><em>#${i + 1}</em> ${esc(h.name)}</b>
                        <div class="rbar"><i style="width:${Math.max(2, h.time_played / maxTime * 100).toFixed(1)}%"></i></div>
                        <span>${owHours(h.time_played)} · ${h.games_played} games</span>
                    </div>
                    <div class="ow-hero-kda"><b>${h.kda.toFixed(2)}</b><small>KDA</small><em>${h.winrate.toFixed(0)}% won</em></div>
                </div>`).join('')}
            </div>
        </div>`;

        el.querySelector('.ow-filter').addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            el.querySelectorAll('.ow-filter button').forEach(x => x.classList.toggle('on', x === b));
            el.querySelectorAll('.ow-hero').forEach(c => { c.hidden = b.dataset.role !== 'all' && c.dataset.role !== b.dataset.role; });
        });
    }

    window.GamesChannels = { rivals, steam, hypixel, realm, overwatch };
})();
