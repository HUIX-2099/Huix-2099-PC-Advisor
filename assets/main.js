// Mobile menu toggle
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('hidden');
});

// Year in footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Reveal on scroll
const revealEls = [];
document.querySelectorAll('.section, .card, .feature, .shot, .section-title').forEach(el => {
  el.classList.add('reveal');
  revealEls.push(el);
});
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }
}, { threshold: 0.1 });
revealEls.forEach(el => io.observe(el));

// Demo log for Advisor
const demoBtn = document.querySelector('[data-demo]');
const log = document.getElementById('log');
const lines = [
  '[advisor] initializing…',
  '[sensors] cpu 7% | gpu 4% | mem 42% | disk 68% | net idle',
  '[analysis] background apps detected: 3',
  '[tip] disable startup item: Widgets.exe (impact: medium)',
  '[tip] schedule trim for SSD C: (last run 21d ago)',
  '[status] overall: healthy',
];
demoBtn?.addEventListener('click', async () => {
  if (!log) return;
  log.innerHTML = '';
  for (const l of lines) {
    await new Promise(r => setTimeout(r, 550));
    const p = document.createElement('p');
    p.textContent = l;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }
});

// ------------------------------------------------------------
// Lightweight 3D Mode (Three.js) for hero background
// ------------------------------------------------------------
const threeMount = document.getElementById('threeMount');
const threeToggle = document.getElementById('threeToggle');
const threeToggleMobile = document.getElementById('threeToggleMobile');

let threeEnabled = false;
let threeCleanup = null;
let threeLoaded = false;

function loadThreeOnce() {
  return new Promise((resolve, reject) => {
    if (window.THREE) { threeLoaded = true; return resolve(); }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/three@0.158.0/build/three.min.js';
    s.onload = () => { threeLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadGLTFLoaderOnce() {
  return new Promise((resolve, reject) => {
    if (window.THREE && THREE.GLTFLoader) return resolve();
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/three@0.158.0/examples/js/loaders/GLTFLoader.js';
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function startThree() {
  if (!threeMount || threeEnabled) return;
  await loadThreeOnce();
  const THREE = window.THREE;
  if (!THREE) return;

  const width = threeMount.clientWidth;
  const height = threeMount.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = false;
  threeMount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0x9be7f5, 0.8);
  dir.position.set(3, 4, 5);
  scene.add(dir);

  // Try loading GLB model first; fallback to primitive if it fails
  let mesh = null;
  let edges = null;
  try {
    await loadGLTFLoaderOnce();
    const loader = new THREE.GLTFLoader();
    let url = 'asetts/usb.glb';
    const gltf = await new Promise((res, rej) => loader.load(url, res, undefined, () => {
      // fallback to assets/ if asetts/ missing
      loader.load('assets/usb.glb', res, undefined, rej);
    }));
    mesh = gltf.scene;
    // Center & scale model
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.8 / maxDim; // fit nicely behind splash
    mesh.scale.setScalar(scale);
    const center = new THREE.Vector3();
    box.getCenter(center);
    mesh.position.sub(center.multiplyScalar(scale));
    scene.add(mesh);
  } catch (e) {
    // Geometry (clean, techy look)
    const geo = new THREE.IcosahedronGeometry(1.6, 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x101316,
      roughness: 0.25,
      metalness: 0.75,
      emissive: 0x0,
      flatShading: true,
    });
    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    // Subtle wireframe overlay
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3ddcf4, opacity: 0.15, transparent: true });
    edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), lineMat);
    mesh.add(edges);
  }

  let rafId;
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    if (mesh) {
      mesh.rotation.y += 0.0045;
      mesh.rotation.x += 0.0015;
    }
    renderer.render(scene, camera);
  };
  animate();

  function onResize() {
    const w = threeMount.clientWidth;
    const h = threeMount.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  threeCleanup = () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    if (mesh && mesh.geometry) mesh.geometry.dispose?.();
    if (edges) edges.geometry?.dispose?.();
    threeMount.innerHTML = '';
    threeEnabled = false;
    setToggleLabels();
  };

  threeEnabled = true;
  setToggleLabels();
}

function stopThree() {
  if (threeCleanup) threeCleanup();
}

function setToggleLabels() {
  const label = threeEnabled ? '3D On' : '3D Mode';
  if (threeToggle) threeToggle.textContent = label;
  if (threeToggleMobile) threeToggleMobile.textContent = label;
}

function toggleThree() { threeEnabled ? stopThree() : startThree(); }

threeToggle?.addEventListener('click', toggleThree);
threeToggleMobile?.addEventListener('click', () => { toggleThree(); mobileMenu?.classList.add('hidden'); });
