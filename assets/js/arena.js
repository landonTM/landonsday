// Pixel-art wrestling arena behind the Wrestling pages. Drawn on a tiny canvas that CSS
// scales up with crisp pixels: 240x135 on wide screens, 135x240 on tall ones, so the
// ring always fits. Camera flashes then pop in the crowd.
(function () {
    const canvas = document.createElement('canvas');
    canvas.className = 'arena-bg';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    const g = canvas.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seats = [], flashes = [], screen = null, reacting = null;

    // 4x5 pixel letters for the entrance screen.
    const FONT = {
        L: ['1000', '1000', '1000', '1000', '1111'],
        D: ['1110', '1001', '1001', '1001', '1110'],
        N: ['1001', '1101', '1011', '1001', '1001'],
        B: ['1110', '1001', '1110', '1001', '1110'],
        O: ['0110', '1001', '1001', '1001', '0110'],
        '!': ['0100', '0100', '0100', '0000', '0100']
    };
    function paintScreen(text, stops) {
        const { x, y, w, h } = screen;
        rect(x - 2, y - 2, w + 4, h + 4, '#15141b');
        const grad = g.createLinearGradient(0, y, 0, y + h);
        stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
        g.fillStyle = grad;
        g.fillRect(x, y, w, h);
        const left = x + Math.round((w - (text.length * 10 - 2)) / 2);
        [...text].forEach((ch, i) => (FONT[ch] || []).forEach((row, ry) => [...row].forEach((on, rx) => {
            if (on === '1') rect(left + i * 10 + rx * 2, y + 5 + ry * 2, 2, 2, '#fff6d8');
        })));
    }

    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    // Horizontal-scanline trapezoid: top edge x0..x1 at y0, bottom edge x2..x3 at y1.
    function trap(x0, x1, x2, x3, y0, y1, c) {
        g.fillStyle = c;
        for (let y = y0; y <= y1; y++) {
            const t = (y - y0) / Math.max(1, y1 - y0);
            const a = Math.round(x0 + (x2 - x0) * t), b = Math.round(x1 + (x3 - x1) * t);
            g.fillRect(a, y, b - a + 1, 1);
        }
    }
    // A little wrestler: head, torso, trunks, legs.
    function wrestler(x, y, skin, trunks, hair) {
        rect(x + 1, y, 3, 1, hair);
        rect(x + 1, y + 1, 3, 2, skin);
        rect(x, y + 3, 5, 4, skin);
        rect(x, y + 7, 5, 2, trunks);
        rect(x, y + 9, 2, 3, skin);
        rect(x + 3, y + 9, 2, 3, skin);
        rect(x, y + 12, 2, 1, '#111');
        rect(x + 3, y + 12, 2, 1, '#111');
    }

    function draw() {
        const tall = innerHeight > innerWidth;
        const W = tall ? 135 : 240, H = tall ? 240 : 135;
        canvas.width = W;
        canvas.height = H;
        const cx = Math.round(W / 2);
        let seed = 7;
        const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

        // Arena darkness and the lighting truss.
        rect(0, 0, W, H, '#07060c');
        rect(0, 7, W, 2, '#26252e');
        for (let x = 4; x < W; x += 12) rect(x, 9, 3, 2, '#3a3944');

        // Big entrance screen.
        screen = { x: cx - 28, y: 14, w: 56, h: 30 };
        paintScreen('LDN', ['#7d0d0d', '#d81e1e', '#f2c230']);

        // Ring geometry, scaled to the canvas.
        const farHalf = Math.min(58, Math.round(W * 0.34));
        const nearHalf = farHalf + 12;
        const ringTop = Math.round(H * (tall ? 0.58 : 0.64));
        const ringBot = ringTop + 22;

        // Entrance ramp down to the ring.
        trap(cx - 10, cx + 10, cx - 14, cx + 14, screen.y + 30, ringTop - 10, '#1c1b24');
        trap(cx - 8, cx + 8, cx - 12, cx + 12, screen.y + 30, ringTop - 10, '#24232e');

        // Crowd: tiered rows of pixels, dimmer toward the back, with the odd sign.
        const SHIRTS = ['#c0392b', '#2e86de', '#f1c40f', '#ecf0f1', '#27ae60', '#8e44ad', '#e67e22', '#1abc9c', '#34495e', '#d35400'];
        const SKIN = ['#f1c7a1', '#d9a47a', '#a9744f', '#7a4e2d', '#e8b890'];
        seats = [];
        for (let y = 24; y < H; y += 3) {
            const bright = 0.35 + ((y - 24) / (H - 24)) * 0.65;
            for (let x = 0; x < W; x += 2) {
                if (Math.abs(x - cx) < 32 && y < ringTop - 8) continue;        // screen + ramp
                if (y > ringTop - 16 && y < ringBot + 18 && Math.abs(x - cx) < nearHalf + 20) continue; // ringside
                if (rand() < 0.08) continue;
                g.globalAlpha = bright;
                rect(x, y, 1, 1, SKIN[Math.floor(rand() * SKIN.length)]);
                rect(x, y + 1, 1, 1, SHIRTS[Math.floor(rand() * SHIRTS.length)]);
                g.globalAlpha = 1;
                seats.push([x, y]);
                if (rand() < 0.012 && y > 40) rect(x, y - 2, 4, 2, '#f5f1e6');
            }
        }

        // Barricade + floor around ringside.
        trap(cx - nearHalf - 14, cx + nearHalf + 14, cx - nearHalf - 20, cx + nearHalf + 20, ringTop - 14, ringBot + 14, '#0b0a10');
        rect(cx - nearHalf - 20, ringBot + 14, (nearHalf + 20) * 2, 2, '#3c3b46');

        // Apron, mat, posts, ropes.
        trap(cx - farHalf - 2, cx + farHalf + 2, cx - nearHalf - 2, cx + nearHalf + 2, ringTop, ringBot + 8, '#1a1a26');
        trap(cx - farHalf, cx + farHalf, cx - nearHalf, cx + nearHalf, ringTop, ringBot, '#e9e6dc');
        trap(cx - farHalf + 2, cx + farHalf - 2, cx - nearHalf + 3, cx + nearHalf - 3, ringTop + 1, ringBot - 1, '#d8d4c8');
        const postY = ringTop - 12;
        [[cx - farHalf - 1, postY], [cx + farHalf - 1, postY], [cx - nearHalf - 1, ringBot - 12], [cx + nearHalf - 1, ringBot - 12]]
            .forEach(([x, y]) => { rect(x, y, 2, 13, '#9aa0a8'); rect(x - 1, y - 1, 4, 3, '#d81e1e'); });
        ['#d81e1e', '#f5f5f5', '#2e5bd8'].forEach((c, i) => {
            const dy = i * 3;
            rect(cx - farHalf, postY + 2 + dy, farHalf * 2, 1, c);
            rect(cx - nearHalf, ringBot - 10 + dy, nearHalf * 2, 1, c);
            const span = (ringBot - 12) - postY;
            for (let t = 0; t <= span; t++) {
                const k = t / span;
                rect(cx - farHalf - (nearHalf - farHalf) * k, postY + 2 + dy + t, 1, 1, c);
                rect(cx + farHalf + (nearHalf - farHalf) * k - 1, postY + 2 + dy + t, 1, 1, c);
            }
        });

        // Two wrestlers squaring up in the middle of the ring.
        wrestler(cx - 13, ringTop - 2, '#f1c7a1', '#111', '#5a3a1a');
        wrestler(cx + 8, ringTop - 2, '#a9744f', '#d81e1e', '#111');

        // Spotlights raking down from the truss.
        g.globalCompositeOperation = 'lighter';
        [cx - W * 0.33, cx, cx + W * 0.33].forEach((x, i) => {
            const cone = g.createLinearGradient(0, 10, 0, ringBot);
            cone.addColorStop(0, `rgba(255, 244, 214, ${i === 1 ? 0.14 : 0.2})`);
            cone.addColorStop(1, 'rgba(255, 244, 214, 0)');
            g.fillStyle = cone;
            g.beginPath();
            g.moveTo(x - 2, 10); g.lineTo(x + 2, 10);
            g.lineTo(cx + (x - cx) * 0.2 + 24, ringBot); g.lineTo(cx + (x - cx) * 0.2 - 24, ringBot);
            g.closePath();
            g.fill();
        });
        g.globalCompositeOperation = 'source-over';
        [cx - W * 0.33, cx, cx + W * 0.33].forEach(x => rect(x - 2, 9, 4, 2, '#fff6d8'));
        flashes = [];
    }

    draw();
    let tall = innerHeight > innerWidth;
    addEventListener('resize', () => {
        const now = innerHeight > innerWidth;
        if (now !== tall) { tall = now; draw(); }
    });

    // Camera flashes: a few crowd pixels blink white, then get repainted.
    function flash(count) {
        while (flashes.length) { const [x, y, d] = flashes.pop(); g.putImageData(d, x, y); }
        for (let i = 0; i < count; i++) {
            if (!seats.length) return;
            const [x, y] = seats[Math.floor(Math.random() * seats.length)];
            if (x < 1 || y < 1) continue;
            flashes.push([x - 1, y - 1, g.getImageData(x - 1, y - 1, 3, 3)]);
            rect(x - 1, y, 3, 1, '#ffffff');
            rect(x, y - 1, 1, 3, '#ffffff');
        }
    }

    // Crowd reactions for the pages to trigger: a flash storm for a great match,
    // a grey "BOO" on the big screen for a botch. The scene is redrawn afterwards.
    window.arena = {
        react(kind) {
            clearInterval(reacting);
            canvas.classList.add('lit');
            let n = 0;
            if (kind === 'boo') {
                paintScreen('BOO', ['#2a2a2a', '#555', '#2a2a2a']);
                g.fillStyle = 'rgba(0, 0, 0, 0.35)';
                g.fillRect(0, screen.y + screen.h + 2, canvas.width, canvas.height);
            }
            reacting = setInterval(() => {
                n++;
                if (kind === 'cheer') {
                    paintScreen(n % 2 ? 'LDN!' : 'LDN', n % 2 ? ['#f2c230', '#fff6d8', '#f2c230'] : ['#7d0d0d', '#d81e1e', '#f2c230']);
                    if (!still) flash(14);
                }
                if (n > 14) { clearInterval(reacting); reacting = null; flashes = []; draw(); canvas.classList.remove('lit'); }
            }, 110);
        }
    };

    if (still) return;
    setInterval(() => { if (!reacting && Math.random() < 0.9) flash(Math.random() < 0.5 ? 1 : 2); }, 450);
})();
