// ===== CLOTH PHYSICS ENGINE — Realistic Fabric Simulation =====
// Uses Verlet integration with distance constraints to simulate heavy velvet curtains.

class Cloth {
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.cols = opts.cols || 30;
        this.rows = opts.rows || 40;
        this.gravity = opts.gravity || 0.35;
        this.damping = opts.damping || 0.97;
        this.constraintIterations = opts.iterations || 6;
        this.mouseRadius = opts.mouseRadius || 120;
        this.mouseStrength = opts.mouseStrength || 0.6;

        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseActive = false;

        // Two curtains: left and right
        this.leftPinRatio = 0.5;   // 0 = fully open, 0.5 = fully closed
        this.rightPinRatio = 0.5;
        this.targetLeftPin = 0.12;  // Slightly bunched at side
        this.targetRightPin = 0.12;
        this.pinLerp = 0.02;       // How fast curtains respond

        this.resize();
        this._initParticles();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement ? this.canvas.parentElement.offsetWidth : window.innerWidth;
        this.canvas.height = this.canvas.parentElement ? this.canvas.parentElement.offsetHeight : window.innerHeight;
        this._initParticles();
    }

    _initParticles() {
        this.particles = [];
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Left curtain spans from x=0 to x=w/2
        // Right curtain spans from x=w/2 to x=w
        // Each curtain is a grid of (cols x rows) particles

        for (let side = 0; side < 2; side++) {
            const curtain = [];
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    let x, y;
                    if (side === 0) {
                        // Left curtain: anchor at left edge, extends to center
                        x = (col / (this.cols - 1)) * (w / 2);
                    } else {
                        // Right curtain: anchor at center, extends to right edge
                        x = (w / 2) + (col / (this.cols - 1)) * (w / 2);
                    }
                    y = (row / (this.rows - 1)) * h;

                    curtain.push({
                        x, y,
                        oldX: x,
                        oldY: y,
                        restX: x,
                        restY: y,
                        pinned: row === 0,
                        side: side,
                        col: col,
                        row: row
                    });
                }
            }
            this.particles.push(curtain);
        }
    }

    setMouse(x, y, active) {
        this.mouseX = x;
        this.mouseY = y;
        this.mouseActive = active;
    }

    // Set how far open the curtains are (0 = fully open, 0.5 = closed)
    setOpenAmount(leftRatio, rightRatio) {
        this.targetLeftPin = leftRatio;
        this.targetRightPin = rightRatio;
    }

    _getParticle(curtain, col, row) {
        return curtain[row * this.cols + col];
    }

    _constrainPair(p1, p2, restDist) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.0001) return;
        const diff = (restDist - dist) / dist * 0.5;
        const offsetX = dx * diff;
        const offsetY = dy * diff;

        if (!p1.pinned) { p1.x -= offsetX; p1.y -= offsetY; }
        if (!p2.pinned) { p2.x += offsetX; p2.y += offsetY; }
    }

    update() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Lerp pin positions (this is how the curtains open/close)
        this.leftPinRatio += (this.targetLeftPin - this.leftPinRatio) * this.pinLerp;
        this.rightPinRatio += (this.targetRightPin - this.rightPinRatio) * this.pinLerp;

        const restSpacingX_half = (w / 2) / (this.cols - 1);
        const restSpacingY = h / (this.rows - 1);
        const restDist = Math.sqrt(restSpacingX_half * restSpacingX_half + restSpacingY * restSpacingY) * 0.7;
        const restDistH = restSpacingX_half;
        const restDistV = restSpacingY;

        for (let side = 0; side < 2; side++) {
            const curtain = this.particles[side];
            const pinRatio = side === 0 ? this.leftPinRatio : this.rightPinRatio;

            // Update pinned row positions (top row slides to create open/close)
            for (let col = 0; col < this.cols; col++) {
                const p = this._getParticle(curtain, col, 0);
                if (side === 0) {
                    // Left curtain: compress pins toward left edge
                    p.x = (col / (this.cols - 1)) * (w * pinRatio);
                } else {
                    // Right curtain: compress pins toward right edge
                    p.x = w - ((this.cols - 1 - col) / (this.cols - 1)) * (w * pinRatio);
                }
                p.y = 0;
                p.oldX = p.x;
                p.oldY = p.y;
            }

            // Verlet integration for non-pinned particles
            for (let i = 0; i < curtain.length; i++) {
                const p = curtain[i];
                if (p.pinned) continue;

                const vx = (p.x - p.oldX) * this.damping;
                const vy = (p.y - p.oldY) * this.damping;

                p.oldX = p.x;
                p.oldY = p.y;

                p.x += vx;
                p.y += vy + this.gravity;

                // Mouse repulsion
                if (this.mouseActive) {
                    const dx = p.x - this.mouseX;
                    const dy = p.y - this.mouseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.mouseRadius && dist > 1) {
                        const force = (this.mouseRadius - dist) / this.mouseRadius * this.mouseStrength;
                        p.x += (dx / dist) * force * 8;
                        p.y += (dy / dist) * force * 4;
                    }
                }

                // Keep in bounds
                if (p.y > h) { p.y = h; p.oldY = h; }
                if (p.x < 0) { p.x = 0; }
                if (p.x > w) { p.x = w; }
            }

            // Constraint solving
            for (let iter = 0; iter < this.constraintIterations; iter++) {
                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        const p = this._getParticle(curtain, col, row);

                        // Horizontal constraint
                        if (col < this.cols - 1) {
                            this._constrainPair(p, this._getParticle(curtain, col + 1, row), restDistH * pinRatio * 2 + 2);
                        }
                        // Vertical constraint
                        if (row < this.rows - 1) {
                            this._constrainPair(p, this._getParticle(curtain, col, row + 1), restDistV);
                        }
                        // Diagonal shear — gives the cloth body
                        if (col < this.cols - 1 && row < this.rows - 1) {
                            this._constrainPair(p, this._getParticle(curtain, col + 1, row + 1), restDist * pinRatio * 2 + 3);
                        }
                    }
                }
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        for (let side = 0; side < 2; side++) {
            const curtain = this.particles[side];

            // Render as filled quads with lighting
            for (let row = 0; row < this.rows - 1; row++) {
                for (let col = 0; col < this.cols - 1; col++) {
                    const p00 = this._getParticle(curtain, col, row);
                    const p10 = this._getParticle(curtain, col + 1, row);
                    const p01 = this._getParticle(curtain, col, row + 1);
                    const p11 = this._getParticle(curtain, col + 1, row + 1);

                    // Calculate normal for lighting (simplified)
                    const dx = p10.x - p00.x;
                    const normalFactor = dx / ((w / 2) / (this.cols - 1));
                    // Positive normal = facing right (lit), negative = facing left (shadowed)
                    const light = Math.max(0.15, Math.min(1, 0.5 + normalFactor * 0.5));

                    // Deep velvet red with lighting
                    const r = Math.floor(140 * light + 40);
                    const g = Math.floor(15 * light);
                    const b = Math.floor(30 * light + 15);

                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.beginPath();
                    ctx.moveTo(p00.x, p00.y);
                    ctx.lineTo(p10.x, p10.y);
                    ctx.lineTo(p11.x, p11.y);
                    ctx.lineTo(p01.x, p01.y);
                    ctx.closePath();
                    ctx.fill();

                    // Add subtle highlight streaks on prominent folds
                    if (light > 0.7) {
                        ctx.strokeStyle = `rgba(200, 100, 80, ${(light - 0.7) * 0.3})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(p00.x, p00.y);
                        ctx.lineTo(p01.x, p01.y);
                        ctx.stroke();
                    }
                }
            }

            // Gold fringe along the inner edge (last column for left, first column for right)
            const fringeCol = side === 0 ? this.cols - 1 : 0;
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#d4af37';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            for (let row = 0; row < this.rows; row++) {
                const p = this._getParticle(curtain, fringeCol, row);
                if (row === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Bottom fringe tassels
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
            ctx.lineWidth = 1;
            for (let col = 0; col < this.cols; col += 2) {
                const p = this._getParticle(curtain, col, this.rows - 1);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + (Math.random() * 4 - 2), p.y + 8 + Math.random() * 6);
                ctx.stroke();
            }
        }
    }

    animate() {
        this.update();
        this.render();
    }
}

// ===== INITIALIZE CURTAINS =====

// --- PRELOADER CURTAIN ---
const preloaderCanvas = document.createElement('canvas');
preloaderCanvas.id = 'preloader-curtain-canvas';
preloaderCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;';

const preloaderEl = document.getElementById('preloader');
if (preloaderEl) {
    // Hide the old CSS curtains
    const oldLeft = preloaderEl.querySelector('.curtain-left');
    const oldRight = preloaderEl.querySelector('.curtain-right');
    if (oldLeft) oldLeft.style.display = 'none';
    if (oldRight) oldRight.style.display = 'none';

    preloaderEl.querySelector('.preloader-inner').appendChild(preloaderCanvas);

    const preloaderCloth = new Cloth(preloaderCanvas, {
        cols: 35, rows: 45, gravity: 0.4, damping: 0.97, iterations: 7
    });

    // Start fully closed
    preloaderCloth.leftPinRatio = 0.5;
    preloaderCloth.rightPinRatio = 0.5;
    preloaderCloth.targetLeftPin = 0.5;
    preloaderCloth.targetRightPin = 0.5;

    let preloaderOpened = false;
    let preloaderDone = false;

    function animatePreloader() {
        if (preloaderDone) return;
        preloaderCloth.animate();
        requestAnimationFrame(animatePreloader);
    }
    animatePreloader();

    // On page load, open the curtains
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloaderCloth.targetLeftPin = 0.0;
            preloaderCloth.targetRightPin = 0.0;
            preloaderCloth.pinLerp = 0.03;
            preloaderOpened = true;

            // Fade out preloader after curtains open
            setTimeout(() => {
                if (preloaderEl) {
                    preloaderEl.classList.add('loaded');
                    setTimeout(() => {
                        preloaderDone = true;
                        preloaderEl.remove();
                    }, 800);
                }
            }, 2000);
        }, 1000);
    });
}

// --- HERO SECTION CURTAIN ---
const heroSection = document.querySelector('.hero-section');
if (heroSection) {
    // Hide old CSS curtain divs
    const oldL = heroSection.querySelector('.curtain-l');
    const oldR = heroSection.querySelector('.curtain-r');
    if (oldL) oldL.style.display = 'none';
    if (oldR) oldR.style.display = 'none';

    const heroCanvas = document.createElement('canvas');
    heroCanvas.id = 'hero-curtain-canvas';
    heroCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;';
    heroSection.appendChild(heroCanvas);

    const heroCloth = new Cloth(heroCanvas, {
        cols: 28, rows: 35, gravity: 0.3, damping: 0.97, iterations: 5,
        mouseRadius: 150, mouseStrength: 0.8
    });
    heroCloth.leftPinRatio = 0.12;
    heroCloth.rightPinRatio = 0.12;
    heroCloth.targetLeftPin = 0.12;
    heroCloth.targetRightPin = 0.12;

    // Track mouse on the hero section
    heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        heroCloth.setMouse(e.clientX - rect.left, e.clientY - rect.top, true);

        // Also open/close based on horizontal position
        const mouseX = e.clientX;
        const centerX = window.innerWidth / 2;
        const dist = Math.abs(mouseX - centerX) / centerX;
        const ratio = 0.12 + dist * 0.18;
        heroCloth.setOpenAmount(ratio, ratio);
    });

    heroSection.addEventListener('mouseleave', () => {
        heroCloth.setMouse(0, 0, false);
        heroCloth.setOpenAmount(0.12, 0.12);
    });

    function animateHero() {
        heroCloth.animate();
        requestAnimationFrame(animateHero);
    }

    // Start after preloader is done
    setTimeout(animateHero, 100);

    window.addEventListener('resize', () => heroCloth.resize());
}
