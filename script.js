// ===== FIX: Declare isHoveringForm early to avoid temporal dead zone =====
let isHoveringForm = false;

// Preloader is handled by curtain.js (cloth physics simulation)

// ===== MOBILE MENU TOGGLE =====
const mobileBtn = document.querySelector('.mobile-menu-btn');
const nav = document.querySelector('.magnetic-nav');

if (mobileBtn && nav) {
    mobileBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
        const icon = mobileBtn.querySelector('i');
        if(nav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    const navLinks = nav.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            const icon = mobileBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });
}

// ===== CUSTOM CURSOR (Ultra Smooth) =====
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

let xTo, yTo;
if (cursorOutline) {
    xTo = gsap.quickTo(cursorOutline, "left", {duration: 0.4, ease: "power3.out"});
    yTo = gsap.quickTo(cursorOutline, "top", {duration: 0.4, ease: "power3.out"});
}

window.addEventListener('mousemove', (e) => {
    if (cursorDot) {
        cursorDot.style.left = `${e.clientX}px`;
        cursorDot.style.top = `${e.clientY}px`;
    }
    if (cursorOutline && xTo && yTo) {
        xTo(e.clientX);
        yTo(e.clientY);
    }
});

// Hide cursor when leaving the window
document.addEventListener('mouseleave', () => {
    if (cursorDot) cursorDot.style.opacity = '0';
    if (cursorOutline) cursorOutline.style.opacity = '0';
});
document.addEventListener('mouseenter', () => {
    if (!isHoveringForm) {
        if (cursorDot) cursorDot.style.opacity = '1';
        if (cursorOutline) cursorOutline.style.opacity = '1';
    }
});

// Hover effect for clickable elements
const hoverables = document.querySelectorAll('a, .magnetic, .work-card, .gallery-item, .timeline-card, .award-card');
hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

// Hide cursor over iframe/form
const formContainer = document.querySelector('.tally-form');
if (formContainer) {
    formContainer.addEventListener('mouseenter', () => {
        isHoveringForm = true;
        if (cursorDot) cursorDot.style.opacity = '0';
        if (cursorOutline) cursorOutline.style.opacity = '0';
    });
    formContainer.addEventListener('mouseleave', () => {
        isHoveringForm = false;
        if (cursorDot) cursorDot.style.opacity = '1';
        if (cursorOutline) cursorOutline.style.opacity = '1';
    });
}

// ===== MAGNETIC MOTION PRIMITIVES =====
const magnetics = document.querySelectorAll('.magnetic');
magnetics.forEach((magnetic) => {
    magnetic.addEventListener('mousemove', function(e) {
        const position = magnetic.getBoundingClientRect();
        const x = e.clientX - position.left - position.width / 2;
        const y = e.clientY - position.top - position.height / 2;
        gsap.to(magnetic, { x: x * 0.25, y: y * 0.25, duration: 0.6, ease: "power3.out" });
    });
    magnetic.addEventListener('mouseleave', function() {
        gsap.to(magnetic, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
    });
});

// ===== GSAP SCROLL ANIMATIONS =====
gsap.registerPlugin(ScrollTrigger);

// Hero entrance
gsap.from(".split-text", { y: 60, opacity: 0, duration: 1.8, ease: "power4.out", stagger: 0.15 });
gsap.from(".fade-up", { y: 30, opacity: 0, duration: 1.5, delay: 0.6, ease: "power3.out" });

// Reveal on scroll
document.querySelectorAll('.reveal').forEach((el) => {
    gsap.fromTo(el,
        { opacity: 0, y: 60 },
        {
            scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none reverse" },
            opacity: 1, y: 0, duration: 1.2, ease: "expo.out"
        }
    );
});

// Floating image parallax
gsap.to(".floating-img", {
    yPercent: 15, ease: "none",
    scrollTrigger: { trigger: ".vision-section", start: "top bottom", end: "bottom top", scrub: 1.5 }
});

// ===== ACTIVE NAV HIGHLIGHTING =====
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-link');

sections.forEach(section => {
    ScrollTrigger.create({
        trigger: section,
        start: "top 40%",
        end: "bottom 40%",
        onEnter: () => setActiveNav(section.id),
        onEnterBack: () => setActiveNav(section.id),
    });
});

function setActiveNav(sectionId) {
    navLinksAll.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
}

// Interactive stage curtains are handled by curtain.js (cloth physics simulation)

// ===== NUMBER COUNTERS (AWARDS) =====
const numbers = document.querySelectorAll('.award-number');
numbers.forEach(num => {
    const targetVal = parseInt(num.getAttribute('data-target'));
    const originalText = num.innerText;
    const suffix = originalText.replace(/[0-9]/g, '');
    
    if (!isNaN(targetVal)) {
        num.innerText = "0" + suffix; // Reset to 0
        ScrollTrigger.create({
            trigger: num,
            start: "top 85%",
            once: true, // Only animate once
            onEnter: () => {
                gsap.to(num, {
                    innerHTML: targetVal,
                    duration: 2.5,
                    ease: "power2.out",
                    snap: { innerHTML: 1 }, // Ensure integers
                    onUpdate: function() {
                        num.innerHTML = this.targets()[0].innerHTML + suffix;
                    }
                });
            }
        });
    }
});

// ===== INTERACTIVE SURVEY POLL =====
const pollOptions = document.querySelectorAll('.poll-option');
let hasVoted = false;

pollOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (hasVoted) return; // Only allow one vote
        hasVoted = true;
        
        let totalVotes = 0;
        pollOptions.forEach(opt => totalVotes += parseInt(opt.getAttribute('data-votes')));
        totalVotes += 1; // Add the user's vote
        
        // Add user vote to clicked option
        const currentVotes = parseInt(option.getAttribute('data-votes')) + 1;
        option.setAttribute('data-votes', currentVotes);
        
        // Animate fills and percentages
        pollOptions.forEach(opt => {
            const votes = parseInt(opt.getAttribute('data-votes'));
            const percent = Math.round((votes / totalVotes) * 100);
            const fill = opt.querySelector('.poll-fill');
            const percentText = opt.querySelector('.poll-percent');
            
            opt.classList.add('voted');
            opt.style.setProperty('--target-width', `${percent}%`);
            
            // Animate percentage text
            gsap.to(percentText, {
                innerHTML: percent,
                duration: 1.5,
                snap: { innerHTML: 1 },
                onUpdate: function() {
                    percentText.innerHTML = this.targets()[0].innerHTML + "%";
                }
            });
            
            // Highlight chosen option
            if (opt === option) {
                opt.style.borderColor = "var(--accent)";
                fill.style.background = "linear-gradient(90deg, rgba(212,175,55,0.5), rgba(201,24,74,0.5))";
            }
        });
    });
});

