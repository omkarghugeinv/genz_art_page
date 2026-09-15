// ===== THREE.JS REALISTIC CLOTH PHYSICS =====
// Uses Verlet integration to deform a high-resolution 3D plane mapped with a real curtain texture.

class RealisticCurtain {
    constructor(container, opts = {}) {
        this.container = container;
        this.cols = opts.cols || 35;
        this.rows = opts.rows || 45;
        this.gravity = opts.gravity || 0.01;
        this.damping = opts.damping || 0.95;
        this.iterations = opts.iterations || 5;
        this.textureUrl = opts.textureUrl || 'images/curtain_texture.jpg';

        this.mouseActive = false;
        this.mouse = new THREE.Vector2(-1000, -1000); // 3D world coords
        this.mouseRadius = opts.mouseRadius || 1.5;
        this.mouseStrength = opts.mouseStrength || 0.03;

        this.leftPinRatio = 0.5;
        this.rightPinRatio = 0.5;
        this.targetLeftPin = 0.5;
        this.targetRightPin = 0.5;
        this.pinLerp = 0.02;

        this.particles = [];
        this.restDistH = 0;
        this.restDistV = 0;
        this.restDistD = 0;

        this.initThree();
        this.loadTexture();
    }

    initThree() {
        this.isSupported = false;
        try {
            this.scene = new THREE.Scene();
            
            // Setup orthographic camera to perfectly match screen
            this.w = this.container.offsetWidth;
            this.h = this.container.offsetHeight;
            
            this.camera = new THREE.OrthographicCamera(-this.w/2, this.w/2, this.h/2, -this.h/2, 0.1, 5000);
            this.camera.position.z = 1000;

            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this.renderer.setSize(this.w, this.h);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.container.appendChild(this.renderer.domElement);

            // Lights to create the velvet sheen
            const ambient = new THREE.AmbientLight(0xffffff, 0.4);
            this.scene.add(ambient);
            
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(0, 0, 10);
            this.scene.add(dirLight);

            const pointLight = new THREE.PointLight(0xffaaaa, 0.5, 2000);
            pointLight.position.set(0, this.h/2, 500);
            this.scene.add(pointLight);
            
            this.isSupported = true;
        } catch (e) {
            console.warn("WebGL not supported or failed to initialize:", e);
        }
    }

    loadTexture() {
        if (!this.isSupported) return;
        const loader = new THREE.TextureLoader();
        loader.load(this.textureUrl, (tex) => {
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            // Using MeshStandardMaterial so it reacts to light like fabric
            this.material = new THREE.MeshStandardMaterial({
                map: tex,
                roughness: 0.8, // Velvet is rough but has a sheen
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            this.initGeometry();
            this.animate();
        });
    }

    initGeometry() {
        // PlaneGeometry(width, height, widthSegments, heightSegments)
        // We make two planes: one for the left curtain, one for the right
        const wHalf = this.w / 2;
        
        this.geoL = new THREE.PlaneGeometry(wHalf, this.h, this.cols - 1, this.rows - 1);
        this.geoR = new THREE.PlaneGeometry(wHalf, this.h, this.cols - 1, this.rows - 1);

        this.meshL = new THREE.Mesh(this.geoL, this.material);
        this.meshR = new THREE.Mesh(this.geoR, this.material);

        this.scene.add(this.meshL);
        this.scene.add(this.meshR);

        this.initPhysics();
    }

    initPhysics() {
        this.particles = [[], []]; // [0] = left, [1] = right
        const wHalf = this.w / 2;

        this.restDistH = wHalf / (this.cols - 1);
        this.restDistV = this.h / (this.rows - 1);
        this.restDistD = Math.sqrt(this.restDistH**2 + this.restDistV**2);

        // Initialize particles from geometry vertices
        const setupCurtain = (geo, side) => {
            const pos = geo.attributes.position;
            const pArray = [];
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                
                // Get row and col based on vertex index (PlaneGeometry layout)
                const col = i % this.cols;
                const row = Math.floor(i / this.cols);

                pArray.push({
                    x, y, z,
                    oldX: x, oldY: y, oldZ: z,
                    origX: x, origY: y, origZ: z,
                    pinned: row === 0, // Pin the top row
                    col, row
                });
            }
            return pArray;
        };

        this.particles[0] = setupCurtain(this.geoL, 0);
        this.particles[1] = setupCurtain(this.geoR, 1);
        
        // Position meshes properly
        this.meshL.position.x = -wHalf / 2;
        this.meshR.position.x = wHalf / 2;
    }

    setMouse(screenX, screenY, active) {
        this.mouseActive = active;
        // Convert screen coordinates to world coordinates
        this.mouse.x = screenX - this.w / 2;
        this.mouse.y = -(screenY - this.h / 2);
    }

    constrainPair(p1, p2, rest) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist === 0) return;
        const diff = (dist - rest) / dist * 0.5;

