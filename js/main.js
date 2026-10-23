import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { points } from './config/points.js';
import { memories } from './config/memories.js';
import { settings } from './config/settings.js';

const scene = new THREE.Scene(); scene.background = new THREE.Color('#f4f2ed');
const camera = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, .1, 250);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.querySelector('#scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0xc8c1b5,2.3));
const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-8,17,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;sun.shadow.bias=-.0005;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(35,35),new THREE.MeshStandardMaterial({color:'#ece9e2',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(35,35,0xdad6cd,0xe1ddd5);grid.position.y=.007;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
const campusRoot=new THREE.Group();scene.add(campusRoot);
function box(x,z,w,d,h,color='#faf9f6'){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.86}));m.position.set(x,h/2,z);m.castShadow=true;m.receiveShadow=true;campusRoot.add(m);return m;
}
function buildPlaceholder(){
 box(-3.7,-1.7,3.4,3.1,2.6);box(2.7,-1.4,3.5,2.8,2.1,'#e9e7e2');box(.6,3,4.3,2.2,1.1,'#f8f7f4');box(-4,3.5,2,2.2,1.65,'#e2dfd9');
 const canopy=box(-.4,-1.5,2.5,1.4,.35,'#d9d3ca');canopy.position.y=3.1;
 // Simple ground pathways
 for(const [x,z,w,d] of [[0,0,2,12],[-1,1,12,1.4]]){const path=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({color:'#dedad1'}));path.rotation.x=-Math.PI/2;path.position.set(x,.015,z);path.receiveShadow=true;campusRoot.add(path)}
}
async function loadCampus(){
 if(settings.modelMode!=='glb'){buildPlaceholder();return}
 try{const gltf=await new GLTFLoader().loadAsync(settings.modelPath);const model=gltf.scene;model.scale.setScalar(settings.modelScale);model.position.set(settings.modelPosition.x,settings.modelPosition.y,settings.modelPosition.z);model.rotation.y=settings.modelRotationY;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});campusRoot.add(model);showStatus('GLB campus loaded');}
 catch(e){console.error(e);buildPlaceholder();showStatus('GLB unavailable; showing placeholder campus')}
}
loadCampus();
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=6;controls.maxDistance=34;controls.maxPolarAngle=Math.PI/2.1;controls.minPolarAngle=.12;controls.target.set(0,.7,0);
function resetView(){controls.target.set(0,.7,0);camera.position.set(12,11,settings.cameraDistance);controls.update()}
resetView();
const layer=document.querySelector('#point-layer');const modal=document.querySelector('#modal');
let activeMemory=null,imageIndex=0;
const pointEls=points.map(p=>{const b=document.createElement('button');b.type='button';b.className='memory-point';b.setAttribute('aria-label',`Open ${memories[p.memoryId]?.title||p.memoryId}`);b.title=memories[p.memoryId]?.title||p.memoryId;b.addEventListener('click',()=>openMemory(p.memoryId));layer.appendChild(b);return {config:p,button:b,world:new THREE.Vector3(p.position.x,p.position.y,p.position.z)};});
function openMemory(id){const data=memories[id];if(!data){showStatus(`Missing memory: ${id}`);return}activeMemory=data;imageIndex=0;document.querySelector('#memory-label').textContent=id.toUpperCase();document.querySelector('#memory-title').textContent=data.title||'';document.querySelector('#memory-date').textContent=data.date||'';document.querySelector('#memory-text').textContent=data.text||'';updateImage();modal.classList.remove('hidden');}
function updateImage(){const img=document.querySelector('#memory-image');const placeholder=document.querySelector('#image-placeholder');const list=activeMemory?.images||[];const area=document.querySelector('#image-controls');area.style.display=list.length>1?'flex':'none';document.querySelector('#image-counter').textContent=list.length?`${imageIndex+1} / ${list.length}`:'';img.onload=()=>{img.style.display='block';placeholder.style.display='none'};img.onerror=()=>{img.style.display='none';placeholder.style.display='block';placeholder.textContent='Photo not found. Check the image path in memories.js.'};if(list.length){img.style.display='none';placeholder.style.display='block';placeholder.textContent='Loading photo…';img.src=new URL('../'+list[imageIndex],import.meta.url).href}else{img.removeAttribute('src');img.style.display='none';placeholder.style.display='block';placeholder.textContent='Add your photos in assets/memories, then update memories.js.'}}
document.querySelector('#prev-image').onclick=()=>{imageIndex=(imageIndex-1+(activeMemory.images.length))%activeMemory.images.length;updateImage()};document.querySelector('#next-image').onclick=()=>{imageIndex=(imageIndex+1)%activeMemory.images.length;updateImage()};
function closeModal(){modal.classList.add('hidden')};document.querySelector('#close-modal').onclick=closeModal;document.querySelector('[data-close]').onclick=closeModal;
document.querySelector('#help-button').onclick=()=>document.querySelector('#help-modal').classList.remove('hidden');function closeHelp(){document.querySelector('#help-modal').classList.add('hidden')}document.querySelector('#close-help').onclick=closeHelp;document.querySelector('[data-close-help]').onclick=closeHelp;document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeHelp()}});
let statusTimeout;function showStatus(s){const el=document.querySelector('#status');el.textContent=s;el.classList.add('show');clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>el.classList.remove('show'),3500)}
// Motion is relative to the orientation at activation. DeviceOrientationEvent is available
// only on secure contexts and supported devices. Desktop/touch OrbitControls remains fallback.
let motionEnabled=false,base=null,lastAngles=null;const rad=Math.PI/180;
function wrapDelta(a,b){return ((a-b+540)%360)-180}
function onOrientation(e){if(!motionEnabled||e.alpha==null||e.beta==null||e.gamma==null)return;
 const current={alpha:e.alpha,beta:e.beta,gamma:e.gamma};if(!base){base=current;lastAngles=current;showStatus('Motion calibrated. Rotate your phone.');return}
 // Landscape and portrait axes vary across browsers; screen orientation is used to
 // map the two directional gestures to azimuth and elevation.
 const screenAngle=screen.orientation?.angle??window.orientation??0;
 const landscape=Math.abs(screenAngle)%180===90;
 const horizontal=landscape?wrapDelta(current.beta,base.beta):wrapDelta(current.gamma,base.gamma);
 const vertical=landscape?wrapDelta(current.gamma,base.gamma):wrapDelta(current.beta,base.beta);
 const azimuth=THREE.MathUtils.clamp(horizontal*rad*settings.gyroSensitivity,-1.35,1.35);
 const elevation=THREE.MathUtils.clamp(vertical*rad*settings.gyroSensitivity,-.75,.75);
 const distance=camera.position.distanceTo(controls.target);
 const theta=.64+azimuth;const phi=THREE.MathUtils.clamp(.9+elevation,.2,1.45);
 const target=new THREE.Vector3().setFromSphericalCoords(distance,phi,theta).add(controls.target);
 camera.position.lerp(target,.13);camera.lookAt(controls.target);lastAngles=current;
}
const motionButton=document.querySelector('#motion-button');motionButton.onclick=async()=>{
 if(motionEnabled){motionEnabled=false;window.removeEventListener('deviceorientation',onOrientation);motionButton.textContent='Enable motion';controls.enabled=true;showStatus('Motion disabled');return}
 if(!window.isSecureContext){showStatus('Motion requires HTTPS or localhost');return}
 if(!('DeviceOrientationEvent' in window)){showStatus('Device motion not supported by this browser');return}
 try{if(typeof DeviceOrientationEvent.requestPermission==='function'){const result=await DeviceOrientationEvent.requestPermission();if(result!=='granted'){showStatus('Motion permission denied');return}}
 base=null;motionEnabled=true;controls.enabled=false;window.addEventListener('deviceorientation',onOrientation);motionButton.textContent='Disable motion';showStatus('Move your phone to calibrate');}
 catch(err){console.error(err);showStatus('Could not enable device motion')}
};
document.querySelector('#reset-button').onclick=()=>{resetView();base=null;showStatus(motionEnabled?'View reset; hold phone at starting angle':'View reset')};
// Developer-only position picker. Ground/building mesh click gives world coordinate.
const debug=new URLSearchParams(location.search).get('debug')==='true';if(debug)document.querySelector('#debug-panel').classList.remove('hidden');
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
renderer.domElement.addEventListener('click',async e=>{if(!debug)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([floor,...campusRoot.children],true);if(!hits.length)return;const p=hits[0].point;const str=`{ x: ${p.x.toFixed(2)}, y: ${(p.y+.3).toFixed(2)}, z: ${p.z.toFixed(2)} }`;document.querySelector('#debug-coords').textContent=str;try{await navigator.clipboard.writeText(str);showStatus('Coordinates copied')}catch{showStatus('Coordinates shown in debug panel')}});
function draw(){requestAnimationFrame(draw);if(!motionEnabled)controls.update();camera.updateMatrixWorld();const w=innerWidth,h=innerHeight;
 for(const {button,world} of pointEls){const v=world.clone().project(camera);const front=world.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()))>0;const visible=front&&v.z>-1&&v.z<1&&Math.abs(v.x)<1.08&&Math.abs(v.y)<1.08;button.style.display=visible?'grid':'none';if(visible){button.style.left=`${(v.x*.5+.5)*w}px`;button.style.top=`${(-v.y*.5+.5)*h}px`}}
 renderer.render(scene,camera)}draw();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});


// =====================================
// Memory Points Visibility Toggle
// =====================================

const togglePointsButton =
  document.getElementById("toggle-points");

const pointLayer =
  document.getElementById("point-layer");

const eyeIcon =
  document.getElementById("eye-icon");

let pointsVisible = true;

togglePointsButton.addEventListener("click", () => {

  pointsVisible = !pointsVisible;

  pointLayer.classList.toggle(
    "points-hidden",
    !pointsVisible
  );

  if (pointsVisible) {

    // Eye open
    eyeIcon.innerHTML = `
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    `;

    togglePointsButton.title = "Hide memory points";
    togglePointsButton.setAttribute(
      "aria-label",
      "Hide memory points"
    );

  } else {

    // Eye closed
    eyeIcon.innerHTML = `
      <path d="M3 3l18 18"/>
      <path d="M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-4 4.7"/>
      <path d="M6.2 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1"/>
      <path d="M10 10a3 3 0 0 0 4 4"/>
    `;

    togglePointsButton.title = "Show memory points";
    togglePointsButton.setAttribute(
      "aria-label",
      "Show memory points"
    );
  }

  togglePointsButton.setAttribute(
    "aria-pressed",
    String(!pointsVisible)
  );
});