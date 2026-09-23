// Games page: console channel-menu shell. Drives the health screen,
// channel grid, preview, HOME Menu and Message Board. The channel pages
// themselves are drawn by games-channels.js the first time each opens.
(function () {
    const $ = s => document.querySelector(s);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ------------------------------------------------------------
    // Channel art. Each returns markup used both in the small tile
    // and (scaled up) in the preview banner.
    // ------------------------------------------------------------
    // The Hypixel head: a small CSS cube with the skin on every side, and the
    // hat layer as a slightly bigger cube around it, like the game draws it.
    // Faces are 8x8 squares on the 64x64 skin sheet; the hat layer sits 32px to the right.
    const HEAD_FACES = { front: [8, 8], back: [24, 8], left: [0, 8], right: [16, 8], top: [8, 0], bottom: [16, 0] };
    const cubeFaces = dx => Object.entries(HEAD_FACES).map(([side, [u, v]]) =>
        `<i class="f ${side}" style="background-position:${((u + dx) / 56 * 100).toFixed(4)}% ${(v / 56 * 100).toFixed(4)}%"></i>`).join('');
    const SKIN_CUBE = `<div class="cube"><div class="layer">${cubeFaces(0)}</div><div class="layer hat">${cubeFaces(32)}</div></div>`;

    const ART = {
        rivals: d => {
            const lords = d.rivals?.heroes || [];
            const wr = d.rivals?.summary?.winRate;
            const cycle = Math.max(lords.length, 1) * 2.4;
            return `<div class="art art-rivals" style="--cycle:${cycle}s;--step:2.4s">
                <div class="rays"></div>
                <div class="lords">${lords.map((h, i) => `<img src="${esc(h.image)}" alt="" style="--i:${i}">`).join('')}</div>
                ${lords.length ? `<span class="lord-count">★ ${lords.length} LORDS</span>` : ''}
                <div class="label">Marvel Rivals<span class="sub">${wr ? `${wr}% win rate · ${esc(d.rivals.summary.matches || '')} games` : 'Career stats'}</span></div>
            </div>`;
        },
        steam: d => {
            const imgs = (d.top || []).slice(0, 10).map(g => `<img src="${esc(g.header_image)}" alt="">`).join('');
            const hours = d.games ? Math.round(d.games.total_hours).toLocaleString() : '';
            return `<div class="art art-library">
                <div class="shelf"><div class="strip">${imgs}${imgs}</div></div>
                ${hours ? `<div class="hours">${hours}<small>HOURS</small></div>` : ''}
                <div class="label">Steam<span class="sub">${d.games ? `${d.games.game_count || d.games.games.length} games` : 'Library'}</span></div>
            </div>`;
        },
        hypixel: d => {
            const g = d.hypixel?.general || {};
            const rank = String(g.rank || '');
            const tag = rank ? `<span class="tag">[<span class="mvp">${esc(rank.replace(/\+/g, ''))}</span><span class="plus">${esc(rank.replace(/[^+]/g, ''))}</span>]</span>` : '';
            return `<div class="art art-hypixel">
                <div class="cloud"></div><div class="cloud c2"></div>
                <div class="ground"></div>
                <div class="head3d" role="img" aria-label="My Minecraft head">${SKIN_CUBE}</div>
                <div class="label">Hypixel<span class="sub">${g.network_level ? `Level ${esc(g.network_level)} ${tag}` : ''}</span></div>
            </div>`;
        },
        overwatch: d => {
            const ow = d.overwatch;
            const heroes = ow ? Object.entries(ow.stats.heroes).sort((a, b) => b[1].time_played - a[1].time_played).slice(0, 4)
                .map(([k]) => ow.heroes[k]).filter(Boolean) : [];
            const hours = ow ? Math.round(ow.stats.general.time_played / 3600).toLocaleString() : '';
            return `<div class="art art-overwatch" style="--n:${Math.max(heroes.length, 1)}">
                <div class="stripes"></div>
                <div class="portraits">${heroes.map((h, i) => `<img src="${esc(h.portrait)}" alt="" style="--i:${i}">`).join('')}</div>
                <div class="label">Overwatch<span class="sub">${ow ? `${hours} hours · ${ow.stats.general.games_played.toLocaleString()} games` : 'Career stats'}</span></div>
            </div>`;
        },
        realm: () => `<div class="art art-realm">
                <img src="./assets/images/realm-tile.jpg" alt="">
                <div class="night"></div><div class="stars"></div><div class="moon"></div>
                <div class="label">Our Realm<span class="sub">The family world in 3D</span></div>
            </div>`
    };

    const ORDER = ['rivals', 'steam', 'hypixel', 'realm', 'overwatch'];
    const NAMES = { rivals: 'Marvel Rivals', steam: 'Steam', hypixel: 'Hypixel', realm: 'Our Realm', overwatch: 'Overwatch' };
    const rendered = {};
    let DATA = {};
    let current = null;      // channel key currently previewed / open
    let lastTile = null;

    function renderGrid() {
        const grid = $('#grid');
        grid.innerHTML = '';
        ORDER.forEach(key => {
            const b = document.createElement('button');
            b.className = 'tile';
            b.dataset.key = key;
            b.setAttribute('aria-label', `${NAMES[key]} channel`);
            b.innerHTML = ART[key](DATA);
            b.addEventListener('click', () => openPreview(key, b));
            grid.appendChild(b);
        });
        for (let i = ORDER.length; i < 12; i++) {
            const e = document.createElement('div');
            e.className = 'tile empty';
            e.setAttribute('aria-hidden', 'true');
            grid.appendChild(e);
        }
    }


    // ------------------------------------------------------------
    // Preview: the tile zooms up into a big banner with Menu / Start
    // ------------------------------------------------------------
    function openPreview(key, tile) {
        current = key;
        lastTile = tile;
        const banner = $('#banner');
        banner.innerHTML = ART[key](DATA);
        $('#preview').hidden = false;

        if (!reducedMotion() && tile) {
            const from = tile.getBoundingClientRect(), to = banner.getBoundingClientRect();
            banner.classList.remove('zooming');
            banner.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
            void banner.offsetWidth;
            banner.classList.add('zooming');
            banner.style.transform = '';
        }
        $('#startChannel').focus();
    }

    function closePreview() {
        $('#preview').hidden = true;
        lastTile?.focus();
    }

    // ------------------------------------------------------------
    // Launch / leave a channel (fade through black like a real boot)
    // ------------------------------------------------------------
    function fadeThrough(then) {
        const f = $('#fader');
        if (reducedMotion()) { then(); return; }
        f.classList.add('on');
        setTimeout(() => { then(); requestAnimationFrame(() => f.classList.remove('on')); }, 360);
    }

    function startChannel() {
        const key = current;
        fadeThrough(() => {
            $('#preview').hidden = true;
            document.querySelectorAll('.channel-screen').forEach(s => { s.hidden = s.id !== `ch-${key}`; });
            const screen = $(`#ch-${key}`);
            screen.scrollTop = 0;
            if (!rendered[key]) {
                rendered[key] = true;
                screen.innerHTML = '<p class="ch-loading">Loading…</p>';
                window.GamesChannels[key](screen).catch(err => {
                    console.error(err);
                    screen.innerHTML = '<p class="ch-loading">This channel couldn’t load right now. Press HOME to go back.</p>';
                });
            }
            $('#homeBtn').hidden = false;
            $('#homeBtn').focus();
        });
    }

    function backToMenu() {
        closeHomeMenu();
        fadeThrough(() => {
            document.querySelectorAll('.channel-screen').forEach(s => { s.hidden = true; });
            $('#homeBtn').hidden = true;
            $('#preview').hidden = true;
            lastTile?.focus();
        });
    }

    // ------------------------------------------------------------
    // HOME Menu
    // ------------------------------------------------------------
    function openHomeMenu() { $('#homeMenu').hidden = false; $('#hmChannels').focus(); }
    function closeHomeMenu() { $('#homeMenu').hidden = true; }

    // ------------------------------------------------------------
    // Message Board: recent play sessions from the Steam data
    // ------------------------------------------------------------
    function openBoard() {
        const now = new Date();
        $('#boardDay').textContent = now.getDate();
        $('#boardMonth').textContent = `${now.toLocaleDateString([], { month: 'long' })} · ${now.toLocaleDateString([], { weekday: 'long' })}`;
        const games = (DATA.games?.games || []).filter(g => g.last_played_ts)
            .sort((a, b) => b.last_played_ts - a.last_played_ts).slice(0, 11);
        const letters = [
            `<div class="letter"><b>Welcome!</b>Pick a channel to see what I've been playing. Press HOME in any channel to come back.<small>From Landon</small></div>`,
            ...games.map(g => `<div class="letter"><b>${esc(g.name)}</b>Played on Steam · ${Math.round(g.hours).toLocaleString()}h total<small>${esc(g.last_played || '')}</small></div>`)
        ];
        $('#boardList').innerHTML = letters.join('');
        $('#board').hidden = false;
        try { sessionStorage.setItem('boardRead', '1'); } catch (e) {}
        $('#boardBtn .dot')?.remove();
        $('#boardBack').focus();
    }

    function closeBoard() { $('#board').hidden = true; $('#boardBtn').focus(); }

    // ------------------------------------------------------------
    // Clock
    // ------------------------------------------------------------
    function tick() {
        const d = new Date();
        let h = d.getHours();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        $('#clockTime').innerHTML = `${h}<span class="colon">:</span>${String(d.getMinutes()).padStart(2, '0')}<small>${ampm}</small>`;
        $('#clockDate').textContent = `${d.toLocaleDateString([], { weekday: 'short' })} ${d.getMonth() + 1}/${d.getDate()}`;
    }

    // ------------------------------------------------------------
    // Health & safety screen, once per visit
    // ------------------------------------------------------------
    function healthScreen() {
        let seen = false;
        try { seen = sessionStorage.getItem('hsSeen') === '1'; } catch (e) {}
        if (seen) return;
        const hs = $('#hs');
        hs.hidden = false;
        let done = false;
        const go = () => {
            if (done) return;
            done = true;
            try { sessionStorage.setItem('hsSeen', '1'); } catch (e) {}
            hs.classList.add('fade');
            setTimeout(() => { hs.hidden = true; }, 460);
            document.removeEventListener('keydown', onKey);
        };
        const onKey = e => { if (['a', 'A', 'Enter', ' '].includes(e.key)) { e.preventDefault(); go(); } };
        hs.addEventListener('click', go);
        document.addEventListener('keydown', onKey);
    }

    // ------------------------------------------------------------
    // Wiring
    // ------------------------------------------------------------
    $('#backToMenu').addEventListener('click', closePreview);
    $('#startChannel').addEventListener('click', startChannel);
    $('#homeBtn').addEventListener('click', openHomeMenu);
    $('#hmClose').addEventListener('click', closeHomeMenu);
    $('#hmChannels').addEventListener('click', backToMenu);
    $('#boardBtn').addEventListener('click', openBoard);
    $('#boardBack').addEventListener('click', closeBoard);

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !$('#hs').hidden) return;
        if (!$('#homeMenu').hidden) closeHomeMenu();
        else if (!$('#board').hidden) closeBoard();
        else if (!$('#preview').hidden) closePreview();
        else if (!$('#homeBtn').hidden) openHomeMenu();
    });

    try { if (sessionStorage.getItem('boardRead') === '1') $('#boardBtn .dot')?.remove(); } catch (e) {}

    tick();
    setInterval(tick, 10000);
    healthScreen();
    renderGrid();

    const G = window.GamesData;
    Promise.all([G.steam, G.rivals, G.hypixel, G.overwatch].map(p => p.then(r => r.data).catch(() => null))).then(([games, rivals, hypixel, overwatch]) => {
        const top = (games?.games || []).slice().sort((a, b) => b.hours - a.hours);
        DATA = { games, rivals, hypixel, overwatch, top };
        if (games) {
            const rivalsGame = top.find(g => /rivals/i.test(g.name));
            $('#hsLine1').textContent = `BEFORE BROWSING, BE AWARE THAT LANDON HAS PLAYED ${Math.round(games.total_hours).toLocaleString()} HOURS OF VIDEO GAMES${rivalsGame ? `, ${Math.round(rivalsGame.hours)} OF THEM IN MARVEL RIVALS` : ''}.`;
        }
        renderGrid();
    });
})();
