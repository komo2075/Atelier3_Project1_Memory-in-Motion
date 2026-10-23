
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { points } from './config/points.js';
import { memories } from './config/memories.js';
import { settings } from './config/settings.js';

// =====================================
// 1. THREE.JS SCENE
// =====================================

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f4f2ed');

const camera = new THREE.PerspectiveCamera(
  42,
  innerWidth / innerHeight,
  0.1,
  250
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.querySelector('#scene').appendChild(renderer.domElement);

scene.add(
  new THREE.HemisphereLight(0xffffff, 0xc8c1b5, 2.3)
);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(-8, 17, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -22;
sun.shadow.bias = -0.0005;
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(35, 35),
  new THREE.MeshStandardMaterial({
    color: '#ece9e2',
    roughness: 1
  })
);

floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(
  35, 35, 0xdad6cd, 0xe1ddd5
);

grid.position.y = 0.007;
grid.material.transparent = true;
grid.material.opacity = 0.35;
scene.add(grid);

const campusRoot = new THREE.Group();
scene.add(campusRoot);

// =====================================
// 2. CAMPUS MODEL
// =====================================

function box(x, z, w, d, h, color = '#faf9f6') {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86
    })
  );

  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  campusRoot.add(mesh);

  return mesh;
}

function buildPlaceholder() {
  box(-3.7, -1.7, 3.4, 3.1, 2.6);
  box(2.7, -1.4, 3.5, 2.8, 2.1, '#e9e7e2');
  box(0.6, 3, 4.3, 2.2, 1.1, '#f8f7f4');
  box(-4, 3.5, 2, 2.2, 1.65, '#e2dfd9');

  const canopy = box(
    -0.4, -1.5, 2.5, 1.4, 0.35, '#d9d3ca'
  );

  canopy.position.y = 3.1;

  for (const [x, z, w, d] of [
    [0, 0, 2, 12],
    [-1, 1, 12, 1.4]
  ]) {
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({
        color: '#dedad1'
      })
    );

    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.015, z);
    path.receiveShadow = true;
    campusRoot.add(path);
  }
}

async function loadCampus() {
  if (settings.modelMode !== 'glb') {
    buildPlaceholder();
    return;
  }

  try {
    const gltf = await new GLTFLoader().loadAsync(
      settings.modelPath
    );

    const model = gltf.scene;

    model.scale.setScalar(settings.modelScale);

    model.position.set(
      settings.modelPosition.x,
      settings.modelPosition.y,
      settings.modelPosition.z
    );

    model.rotation.y = settings.modelRotationY;

    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    campusRoot.add(model);
    showStatus('GLB campus loaded');

  } catch (error) {
    console.error('GLB loading failed:', error);
    buildPlaceholder();
    showStatus('GLB unavailable; showing placeholder campus');
  }
}

loadCampus();

// =====================================
// 3. CAMERA CONTROLS
// =====================================

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 6;
controls.maxDistance = 34;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minPolarAngle = 0.12;
controls.target.set(0, 0.7, 0);

function resetView() {
  controls.target.set(0, 0.7, 0);

  camera.position.set(
    12,
    11,
    settings.cameraDistance
  );

  controls.update();
}

resetView();

// =====================================
// 4. MEMORY ELEMENTS
// =====================================

const layer = document.querySelector('#point-layer');
const modal = document.querySelector('#modal');

const img = document.querySelector('#memory-image');
const placeholder = document.querySelector('#image-placeholder');
const imageArea = document.querySelector('#image-area');

const specialPanel = document.querySelector(
  '#special-interaction'
);

const specialInstruction = document.querySelector(
  '#interaction-instruction'
);

const startInteractionButton = document.querySelector(
  '#start-interaction'
);

const fallbackInteractionButton = document.querySelector(
  '#fallback-interaction'
);

const progressContainer = document.querySelector(
  '#interaction-progress'
);

