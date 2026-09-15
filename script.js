// --- Mobile Menu Toggle ---
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

    // Close menu when clicking a link
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

// --- Custom Manus Cursor (Ultra Smooth) ---
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

// Use GSAP quickTo for buttery smooth 60fps tracking without tween overhead
let xTo, yTo;
if (cursorOutline) {
    xTo = gsap.quickTo(cursorOutline, "left", {duration: 0.4, ease: "power3.out"});
    yTo = gsap.quickTo(cursorOutline, "top", {duration: 0.4, ease: "power3.out"});
}

window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;

    if (cursorDot) {
        // Dot tracks instantly
        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;
    }

    if (cursorOutline && xTo && yTo) {
        // Outline glides smoothly
        xTo(posX);
        yTo(posY);
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

// Add hover effect for clickable elements
const hoverables = document.querySelectorAll('a, .magnetic, .work-card, .gallery-item');
hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

// Hide custom cursor when hovering over the iframe/form container
const formContainer = document.querySelector('.tally-form');
let isHoveringForm = false;
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

// --- Magnetic Motion Primitives (Smoother elastic ease) ---
const magnetics = document.querySelectorAll('.magnetic');
magnetics.forEach((magnetic) => {
    magnetic.addEventListener('mousemove', function(e) {
        const position = magnetic.getBoundingClientRect();
        const x = e.clientX - position.left - position.width / 2;
        const y = e.clientY - position.top - position.height / 2;
        
        gsap.to(magnetic, {
            x: x * 0.25,
            y: y * 0.25,
            duration: 0.6,
            ease: "power3.out"
        });
    });

    magnetic.addEventListener('mouseleave', function() {
        gsap.to(magnetic, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.4)" // Softened the bounce for luxury feel
        });
    });
});

// --- GSAP Scroll Animations (Refined for fluidity) ---
gsap.registerPlugin(ScrollTrigger);

// Hero Text Split Animation
gsap.from(".split-text", {
    y: 60,
    opacity: 0,
    duration: 1.8,
    ease: "power4.out",
    stagger: 0.15
});

gsap.from(".fade-up", {
    y: 30,
    opacity: 0,
    duration: 1.5,
    delay: 0.6,
    ease: "power3.out"
});

// Reveal Elements on Scroll
const revealElements = document.querySelectorAll('.reveal');
revealElements.forEach((el) => {
    gsap.fromTo(el, 
        { opacity: 0, y: 60 },
        {
            scrollTrigger: {
                trigger: el,
                start: "top 90%", // Trigger slightly earlier
                toggleActions: "play none none reverse"
            },
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: "expo.out" // Extremely smooth, cinematic ease
        }
    );
});

// Floating Image Parallax (Smoother scrub)
gsap.to(".floating-img", {
    yPercent: 15,
    ease: "none",
    scrollTrigger: {
        trigger: ".vision-section",
        start: "top bottom", 
        end: "bottom top",
        scrub: 1.5 // Added lag/smoothing to the scrub
    }
});

// --- Cursor Sparks / Paint Trail (Continuous Interpolation) ---
// Only enable on non-touch devices
if (window.matchMedia("(pointer: fine)").matches) {
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.id = 'cursor-canvas';
    cursorCanvas.style.position = 'fixed';
    cursorCanvas.style.top = '0';
    cursorCanvas.style.left = '0';
    cursorCanvas.style.width = '100vw';
    cursorCanvas.style.height = '100vh';
    cursorCanvas.style.pointerEvents = 'none';
    cursorCanvas.style.zIndex = '9998'; 
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
            // Flow outwards gently
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
            this.gravity = 0.03; // Softer gravity
            
            // Dramatic colors: Metallic Gold or Theatre Red
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
            // Add a soft glow for a smoother, painted look
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Reset shadows for performance
            ctx.shadowBlur = 0;
        }
    }

    // Capture mouse movement with interpolation to prevent gaps
    let lastX = null;
    let lastY = null;
    
    window.addEventListener('mousemove', (e) => {
        if (isHoveringForm) {
            lastX = null;
            lastY = null;
            return;
        }

        if (lastX === null || lastY === null) {
            lastX = e.clientX;
            lastY = e.clientY;
            return;
        }

        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate how many particles to spawn to fill the line seamlessly
        const count = Math.min(Math.floor(dist / 3), 40) + 1; 
        
        for(let i = 0; i < count; i++) {
            // Interpolate perfectly along the path of movement
            const t = i / count;
            const spawnX = lastX + (dx * t) + (Math.random() * 6 - 3);
            const spawnY = lastY + (dy * t) + (Math.random() * 6 - 3);
            particles.push(new Spark(spawnX, spawnY));
        }
        
        lastX = e.clientX;
        lastY = e.clientY;
    });

    // Reset last position if mouse stops or leaves
    window.addEventListener('mouseout', () => { lastX = null; lastY = null; });

    // Burst of colors on click
    window.addEventListener('mousedown', (e) => {
        if (isHoveringForm) return; // Don't burst if clicking on form
        
        const burstCount = 35;
        const burstColors = ['#d4af37', '#c9184a', '#ff4d6d', '#ffdf00', '#ffffff'];
        
        for(let i = 0; i < burstCount; i++) {
            const spark = new Spark(e.clientX, e.clientY);
            
            // Explosion physics
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 10 + 2; // Fast initial speed
            spark.speedX = Math.cos(angle) * velocity;
            spark.speedY = Math.sin(angle) * velocity;
            
            // Override properties for the burst
            spark.gravity = 0.15; // Heavier gravity for burst particles
            spark.color = burstColors[Math.floor(Math.random() * burstColors.length)];
            spark.size = Math.random() * 8 + 2;
            spark.decay = Math.random() * 0.03 + 0.01; // Fade slightly faster
            
            particles.push(spark);
        }
        
        // Add physical "click" feedback to the cursor ring
        if (cursorOutline) {
            gsap.fromTo(cursorOutline, 
                { scale: 0.5 }, 
                { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
            );
        }
    });

    function animateSparks() {
        // Clear canvas with a very slight motion blur fade
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