        const ox = dx * diff;
        const oy = dy * diff;
        const oz = dz * diff;

        if (!p1.pinned) { p1.x += ox; p1.y += oy; p1.z += oz; }
        if (!p2.pinned) { p2.x -= ox; p2.y -= oy; p2.z -= oz; }
    }

    updatePhysics() {
        if (!this.particles[0].length) return;

        this.leftPinRatio += (this.targetLeftPin - this.leftPinRatio) * this.pinLerp;
        this.rightPinRatio += (this.targetRightPin - this.rightPinRatio) * this.pinLerp;

        const wHalf = this.w / 2;

        for (let side = 0; side < 2; side++) {
            const curtain = this.particles[side];
            const mesh = side === 0 ? this.meshL : this.meshR;
            const geo = mesh.geometry;
            const pos = geo.attributes.position;
            const pinRatio = side === 0 ? this.leftPinRatio : this.rightPinRatio;
            const meshOffsetX = side === 0 ? -wHalf / 2 : wHalf / 2;

            // 1. Update pinned top row to open/close
            for (let col = 0; col < this.cols; col++) {
                const p = curtain[col]; // row 0
                if (side === 0) {
                    // Left curtain compresses to the left
                    p.x = p.origX - (col / (this.cols - 1)) * (wHalf * (1 - pinRatio * 2));
                } else {
                    // Right curtain compresses to the right
                    p.x = p.origX + ((this.cols - 1 - col) / (this.cols - 1)) * (wHalf * (1 - pinRatio * 2));
                }
                p.z = Math.sin(col * 0.5) * 10 * pinRatio; // Give folds depth as it opens
            }

            // 2. Verlet integration
            for (let i = 0; i < curtain.length; i++) {
                const p = curtain[i];
                if (p.pinned) continue;

                const vx = (p.x - p.oldX) * this.damping;
                const vy = (p.y - p.oldY) * this.damping;
                const vz = (p.z - p.oldZ) * this.damping;

                p.oldX = p.x;
                p.oldY = p.y;
                p.oldZ = p.z;

                p.x += vx;
                p.y += vy - this.gravity * this.h; // Gravity pulls down (-Y in 3D)
                p.z += vz;
                
                // Restoring force to bring it back to flat Z over time
                p.z += (0 - p.z) * 0.05;

                // Mouse interaction (Gentle pull towards mouse)
                if (this.mouseActive) {
                    const absPx = p.x + meshOffsetX;
                    const dx = this.mouse.x - absPx; // Vector towards mouse
                    const dy = this.mouse.y - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < this.mouseRadius) {
                        // Spring-like pull that gets stronger closer to the center of the mouse
                        const pullStrength = 0.05 * (this.mouseRadius - dist) / this.mouseRadius; 
                        p.x += dx * pullStrength;
                        p.y += dy * pullStrength;
                        p.z += 10 * pullStrength; // Pull slightly out towards the screen
                    }
                }

                // Floor constraint (lowered so it hangs naturally without bouncing on the exact bottom pixel)
                if (p.y < -this.h) {
                    p.y = -this.h;
                    p.oldY = p.y;
                }
            }

            // 3. Constraints (iterations)
            for (let iter = 0; iter < this.iterations; iter++) {
                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.cols; c++) {
                        const idx = r * this.cols + c;
                        const p = curtain[idx];

                        if (c < this.cols - 1) { // Right neighbor
                            this.constrainPair(p, curtain[idx + 1], this.restDistH * pinRatio * 2);
                        }
                        if (r < this.rows - 1) { // Bottom neighbor
                            this.constrainPair(p, curtain[idx + this.cols], this.restDistV);
                        }
                    }
                }
            }

            // 4. Update geometry
            for (let i = 0; i < curtain.length; i++) {
                const p = curtain[i];
                pos.setXYZ(i, p.x, p.y, p.z);
            }
            pos.needsUpdate = true;
            geo.computeVertexNormals(); // Crucial for lighting!
        }
    }

    animate = () => {
        if (this.destroyed) return;
        this.animationFrameId = requestAnimationFrame(this.animate);
        this.updatePhysics();
        if (this.renderer) this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.destroyed = true;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        if (this.geoL) this.geoL.dispose();
        if (this.geoR) this.geoR.dispose();
        if (this.material) this.material.dispose();
        if (this.material && this.material.map) this.material.map.dispose();
        
        if (this.renderer) {
            this.renderer.dispose();
            const gl = this.renderer.getContext();
            if (gl) {
                const loseContext = gl.getExtension('WEBGL_lose_context');
                if (loseContext) loseContext.loseContext();
            }
            this.container.removeChild(this.renderer.domElement);
        }
    }

    resize() {
        this.w = this.container.offsetWidth;
        this.h = this.container.offsetHeight;
        this.camera.left = -this.w / 2;
        this.camera.right = this.w / 2;
        this.camera.top = this.h / 2;
        this.camera.bottom = -this.h / 2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.w, this.h);
        // Quick re-init of physics spacing
        this.initPhysics(); 
    }
}