const progressFill = document.querySelector(
  '#interaction-progress-fill'
);

const memoryText = document.querySelector('#memory-text');

let activeMemory = null;
let imageIndex = 0;
let activeInteraction = 'normal';
let revealed = false;

let microphoneStream = null;
let audioContext = null;
let analyser = null;
let micFrame = 0;

let shakeListenerActive = false;
let lastShakeTime = 0;
let lastShakeSample = null;
let shakeHits = 0;

let modalSensorPaused = false;


 
//1.4 version
 // =====================================
 // 5. LANDSCAPE MEMORY - SENSOR CONTROL
 // =====================================

let landscapeReady = false;
let physicalLandscape = false;
let landscapeSensorActive = false;

//1.4.1 version
let landscapeDirection = 0;
// 0 = portrait
// 1 = landscape right
// -1 = landscape left


//1.4.1 version
// Detect physical orientation using gravity.
// Works even when screen rotation is locked.
function onLandscapeMotion(event) {
  if (
    activeInteraction !== 'landscape' ||
    modal.classList.contains('hidden')
  ) {
    return;
  }

  const gravity = event.accelerationIncludingGravity;

  if (
    !gravity ||
    gravity.x == null ||
    gravity.y == null
  ) {
    return;
  }

  const x = gravity.x;
  const y = gravity.y;

  const absX = Math.abs(x);
  const absY = Math.abs(y);

  // Detect landscape orientation
  if (absX > absY * 1.45 && absX > 4.5) {

    physicalLandscape = true;

    //1.4.3 version
    // Detect left or right rotation
    landscapeDirection = x > 0 ? -1 : 1;


    //1.4.2 version
    console.log(
      'Gravity X:', x,
      'Landscape direction:', landscapeDirection
    );


  } else if (
    absY > absX * 1.45 &&
    absY > 4.5
  ) {

    physicalLandscape = false;
    landscapeDirection = 0;

  } else {
    return;
  }

  updateMemoryOrientation();
}



function updateMemoryOrientation() {
  if (
    activeInteraction !== 'landscape' ||
    modal.classList.contains('hidden')
  ) {
    return;
  }

  modal.classList.toggle(
    'memory-landscape',
    physicalLandscape
  );


  //1.4.2 version
  //1.4.1 version
  // Remove previous direction classes
  
  modal.classList.remove(
    'landscape-left',
    'landscape-right'
  );

  if (physicalLandscape) {
    modal.classList.add(
      landscapeDirection === 1
        ? 'landscape-right'
        : 'landscape-left'
    );
  }

  // Rotate the image according to physical orientation.
  // Only rotate manually if the browser is still portrait.
  const screenIsPortrait = window.matchMedia(
    '(orientation: portrait)'
  ).matches;

  if (physicalLandscape && screenIsPortrait) {
    imageArea.style.transform =
      landscapeDirection === 1
        ? 'rotate(90deg)'
        : 'rotate(-90deg)';
  } else {
    imageArea.style.transform = 'none';
  }




  modal.classList.toggle(
    'memory-portrait',
    !physicalLandscape
  );

  // Once unlocked, remain visible until modal closes.
  if (revealed) {
    img.style.visibility = '';
    placeholder.style.visibility = '';
    return;
  }

  if (!physicalLandscape) {
    landscapeReady = true;

    specialInstruction.textContent =
      'Rotate your phone sideways to reveal the memory.';

    return;
  }

  if (landscapeReady) {
    unlockMemory();
  }
}

