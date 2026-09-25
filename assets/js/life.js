// Life: a travel journal. data/posts.json holds entries of two kinds, shown in one
// newest-first timeline: "trip" (taped-in photos by place) and "thought" (writing).
(function () {
    const $ = s => document.querySelector(s);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const localDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
    const dateLabel = iso => localDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const monthLabel = iso => localDate(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const pad = n => String(n).padStart(2, '0');
    // Keep "Vol. 2" on one line when a title wraps.
    const title = s => esc(s).replace(/Vol\. /g, 'Vol.&nbsp;');

    // Small, repeatable tilts and tape colours so prints look hand-placed but stay put on reload.
    const TILTS = [-1.6, 1.2, -0.8, 1.8, -2, 0.9];
    const TAPES = ['rgba(246, 211, 107, 0.7)', 'rgba(159, 216, 232, 0.7)', 'rgba(244, 166, 184, 0.65)', 'rgba(184, 224, 142, 0.7)'];

    // Photos with the camera app's own date stamp ("stamped") skip the orange one.
    function print(photo, folder, stamp, i) {
        const src = folder + photo.file;
        return `<figure class="tj-print ${photo.tall ? 'tall' : ''}" style="--tilt:${TILTS[i % TILTS.length]}deg;--tape:${TAPES[i % TAPES.length]}">
            <span class="tape" aria-hidden="true"></span>
            <button class="tj-photo" data-src="${esc(src)}" data-cap="${esc(photo.caption)}" aria-label="${esc(photo.caption)}, view larger">
                <img src="${esc(src)}" alt="${esc(photo.caption)}" loading="lazy">
                ${photo.stamped ? '' : `<span class="datestamp" aria-hidden="true">${esc(stamp)}</span>`}
            </button>
            <figcaption>${esc(photo.caption)}</figcaption>
        </figure>`;
    }

    // Folded view: a strip of the first few photos, tapped to open the whole entry.
    function peek(e) {
        const photos = e.sections.flatMap(s => s.photos);
        return `
            <button class="tj-peek" aria-expanded="false" aria-controls="${esc(e.id)}-body">
                <span class="strip">${photos.slice(0, 4).map(p => `<img src="${esc(e.folder + p.file)}" alt="" loading="lazy">`).join('')}</span>
                <span class="open-label">Open · ${photos.length} photos ▾</span>
            </button>`;
    }

    function trip(e) {
        const stamp = `'${e.date.slice(2, 4)}`;
        let n = 0;
        return `
            <h2 class="tj-title">${title(e.title)}</h2>
            ${e.place ? `<p class="tj-place">${esc(e.place)}</p>` : ''}
            ${peek(e)}
            <div class="tj-body" id="${esc(e.id)}-body">
            ${(e.body || []).map(p => `<p class="tj-text">${esc(p)}</p>`).join('')}
            ${e.sections.map(s => `
                <section class="tj-part ${s.kind === 'food' ? 'food' : ''}">
                    ${e.sections.length > 1 ? `<div class="ticket"><span>${esc(s.park)}</span></div>` : ''}
                    ${s.heading ? `<h3 class="tj-hand">${esc(s.heading)}</h3>` : ''}
                    <div class="tj-prints">${s.photos.map(p => print(p, e.folder, stamp, n++)).join('')}</div>
                    ${s.note ? `<p class="tj-note">${esc(s.note)}</p>` : ''}
                </section>`).join('')}
                <button class="tj-fold">Fold this entry ▴</button>
            </div>`;
    }

    function thought(e) {
        return `
            <div class="tj-typed">
                <span class="clip" aria-hidden="true"></span>
                <h2 class="tj-title">${title(e.title)}</h2>
                ${e.pull ? `<blockquote class="tj-pull">${esc(e.pull)}</blockquote>` : ''}
                ${(e.body || []).map(p => `<p class="tj-text">${esc(p)}</p>`).join('')}
                <p class="tj-sign">— L.D.</p>
            </div>`;
    }

    function render(posts) {
        // Numbered oldest-first, like a logbook; shown newest-first.
        const byDate = posts.slice().sort((a, b) => a.date.localeCompare(b.date));
        byDate.forEach((p, i) => { p.no = i + 1; });
        const list = byDate.slice().reverse();
        const kind = e => e.type === 'trip' ? 'Trip' : 'Thought';

        $('#entryCount').textContent = `${list.length} ${list.length === 1 ? 'entry' : 'entries'}`;
        $('#index').innerHTML = list.map(e => `
            <li data-type="${esc(e.type)}"><a href="#${esc(e.id)}">
                <span class="no">${pad(e.no)}</span>
                <span class="t">${title(e.title)}</span>
                <span class="dots"></span>
                <span class="k">${kind(e)}</span>
                <span class="d">${esc(e.dates || dateLabel(e.date))}</span>
                <span class="m">${esc(monthLabel(e.date))}</span>
            </a></li>`).join('');

        $('#entries').innerHTML = list.map(e => `
            <article class="tj-entry ${esc(e.type)}" id="${esc(e.id)}" data-type="${esc(e.type)}">
                <span class="holes" aria-hidden="true"></span>
                <div class="tj-meta"><span>No. ${pad(e.no)} · ${kind(e)}</span><span>${esc(e.dates || dateLabel(e.date))}</span></div>
                ${e.type === 'trip' ? trip(e) : thought(e)}
            </article>`).join('') + '<p class="tj-empty" id="noneMsg" hidden>Nothing here yet.</p>';
    }

    // On phones every trip starts folded, so the page isn't one endless scroll.
    function setOpen(entry, on) {
        entry.classList.toggle('closed', !on);
        entry.querySelector('.tj-peek')?.setAttribute('aria-expanded', String(on));
    }

    function wireFolding() {
        if (matchMedia('(max-width: 680px)').matches) {
            document.querySelectorAll('.tj-entry.trip').forEach(el => setOpen(el, false));
        }
        document.addEventListener('click', e => {
            const peekBtn = e.target.closest('.tj-peek');
            if (peekBtn) { setOpen(peekBtn.closest('.tj-entry'), true); return; }
            const fold = e.target.closest('.tj-fold');
            if (fold) {
                const entry = fold.closest('.tj-entry');
                setOpen(entry, false);
                entry.scrollIntoView();
                return;
            }
            const link = e.target.closest('#index a, #bucket a, #now a[href^="#"]');
            const target = link && document.getElementById(link.hash.slice(1));
            if (target) setOpen(target, true);
        });
    }

    // Bucket list (data/bucket.json): open goals first, then what's been checked off, newest first.
    function renderBucket(items) {
        const open = items.filter(i => !i.done);
        const done = items.filter(i => i.done).sort((a, b) => b.done.localeCompare(a.done));
        const when = iso => localDate(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', " '");
        $('#bucket').innerHTML = open.concat(done).map(i => {
            const text = i.entry ? `<a href="#${esc(i.entry)}">${esc(i.text)}</a>` : esc(i.text);
            return `<li class="${i.done ? 'done' : ''}">
                <span class="box" aria-hidden="true">${i.done ? '✓' : ''}</span>
                <span class="txt">${text}</span>
                ${i.done ? `<span class="when">${esc(when(i.done))}</span>` : ''}
                <span class="sr-only">${i.done ? '(done)' : '(not yet)'}</span>
            </li>`;
        }).join('');
        $('#bucketCount').textContent = `${done.length} down, ${open.length} to go`;
        $('.tj-bucket').hidden = false;
    }

    // "Currently" note: filled in from the other sections' data, same rules as the homepage widgets.
    function stars(text) {
        if (!text || !/[⭐¾½¼]/.test(text)) return null;
        const full = (text.match(/⭐/g) || []).length;
        const frac = text.includes('¾') ? 0.75 : text.includes('½') ? 0.5 : text.includes('¼') ? 0.25 : 0;
        return full + frac;
    }
    function lastWatched(review) {
        const m = /Last Watched:\s*([A-Za-z]+ \d+)(?:st|nd|rd|th)?,?\s*(\d{4})/.exec(review || '');
        const d = m && new Date(`${m[1]}, ${m[2]}`);
        return d && !isNaN(d) ? d : null;
    }
    function ago(date) {
        const days = Math.floor((Date.now() - date) / 86400000);
        if (days < 1) return 'today';
        if (days === 1) return 'yesterday';
        if (days < 30) return `${days} days ago`;
        const months = Math.floor(days / 30.4);
        if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`;
        const years = Math.floor(months / 12);
        return years === 1 ? 'a year ago' : `${years} years ago`;
    }
    const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
    const latest = list => list.map(i => ({ ...i, _d: lastWatched(i.review) })).filter(i => i._d).sort((a, b) => b._d - a._d)[0];

    function renderNow({ games, marvel, movies, rosie }, posts) {
        const rows = [];
        const game = (games?.games || []).slice().sort((a, b) => (b.last_played_ts || 0) - (a.last_played_ts || 0))[0];
        if (game?.last_played_ts) rows.push(['Playing', 'games', game.name, `${Math.round(game.hours).toLocaleString()} hrs · ${ago(game.last_played_ts * 1000)}`]);
        const mo = latest(movies || []);
        if (mo) rows.push(['Watched', 'movies', mo.title, ago(mo._d)]);
        const mv = latest(marvel || []);
        if (mv) rows.push(['Reviewed', 'marvel', mv.title, stars(mv.rating) !== null ? `${Math.round(stars(mv.rating) * 4) / 4}★ · ${ago(mv._d)}` : ago(mv._d)]);
        const trip = posts.filter(p => p.type === 'trip').sort((a, b) => b.date.localeCompare(a.date))[0];
        if (trip) rows.push(['Last trip', `#${trip.id}`, trip.title, trip.dates || dateLabel(trip.date)]);
        const cat = (rosie || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
        if (cat) rows.push(['Rosie', 'rosie', `“${clip(cat.caption, 38)}”`, ago(new Date(cat.date))]);
        if (!rows.length) return;
        $('#now').innerHTML = rows.map(([label, href, text, sub]) => `
            <dt>${esc(label)}</dt>
            <dd><a href="${esc(href)}">${esc(text)}</a><small>${esc(sub)}</small></dd>`).join('');
        $('.tj-now').hidden = false;
    }

    function wireFilter() {
        const btns = document.querySelectorAll('.tj-filter button');
        btns.forEach(b => b.addEventListener('click', () => {
            const f = b.dataset.f;
            btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
            let shown = 0;
            document.querySelectorAll('.tj-entry, #index li').forEach(el => {
                const on = f === 'all' || el.dataset.type === f;
                el.hidden = !on;
                if (on && el.classList.contains('tj-entry')) shown++;
            });
            $('#noneMsg').hidden = shown > 0;
        }));
    }

    function wireLightbox() {
        const box = $('#lightbox');
        document.addEventListener('click', e => {
            const b = e.target.closest('.tj-photo');
            if (!b) return;
            $('#lbImg').src = b.dataset.src;
            $('#lbImg').alt = b.dataset.cap;
            $('#lbCap').textContent = b.dataset.cap;
            box.showModal();
        });
        $('#lbClose').addEventListener('click', () => box.close());
        box.addEventListener('click', e => { if (e.target === box) box.close(); });
    }

    fetch('data/bucket.json')
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => renderBucket(d.items || []))
        .catch(() => {});

    fetch('data/posts.json')
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => {
            render(d.posts || []); wireFilter(); wireLightbox(); wireFolding();
            const other = ['games', 'marvel', 'movies', 'rosie'];
            Promise.all(other.map(k => fetch(`data/${k}.json`).then(r => r.json()).catch(() => null)))
                .then(vals => renderNow(Object.fromEntries(other.map((k, i) => [k, vals[i]])), d.posts || []));
            // Entries render after load, so jump to a linked one (life#id) once it exists.
            const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
            if (target) { setOpen(target, true); target.scrollIntoView(); }
        })
        .catch(() => { $('#entries').innerHTML = '<p class="tj-empty">The journal couldn’t load. Try again in a moment.</p>'; });
})();
