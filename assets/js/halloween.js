// Halloween mode: every page loads this in <head>. During October (by the visitor's own
// clock) it tags <html class="halloween"> and adds the decorations: cobwebs, a spider,
// bats, fog, a peeking ghost and a countdown strip. It switches itself off on November 1.
// Preview any time with ?halloween=on, or turn it off with ?halloween=off.
(function () {
    const param = new URLSearchParams(location.search).get('halloween');
    const now = new Date();
    const on = param === 'on' ? true : param === 'off' ? false : now.getMonth() === 9;
    if (!on) return;
    const root = document.documentElement;
    root.classList.add('halloween');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const PUMPKIN = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 7c-1-3 1-5 3-5" stroke="#3d7a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="10" cy="18" rx="7" ry="10" fill="#e8651a"/><ellipse cx="22" cy="18" rx="7" ry="10" fill="#e8651a"/><ellipse cx="16" cy="18" rx="7" ry="11" fill="#ff7f24"/><path d="M9 15l3-3 3 3zM17 15l3-3 3 3z" fill="#2a1200"/><path d="M9 21q7 5 14 0l-2 1-2-1-2 1-2-1-2 1-2-1z" fill="#2a1200"/></svg>`;
    const WEB = `<svg viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="rgba(150,140,170,0.75)" stroke-width="1"><path d="M0 0L120 120M0 0L60 120M0 0L120 60M0 0L0 120M0 0L120 0"/><path d="M0 22Q14 18 20 20Q20 14 22 0"/><path d="M0 46Q26 38 38 41Q40 26 46 0"/><path d="M0 72Q38 60 56 63Q62 38 72 0"/><path d="M0 98Q50 82 74 86Q84 50 98 0"/></g></svg>`;
    const BAT = `<svg viewBox="0 0 64 28" aria-hidden="true"><path class="wing" d="M32 12C27 4 18 2 8 4c4 3 4 7 2 10 4-2 8-1 10 3 2-4 6-5 10-3 0 0 1-2 2-2zM32 12c5-8 14-10 24-8-4 3-4 7-2 10-4-2-8-1-10 3-2-4-6-5-10-3 0 0-1-2-2-2z" fill="#140a1e"/><ellipse cx="32" cy="14" rx="4" ry="6" fill="#140a1e"/><path d="M29 9l1-4 2 3 2-3 1 4z" fill="#140a1e"/></svg>`;
    const GHOST = `<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M30 2C15 2 6 14 6 30v36l8-6 8 6 8-6 8 6 8-6 8 6V30C54 14 45 2 30 2z" fill="#f4f1ff"/><ellipse cx="22" cy="28" rx="4" ry="6" fill="#1b1030"/><ellipse cx="38" cy="28" rx="4" ry="6" fill="#1b1030"/><ellipse cx="30" cy="42" rx="5" ry="4" fill="#1b1030"/></svg>`;

    function countdown() {
        const day = now.getDate();
        if (now.getMonth() !== 9) return 'Spooky season preview';
        if (day === 31) return 'Happy Halloween!';
        const left = 31 - day;
        return `Spooky season · ${left} ${left === 1 ? 'night' : 'nights'} until Halloween`;
    }

    function build() {
        const body = document.body;
        const nav = document.querySelector('.site-nav');
        const add = (cls, html, parent = body) => {
            const el = document.createElement('div');
            el.className = cls;
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = html;
            parent.appendChild(el);
            return el;
        };

        // Pumpkin on the logo + a thin countdown strip under the nav.
        const logo = document.querySelector('.site-nav-logo');
        if (logo && !logo.querySelector('.hw-pumpkin')) logo.insertAdjacentHTML('afterbegin', `<span class="hw-pumpkin">${PUMPKIN}</span>`);
        let hang = body;
        if (nav) {
            const strip = document.createElement('div');
            strip.className = 'hw-strip';
            strip.innerHTML = `<span class="hw-pumpkin">${PUMPKIN}</span>${countdown()}<span class="hw-pumpkin">${PUMPKIN}</span>`;
            nav.insertAdjacentElement('afterend', strip);
            hang = strip;
        }

        // Cobwebs hang from the strip's corners (or the top of the page), and a spider drops from one.
        add('hw-web hw-left', WEB, hang);
        add('hw-web hw-right', WEB, hang);
        add('hw-spider', '<span class="thread"></span><span class="body"></span>', hang);

        // The Wrestling TV's news crawl gets a Halloween line.
        const ticker = document.getElementById('ticker');
        if (ticker) ticker.textContent = `HALLOWEEN HAVOC ON LDN · ${ticker.textContent}`;

        // Bats, fog and a ghost that peeks up from the corner now and then.
        const bats = add('hw-bats', [0, 1, 2, 3].map(i => `<span class="bat b${i}">${BAT}</span>`).join(''));
        add('hw-fog', '<span></span><span></span>');
        const ghost = add('hw-ghost', `${GHOST}<span class="boo">boo!</span>`);
        if (still) { bats.remove(); return; }
        setInterval(() => {
            ghost.classList.remove('peek');
            void ghost.offsetWidth;
            ghost.classList.add('peek');
        }, 26000);
        setTimeout(() => ghost.classList.add('peek'), 4000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();