async function startLandscapeSensor() {
  if (!window.isSecureContext) {
    showStatus('Motion sensors require HTTPS.');
    return;
  }

  if (!('DeviceMotionEvent' in window)) {
    showStatus('Motion sensor unavailable.');
    return;
  }

  try {
    // iOS permission request must follow a user gesture.
    if (
      typeof DeviceMotionEvent.requestPermission ===
      'function'
    ) {
      const permission =
        await DeviceMotionEvent.requestPermission();

      if (permission !== 'granted') {
        showStatus('Motion permission denied.');
        return;
      }
    }

    if (
      activeInteraction !== 'landscape' ||
      modal.classList.contains('hidden')
    ) {
      return;
    }

    stopLandscapeSensor();

    landscapeSensorActive = true;

    window.addEventListener(
      'devicemotion',
      onLandscapeMotion
    );

    specialInstruction.textContent =
      'Rotate your phone sideways to reveal the memory.';

  } catch (error) {
    console.error(error);
    showStatus('Unable to access motion sensor.');
  }
}

function stopLandscapeSensor() {
  if (landscapeSensorActive) {
    window.removeEventListener(
      'devicemotion',
      onLandscapeMotion
    );
  }

  landscapeSensorActive = false;
}

function checkLandscapeUnlock() {
  updateMemoryOrientation();
}



// =====================================
// 6. MEMORY POINTS
// =====================================

const pointEls = points.map(point => {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'memory-point';

  const interaction = point.interaction || 'normal';

  if (interaction !== 'normal') {
    button.classList.add('special');
    button.dataset.interaction = interaction;
  }

  const title =
    memories[point.memoryId]?.title || point.memoryId;

  button.setAttribute(
    'aria-label',
    `Open ${title}`
  );

  button.title = title;

  button.addEventListener('click', () => {
    openMemory(point.memoryId, interaction);
  });

  layer.appendChild(button);

  return {
    config: point,
    button,
    world: new THREE.Vector3(
      point.position.x,
      point.position.y,
      point.position.z
    )
  };
});

// =====================================
// 7. CLEANUP
// =====================================

function stopMic() {
  cancelAnimationFrame(micFrame);
  micFrame = 0;

  if (microphoneStream) {
    microphoneStream.getTracks().forEach(
      track => track.stop()
    );

    microphoneStream = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  analyser = null;
}

function stopShake() {
  if (shakeListenerActive) {
    window.removeEventListener(
      'devicemotion',
      onShake
    );
  }

  shakeListenerActive = false;
  lastShakeSample = null;
  shakeHits = 0;
}

function cleanupInteraction() {
  stopMic();
  stopShake();


  stopLandscapeSensor();
  physicalLandscape = false;
  landscapeReady = false;


  //1.4.1 version
  landscapeDirection = 0;


  //1.4.2 version
  imageArea.style.transform = 'none';


  modal.classList.remove(
    'landscape-left',
    'landscape-right'
  );


  img.style.visibility = '';
  placeholder.style.visibility = '';

  imageArea.classList.remove('fogged');
  imageArea.style.removeProperty('--fog-opacity');

  img.classList.remove('image-switching');
}

function setProgress(value) {
  const progress = Math.min(
    1,
    Math.max(0, value)
  );

  progressFill.style.width =
    `${Math.round(progress * 100)}%`;
}

// =====================================
// 8. UNLOCK MEMORY
// =====================================

function unlockMemory() {
  if (revealed) return;

  revealed = true;

  stopMic();
  stopShake();

  img.style.visibility = '';
  placeholder.style.visibility = '';

  imageArea.classList.remove('fogged');
  imageArea.style.setProperty('--fog-opacity', '0');

  memoryText.hidden = false;

  specialInstruction.textContent =
    activeInteraction === 'shake'
      ? 'Memory changed.'
      : 'Memory revealed.';

  startInteractionButton.hidden = true;
  fallbackInteractionButton.hidden = true;
  progressContainer.hidden = true;
}

// =====================================
// 9. OPEN MEMORY
// =====================================

function openMemory(id, interaction = 'normal') {
  const data = memories[id];

  if (!data) {
    showStatus(`Missing memory: ${id}`);
    return;
  }

  cleanupInteraction();

  activeMemory = data;
  activeInteraction = interaction;
  revealed = interaction === 'normal';
  imageIndex = 0;

  modalSensorPaused = true;

  document.querySelector('#memory-label').textContent =
    interaction === 'normal'
      ? id.toUpperCase()
      : 'INTERACTIVE MEMORY · ' + interaction.toUpperCase();

  document.querySelector('#memory-title').textContent =
    data.title || '';

  document.querySelector('#memory-date').textContent =
    data.date || '';

  memoryText.textContent = data.text || '';
  memoryText.hidden = !revealed;

  specialPanel.classList.toggle(
    'hidden',
    interaction === 'normal'
  );

  startInteractionButton.hidden = false;
  startInteractionButton.disabled = false;

  fallbackInteractionButton.hidden = false;

  progressContainer.hidden = interaction !== 'blow';
  setProgress(0);

  if (interaction === 'blow') {
    imageArea.classList.add('fogged');

    imageArea.style.setProperty(
      '--fog-opacity',
      '0.96'
    );

    specialInstruction.textContent =
      'Blow gently toward your phone microphone to clear the mist.';

    startInteractionButton.textContent =
      'Enable microphone';

    fallbackInteractionButton.textContent =
      'Reveal without microphone';
  }

  else if (interaction === 'shake') {
    specialInstruction.textContent =
      'Shake your phone to change the photograph.';

    startInteractionButton.textContent =
      'Enable shake';

    fallbackInteractionButton.textContent =
      'Change photo manually';
  }

  else if (interaction === 'landscape') {
    landscapeReady = false;
    physicalLandscape = false;

    specialInstruction.textContent =
      'Rotate your phone sideways to reveal this memory.';

    startInteractionButton.textContent =
      'Enable orientation sensor';

    fallbackInteractionButton.textContent =
      'Reveal manually';

    // Keep image hidden until orientation unlock.
    img.style.visibility = 'hidden';
    placeholder.style.visibility = 'hidden';
  }

  updateImage();

  modal.classList.remove('hidden');

  if (interaction === 'landscape') {
    updateMemoryOrientation();

    // On devices without explicit permission requirements,
    // begin listening immediately.
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission !== 'function'
    ) {
      startLandscapeSensor();
    }
  }
}