// ===== HORIZONTAL TIMELINE NAVIGATION =====
const timelineWrapper = document.querySelector('.timeline-wrapper');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

if (timelineWrapper && prevBtn && nextBtn) {
    const scrollAmount = 390; // Card width (350) + gap (40)

    nextBtn.addEventListener('click', () => {
        timelineWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    prevBtn.addEventListener('click', () => {
        timelineWrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
}

// ===== LIGHTBOX =====
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.querySelector('.lightbox-close');
const galleryItems = document.querySelectorAll('.gallery-item[data-src]');

galleryItems.forEach(item => {
    item.addEventListener('click', () => {
        const src = item.getAttribute('data-src');
        if (lightboxImg && lightbox) {
            lightboxImg.src = src;
            lightbox.classList.add('active');
        }
    });
});

if (lightboxClose && lightbox) {
    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });
}
if (lightbox) {
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.classList.remove('active');
    });
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') lightbox.classList.remove('active');
    });
}

// ===== CURSOR SPARKS / PAINT TRAIL =====
if (window.matchMedia("(pointer: fine)").matches) {
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.id = 'cursor-canvas';
    cursorCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;';
    document.body.appendChild(cursorCanvas);

    const ctx = cursorCanvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        cursorCanvas.width = window.innerWidth;
        cursorCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Spark {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 5 + 1.5;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
            this.gravity = 0.03;
            this.color = Math.random() > 0.6 ? '#d4af37' : '#c9184a';
            this.life = 1.0;
            this.decay = Math.random() * 0.015 + 0.01;
        }
        update() {
            this.speedY += this.gravity;
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= this.decay;
            this.size *= 0.96;
        }
        draw() {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    let lastX = null;
    let lastY = null;

    window.addEventListener('mousemove', (e) => {
        if (isHoveringForm) { lastX = null; lastY = null; return; }
        if (lastX === null || lastY === null) { lastX = e.clientX; lastY = e.clientY; return; }

        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const count = Math.min(Math.floor(dist / 3), 40) + 1;

        for(let i = 0; i < count; i++) {
            const t = i / count;
            const spawnX = lastX + (dx * t) + (Math.random() * 6 - 3);
            const spawnY = lastY + (dy * t) + (Math.random() * 6 - 3);
            particles.push(new Spark(spawnX, spawnY));
        }
        lastX = e.clientX;
        lastY = e.clientY;
    });

    window.addEventListener('mouseout', () => { lastX = null; lastY = null; });

    // Burst on click
    window.addEventListener('mousedown', (e) => {
        if (isHoveringForm) return;
        const burstColors = ['#d4af37', '#c9184a', '#ff4d6d', '#ffdf00', '#ffffff'];
        for(let i = 0; i < 35; i++) {
            const spark = new Spark(e.clientX, e.clientY);
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 10 + 2;
            spark.speedX = Math.cos(angle) * velocity;
            spark.speedY = Math.sin(angle) * velocity;
            spark.gravity = 0.15;
            spark.color = burstColors[Math.floor(Math.random() * burstColors.length)];
            spark.size = Math.random() * 8 + 2;
            spark.decay = Math.random() * 0.03 + 0.01;
            particles.push(spark);
        }
        if (cursorOutline) {
            gsap.fromTo(cursorOutline, { scale: 0.5 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" });
        }
    });

    function animateSparks() {
        ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0 || particles[i].size <= 0.1) {
                particles.splice(i, 1);
                i--;
            }
        }
        requestAnimationFrame(animateSparks);
    }
    animateSparks();
}
