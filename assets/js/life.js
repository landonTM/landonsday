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

    function trip(e) {
        const stamp = `'${e.date.slice(2, 4)}`;
        let n = 0;
        return `
            <h2 class="tj-title">${title(e.title)}</h2>
            ${e.place ? `<p class="tj-place">${esc(e.place)}</p>` : ''}
            ${(e.body || []).map(p => `<p class="tj-text">${esc(p)}</p>`).join('')}
            ${e.sections.map(s => `
                <section class="tj-part ${s.kind === 'food' ? 'food' : ''}">
                    ${e.sections.length > 1 ? `<div class="ticket"><span>${esc(s.park)}</span></div>` : ''}
                    ${s.heading ? `<h3 class="tj-hand">${esc(s.heading)}</h3>` : ''}
                    <div class="tj-prints">${s.photos.map(p => print(p, e.folder, stamp, n++)).join('')}</div>
                    ${s.note ? `<p class="tj-note">${esc(s.note)}</p>` : ''}
                </section>`).join('')}`;
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

    fetch('data/posts.json')
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => {
            render(d.posts || []); wireFilter(); wireLightbox();
            // Entries render after load, so jump to a linked one (life#id) once it exists.
            const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
            if (target) target.scrollIntoView();
        })
        .catch(() => { $('#entries').innerHTML = '<p class="tj-empty">The journal couldn’t load. Try again in a moment.</p>'; });
})();