// ===== INIT SCRIPTS =====

const isMobileDevice = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;

// 1. PRELOADER CURTAINS
const preloaderEl = document.getElementById('preloader');
if (preloaderEl) {
    const oldL = preloaderEl.querySelector('.curtain-left');
    const oldR = preloaderEl.querySelector('.curtain-right');
    
    let introCloth = null;
    
    if (!isMobileDevice) {
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;';
        preloaderEl.querySelector('.preloader-inner').appendChild(container);

        introCloth = new RealisticCurtain(container, {
            cols: 30, rows: 40, gravity: 0.015, iterations: 5
        });

        if (introCloth.isSupported) {
            // WebGL successful, hide CSS fallback curtains
            if (oldL) oldL.style.display = 'none';
            if (oldR) oldR.style.display = 'none';
            
            introCloth.targetLeftPin = 0.5; // Fully closed
            introCloth.targetRightPin = 0.5;
        } else {
            introCloth.destroy();
            introCloth = null;
        }
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            if (introCloth) {
                introCloth.targetLeftPin = 0.0; // Open
                introCloth.targetRightPin = 0.0;
                introCloth.pinLerp = 0.04;
            }
            
            setTimeout(() => {
                preloaderEl.classList.add('loaded');
                setTimeout(() => {
                    if (introCloth) introCloth.destroy(); // Free WebGL resources!
                    preloaderEl.remove();
                }, 800);
            }, 1500);
        }, 800);
    });
}

// 2. HERO SECTION CURTAINS
const heroSection = document.querySelector('.hero-section');
if (heroSection && !isMobileDevice) {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;';
    heroSection.appendChild(container);

    const heroCloth = new RealisticCurtain(container, {
        cols: 30, rows: 40, gravity: 0.012, iterations: 5,
        mouseRadius: 200, mouseStrength: 0.03
    });
    
    if (heroCloth.isSupported) {
        const oldL = heroSection.querySelector('.curtain-l');
        const oldR = heroSection.querySelector('.curtain-r');
        if (oldL) oldL.style.display = 'none';
        if (oldR) oldR.style.display = 'none';

        // Set to slightly open
        heroCloth.leftPinRatio = 0.15;
        heroCloth.rightPinRatio = 0.15;
        heroCloth.targetLeftPin = 0.15;
        heroCloth.targetRightPin = 0.15;

        const handleMove = (clientX, clientY) => {
            const rect = heroSection.getBoundingClientRect();
            heroCloth.setMouse(clientX - rect.left, clientY - rect.top, true);

            // Extremely subtle opening based on horizontal pos
            const centerX = window.innerWidth / 2;
            const dist = Math.abs(clientX - centerX) / centerX;
            const ratio = 0.15 + dist * 0.03; // Barely moves
            heroCloth.targetLeftPin = ratio;
            heroCloth.targetRightPin = ratio;
        };

        heroSection.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        heroSection.addEventListener('touchmove', (e) => {
            if(e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        const handleLeave = () => {
            heroCloth.setMouse(0, 0, false);
            heroCloth.targetLeftPin = 0.15;
            heroCloth.targetRightPin = 0.15;
        };

        heroSection.addEventListener('mouseleave', handleLeave);
        heroSection.addEventListener('touchend', handleLeave);

        window.addEventListener('resize', () => {
            if (heroCloth) heroCloth.resize();
        });
    } else {
        heroCloth.destroy();
    }
}