// =====================================
// 10. MEMORY IMAGES
// =====================================

function updateImage() {
  const list = activeMemory?.images || [];

  const controlsArea = document.querySelector(
    '#image-controls'
  );

  controlsArea.style.display =
    activeInteraction === 'normal' && list.length > 1
      ? 'flex'
      : 'none';

  document.querySelector('#image-counter').textContent =
    list.length
      ? `${imageIndex + 1} / ${list.length}`
      : '';

  img.onload = () => {
    img.style.display = 'block';
    placeholder.style.display = 'none';
    img.classList.remove('image-switching');
  };

  img.onerror = () => {
    img.style.display = 'none';
    placeholder.style.display = 'block';

    placeholder.textContent =
      'Photo not found. Check the image path in memories.js.';

    img.classList.remove('image-switching');
  };

  if (list.length) {
    img.style.display = 'none';
    placeholder.style.display = 'block';
    placeholder.textContent = 'Loading photo…';

    img.src = new URL(
      '../' + list[imageIndex],
      import.meta.url
    ).href;
  } else {
    img.removeAttribute('src');

    img.style.display = 'none';
    placeholder.style.display = 'block';

    placeholder.textContent =
      'Add your photos in assets/memories, then update memories.js.';
  }
}

// =====================================
// 11. SHAKE PHOTO
// =====================================

function switchShakePhoto() {
  if (
    activeInteraction !== 'shake' ||
    revealed
  ) {
    return;
  }

  if ((activeMemory.images || []).length < 2) {
    showStatus(
      'Add before.jpg and after.jpg in memories.js'
    );
    return;
  }

  img.classList.add('image-switching');

  setTimeout(() => {
    if (
      activeInteraction !== 'shake' ||
      revealed ||
      modal.classList.contains('hidden')
    ) {
      return;
    }

    imageIndex = 1;
    updateImage();
    unlockMemory();
  }, 190);
}

