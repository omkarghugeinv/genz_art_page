const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 100;

// Renderer setup (Dark, dramatic feel)
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Create Particles (Stage Dust)
const particlesGeometry = new THREE.BufferGeometry();
// Performance optimization: fewer particles on mobile devices
const isMobile = window.innerWidth <= 768;
const particlesCount = isMobile ? 500 : 1500;

const posArray = new Float32Array(particlesCount * 3);
const colorsArray = new Float32Array(particlesCount * 3);

// Theatre Theme colors (Gold and White)
const colorGold = new THREE.Color(0xd4af37); // Metallic Gold
const colorWhite = new THREE.Color(0xffffff); // Stark White

for(let i = 0; i < particlesCount * 3; i+=3) {
    // Spread particles across a wide volume
    posArray[i] = (Math.random() - 0.5) * 500;     // x
    posArray[i+1] = (Math.random() - 0.5) * 500;   // y
    posArray[i+2] = (Math.random() - 0.5) * 500;   // z

    // Mix colors randomly per particle (mostly gold, some white sparks)
    const mixedColor = Math.random() > 0.8 ? colorWhite : colorGold;
    
    colorsArray[i] = mixedColor.r;
    colorsArray[i+1] = mixedColor.g;
    colorsArray[i+2] = mixedColor.b;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

// Particle Material (Glowing dust)
const particlesMaterial = new THREE.PointsMaterial({
    size: 1.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending // Gives it that light-emitting glow
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Add a soft red ambient spotlight effect in the background
const ambientLight = new THREE.AmbientLight(0xc9184a, 0.2); 
scene.add(ambientLight);

// Mouse Interaction variables
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// Animation Loop
const clock = new THREE.Clock();

const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    // Very slow, drifting rotation (like dust in the air)
    particlesMesh.rotation.y = elapsedTime * 0.02;
    particlesMesh.rotation.x = elapsedTime * 0.01;

    // Subtle drift on Z axis
    particlesMesh.position.y = Math.sin(elapsedTime * 0.5) * 2;

    // Ease towards mouse position slightly to feel interactive
    targetX = mouseX * 0.0005;
    targetY = mouseY * 0.0005;

    // Smoothly interpolate rotation towards the mouse target
    particlesMesh.rotation.y += 0.05 * (targetX - particlesMesh.rotation.y);
    particlesMesh.rotation.x += 0.05 * (targetY - particlesMesh.rotation.x);

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}

tick();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
