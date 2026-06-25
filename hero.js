/* 3D animated background — drifting holo particles + a slow rotating crystal.
   Purely decorative: wrapped in try/catch so the site works even if it fails. */
import * as THREE from 'three';

try {
  const canvas = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070f, 0.085);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 6.2;

  // soft round sprite for glowing dots
  const sprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.65)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  // particle field
  const N = 300;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const palette = [[1, .56, .72], [.72, .61, .88], [.95, .83, .55], [.55, .78, 1]];
  for (let i = 0; i < N; i++) {
    pos[i*3]   = (Math.random() - .5) * 18;
    pos[i*3+1] = (Math.random() - .5) * 13;
    pos[i*3+2] = (Math.random() - .5) * 11;
    const c = palette[i % palette.length];
    col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2];
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.2, map: sprite, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9,
  }));
  scene.add(points);

  // central crystal (wireframe + faint glass shell)
  const ico = new THREE.IcosahedronGeometry(1.7, 1);
  const crystal = new THREE.LineSegments(
    new THREE.EdgesGeometry(ico),
    new THREE.LineBasicMaterial({ color: 0xff9ec4, transparent: true, opacity: 0.32 })
  );
  scene.add(crystal);
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.73, 1),
    new THREE.MeshBasicMaterial({ color: 0xb79be0, transparent: true, opacity: 0.045 })
  );
  scene.add(shell);

  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize); resize();

  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    crystal.rotation.y += 0.0016; crystal.rotation.x += 0.0008;
    shell.rotation.copy(crystal.rotation);
    points.rotation.y += 0.0004;
    camera.position.x += (mx * 1.8 - camera.position.x) * 0.04;
    camera.position.y += (-my * 1.3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  loop();
} catch (e) {
  /* decorative only — ignore */
}