function onShake(event) {
  if (
    activeInteraction !== 'shake' ||
    revealed ||
    modal.classList.contains('hidden')
  ) {
    return;
  }

  const acceleration =
    event.accelerationIncludingGravity ||
    event.acceleration;

  if (
    !acceleration ||
    acceleration.x == null ||
    acceleration.y == null ||
    acceleration.z == null
  ) {
    return;
  }

  const now = performance.now();

  const current = {
    x: acceleration.x,
    y: acceleration.y,
    z: acceleration.z,
    time: now
  };

  if (lastShakeSample) {
    const dt = now - lastShakeSample.time;

    if (dt > 15 && dt < 350) {
      const diff = Math.hypot(
        acceleration.x - lastShakeSample.x,
        acceleration.y - lastShakeSample.y,
        acceleration.z - lastShakeSample.z
      );

      if (
        diff > 14 &&
        now - lastShakeTime > 170
      ) {
        shakeHits++;
        lastShakeTime = now;
      }

      if (shakeHits >= 2) {
        switchShakePhoto();
        return;
      }
    }

    if (now - lastShakeTime > 1300) {
      shakeHits = 0;
    }
  }

  lastShakeSample = current;
}

async function startShake() {
  if (!window.isSecureContext) {
    showStatus('Shake requires HTTPS or localhost');
    return;
  }

  if (!('DeviceMotionEvent' in window)) {
    showStatus(
      'Motion sensors unavailable. Use manual button.'
    );
    return;
  }

  try {
    if (
      typeof DeviceMotionEvent.requestPermission ===
      'function'
    ) {
      const permission =
        await DeviceMotionEvent.requestPermission();

      if (permission !== 'granted') {
        showStatus('Motion permission denied');
        return;
      }
    }

    if (
      activeInteraction !== 'shake' ||
      modal.classList.contains('hidden')
    ) {
      return;
    }

    stopShake();

    shakeListenerActive = true;

    window.addEventListener(
      'devicemotion',
      onShake
    );

    specialInstruction.textContent =
      'Shake your phone twice to change the photo.';

    startInteractionButton.textContent =
      'Shake enabled';

    startInteractionButton.disabled = true;

  } catch (error) {
    console.error(error);

    showStatus(
      'Unable to access motion sensor. Use manual button.'
    );
  }
}

// =====================================
// 12. BLOW INTERACTION
// =====================================

async function startBlow() {
  if (
    !window.isSecureContext ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    showStatus(
      'Microphone requires HTTPS or localhost'
    );
    return;
  }

  stopMic();

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

    if (
      activeInteraction !== 'blow' ||
      modal.classList.contains('hidden')
    ) {
      stream.getTracks().forEach(
        track => track.stop()
      );
      return;
    }

    microphoneStream = stream;

    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    const source =
      audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;

    source.connect(analyser);

    await audioContext.resume();

    const samples =
      new Float32Array(analyser.fftSize);

    let progress = 0;
    let last = performance.now();

    startInteractionButton.textContent =
      'Listening…';

    startInteractionButton.disabled = true;

    specialInstruction.textContent =
      'Blow gently and steadily into the microphone.';

    function tick(now) {
      if (
        !analyser ||
        activeInteraction !== 'blow' ||
        modal.classList.contains('hidden')
      ) {
        return;
      }

      analyser.getFloatTimeDomainData(samples);

      let sum = 0;

      for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
      }

      
      //1.5.3 version
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;

      // Find the loudest sample in this audio frame
      let peak = 0;

      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
      }

      // Either average sound or a short loud sound can trigger progress
      const detected = rms > 0.003 || peak > 0.015;

      if (detected) {
        progress += dt * 6;
      }

      // No progress loss when user stops blowing
      progress = Math.max(0, Math.min(1, progress));



      setProgress(progress);

      imageArea.style.setProperty(
        '--fog-opacity',
        String(0.96 * (1 - progress))
      );

      if (progress >= 1) {
        unlockMemory();
        return;
      }

      micFrame = requestAnimationFrame(tick);
    }

    micFrame = requestAnimationFrame(tick);

  } catch (error) {
    console.error(error);

    showStatus(
      'Microphone unavailable or denied. Use manual reveal.'
    );
  }
}

// =====================================
// 13. INTERACTION BUTTONS
// =====================================

startInteractionButton.onclick = () => {
  if (activeInteraction === 'blow') {
    startBlow();
  }

  if (activeInteraction === 'shake') {
    startShake();
  }

  if (activeInteraction === 'landscape') {
    startLandscapeSensor();
  }
};


fallbackInteractionButton.onclick = () => {
  if (activeInteraction === 'shake') {
    switchShakePhoto();
  }

  if (
    activeInteraction === 'blow' ||
    activeInteraction === 'landscape'
  ) {
    unlockMemory();
  }
};

// =====================================
// 14. IMAGE NAVIGATION
// =====================================

document.querySelector('#prev-image').onclick = () => {
  if (
    !activeMemory?.images?.length ||
    activeInteraction !== 'normal'
  ) {
    return;
  }

  imageIndex = (
    imageIndex - 1 + activeMemory.images.length
  ) % activeMemory.images.length;

  updateImage();
};

document.querySelector('#next-image').onclick = () => {
  if (
    !activeMemory?.images?.length ||
    activeInteraction !== 'normal'
  ) {
    return;
  }

  imageIndex = (
    imageIndex + 1
  ) % activeMemory.images.length;

  updateImage();
};

// =====================================
// 15. CLOSE MEMORY
// =====================================


function closeModal() {
  cleanupInteraction();

  modalSensorPaused = false;

  activeInteraction = 'normal';
  activeMemory = null;
  revealed = false;
  landscapeReady = false;

  modal.classList.remove(
    'memory-landscape',
    'memory-portrait'
  );

  startInteractionButton.disabled = false;

  modal.classList.add('hidden');
}


document.querySelector('#close-modal').onclick =
  closeModal;

document.querySelector('[data-close]').onclick =
  closeModal;

// =====================================
// 16. HELP MODAL
// =====================================

document.querySelector('#help-button').onclick = () => {
  document.querySelector('#help-modal')
    .classList.remove('hidden');
};

function closeHelp() {
  document.querySelector('#help-modal')
    .classList.add('hidden');
}

document.querySelector('#close-help').onclick =
  closeHelp;

document.querySelector('[data-close-help]').onclick =
  closeHelp;

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal();
    closeHelp();
  }
});

// =====================================
// 17. STATUS MESSAGE
// =====================================

let statusTimeout;

function showStatus(message) {
  const element = document.querySelector('#status');

  element.textContent = message;
  element.classList.add('show');

  clearTimeout(statusTimeout);

  statusTimeout = setTimeout(() => {
    element.classList.remove('show');
  }, 3500);
}

// =====================================
// 18. GYROSCOPE CAMERA CONTROL
// =====================================


 // =====================================
 // 18. GYROSCOPE CAMERA CONTROL
 // ROTATION ONLY - NO ZOOM
 // =====================================

let motionEnabled = false;
let base = null;

const rad = Math.PI / 180;



// Fixed camera distance during motion

let motionDistance = null;

let motionTheta = 0;
let motionPhi = 0;

// Initial camera angles when motion is enabled
let initialTheta = 0;
let initialPhi = 0;

// Target angles from gyroscope
let targetTheta = 0;
let targetPhi = 0;


function wrapDelta(a, b) {
  return ((a - b + 540) % 360) - 180;
}

function onOrientation(event) {
  if (
    modalSensorPaused ||
    !motionEnabled ||
    event.alpha == null ||
    event.beta == null ||
    event.gamma == null
  ) {
    return;
  }

  const current = {
    alpha: event.alpha,
    beta: event.beta,
    gamma: event.gamma
  };

  // First sensor reading: calibration
  if (!base) {
    base = current;
    showStatus('Motion calibrated. Rotate your phone.');
    return;
  }

  const screenAngle =
    screen.orientation?.angle ??
    window.orientation ??
    0;

  const landscape =
    Math.abs(screenAngle) % 180 === 90;

  const horizontal = landscape
    ? wrapDelta(current.beta, base.beta)
    : wrapDelta(current.gamma, base.gamma);

  const vertical = landscape
    ? wrapDelta(current.gamma, base.gamma)
    : wrapDelta(current.beta, base.beta);

  const azimuth = THREE.MathUtils.clamp(
    horizontal * rad * settings.gyroSensitivity,
    -1.35,
    1.35
  );

  const elevation = THREE.MathUtils.clamp(
    vertical * rad * settings.gyroSensitivity,
    -0.75,
    0.75
  );

  // Update angles only.
  // Distance is never calculated from sensor movement.
  
  targetTheta = initialTheta + azimuth;

  targetPhi = THREE.MathUtils.clamp(
    initialPhi + elevation,
    0.2,
    1.45
  );

}

// =====================================
// MOTION BUTTON
// =====================================

const motionButton = document.querySelector(
  '#motion-button'
);

motionButton.onclick = async () => {

  // Disable motion
  if (motionEnabled) {
    motionEnabled = false;

    window.removeEventListener(
      'deviceorientation',
      onOrientation
    );

    motionButton.textContent = 'Enable motion';


    controls.enableDamping = true;


    controls.enabled = true;

    // Synchronize OrbitControls with current camera.
    controls.update();

    showStatus('Motion disabled');
    return;
  }

  if (!window.isSecureContext) {
    showStatus('Motion requires HTTPS or localhost');
    return;
  }

  if (!('DeviceOrientationEvent' in window)) {
    showStatus('Device motion not supported');
    return;
  }

  try {
    if (
      typeof DeviceOrientationEvent.requestPermission ===
      'function'
    ) {
      const result =
        await DeviceOrientationEvent.requestPermission();

      if (result !== 'granted') {
        showStatus('Motion permission denied');
        return;
      }
    }

    
    // Lock current camera distance once.
    
    motionDistance = camera.position.distanceTo(
      controls.target
    );

    const spherical = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(controls.target)
    );

    motionTheta = spherical.theta;
    motionPhi = spherical.phi;

    initialTheta = spherical.theta;
    initialPhi = spherical.phi;

    targetTheta = spherical.theta;
    targetPhi = spherical.phi;

    base = null;
    motionEnabled = true;

    controls.enableDamping = false;
    controls.enabled = false;


    window.addEventListener(
      'deviceorientation',
      onOrientation
    );

    motionButton.textContent = 'Disable motion';

    showStatus('Motion enabled. Distance locked.');

  } catch (error) {
    console.error(error);
    showStatus('Could not enable device motion');
  }
};


//1.4 version
//1.3 version
// =====================================
// RESET BUTTON
// =====================================

document.querySelector('#reset-button').onclick = () => {
  resetView();
  base = null;

  if (motionEnabled) {
    motionDistance = camera.position.distanceTo(
      controls.target
    );

    const spherical = new THREE.Spherical()
      .setFromVector3(
        camera.position.clone().sub(controls.target)
      );

    motionTheta = spherical.theta;
    motionPhi = spherical.phi;

    initialTheta = spherical.theta;
    initialPhi = spherical.phi;

    targetTheta = spherical.theta;
    targetPhi = spherical.phi;
  }

  showStatus('View reset');
};




// =====================================
// 19. DEBUG POSITION PICKER
// =====================================

const debug = new URLSearchParams(
  location.search
).get('debug') === 'true';

if (debug) {
  document.querySelector('#debug-panel')
    .classList.remove('hidden');
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener(
  'click',
  async event => {
    if (!debug) return;

    const rect =
      renderer.domElement.getBoundingClientRect();

    pointer.set(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(
      [floor, ...campusRoot.children],
      true
    );

    if (!hits.length) return;

    const point = hits[0].point;

    const result =
      `{ x: ${point.x.toFixed(2)}, ` +
      `y: ${(point.y + 0.3).toFixed(2)}, ` +
      `z: ${point.z.toFixed(2)} }`;

    document.querySelector('#debug-coords')
      .textContent = result;

    try {
      await navigator.clipboard.writeText(result);
      showStatus('Coordinates copied');
    } catch {
      showStatus(
        'Coordinates shown in debug panel'
      );
    }
  }
);

// =====================================
// 20. RENDER LOOP
// =====================================



 // =====================================
 // 20. RENDER LOOP
 // =====================================

function draw() {
  requestAnimationFrame(draw);

  if (motionEnabled) {

    // Smooth camera angles only.
    motionTheta +=
      (targetTheta - motionTheta) * 0.13;

    motionPhi +=
      (targetPhi - motionPhi) * 0.13;

    // Fixed camera distance.
    const direction = new THREE.Vector3()
      .setFromSphericalCoords(
        1,
        motionPhi,
        motionTheta
      );

    camera.position
      .copy(controls.target)
      .addScaledVector(
        direction,
        motionDistance
      );

    camera.lookAt(controls.target);

  } else {
    controls.update();
  }

  camera.updateMatrixWorld();

  const width = innerWidth;
  const height = innerHeight;

  for (const { button, world } of pointEls) {
    const projected = world.clone().project(camera);

    const front =
      world.clone()
        .sub(camera.position)
        .dot(
          camera.getWorldDirection(
            new THREE.Vector3()
          )
        ) > 0;

    const visible =
      front &&
      projected.z > -1 &&
      projected.z < 1 &&
      Math.abs(projected.x) < 1.08 &&
      Math.abs(projected.y) < 1.08;

    button.style.display =
      visible ? 'grid' : 'none';

    if (visible) {
      button.style.left =
        `${(projected.x * 0.5 + 0.5) * width}px`;

      button.style.top =
        `${(-projected.y * 0.5 + 0.5) * height}px`;
    }
  }

  renderer.render(scene, camera);
}

draw();


// =====================================
// 21. RESIZE
// =====================================

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    innerWidth,
    innerHeight
  );
});

// =====================================
// 22. MEMORY POINT VISIBILITY TOGGLE
// =====================================

const togglePointsButton =
  document.getElementById('toggle-points');

const pointLayer =
  document.getElementById('point-layer');

const eyeIcon =
  document.getElementById('eye-icon');

let pointsVisible = true;

togglePointsButton.addEventListener('click', () => {
  pointsVisible = !pointsVisible;

  pointLayer.classList.toggle(
    'points-hidden',
    !pointsVisible
  );

  if (pointsVisible) {
    eyeIcon.innerHTML = `
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    `;

    togglePointsButton.title =
      'Hide memory points';

    togglePointsButton.setAttribute(
      'aria-label',
      'Hide memory points'
    );

  } else {
    eyeIcon.innerHTML = `
      <path d="M3 3l18 18"/>
      <path d="M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-4 4.7"/>
      <path d="M6.2 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1"/>
      <path d="M10 10a3 3 0 0 0 4 4"/>
    `;

    togglePointsButton.title =
      'Show memory points';

    togglePointsButton.setAttribute(
      'aria-label',
      'Show memory points'
    );
  }

  togglePointsButton.setAttribute(
    'aria-pressed',
    String(!pointsVisible)
  );
});
