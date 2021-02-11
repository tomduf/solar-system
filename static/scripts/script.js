// Variables three.js
let camera, controls, scene, renderer, control;
let sun, earth;
let planetes;
let date = new Date(Date.now());
let clock = new THREE.Clock();
let count = 5000, indexOrbiteActif = 0;

// constantes de script
const STATIC_PATH = "./static/";

// Constantes physiques
const G = 6.67384e-11;
const M = 1989000e24;
const aud2ms = 1.73146e6; // conversion des AU/d en m/s
const au2m = 1.49598e11; // conversion des AU en m
// Constantes du modèle
const echelleDistances = 1.8e-9;
const echellePlanetes = 1e-6;
const echelleSoleil = 1e-8;

// Incrément de temps et du Soleil (en secondes)
const dt = 1e3;
// Variation d'angle de rotation du Soleil par dt
const dThetaSun = 2 * dt * Math.PI / (30 * 24 * 3600);

// Classe planète
class Planete {
  constructor(nom, data_orbit, m, r, periode, inclinaison, obliq, texture) {
    this.nom = nom;
    // masse
    this.m = m;
    // vitesse angulaire de rotation
    this.omega = 2 * Math.PI / (periode * 3600);
    // inclinaison de l'axe polaire
    this.axe = new THREE.Vector3(Math.sin(inclinaison * Math.PI / 180), 0, Math.cos(inclinaison * Math.PI / 180)).normalize();
    // position de départ d'après les données de l'IMCCE
    this.p = new THREE.Vector3(data_orbit[1] * au2m, data_orbit[2] * au2m, data_orbit[3] * au2m);
    // vitesse de départ
    this.v = new THREE.Vector3(data_orbit[7] * aud2ms, data_orbit[8] * aud2ms, data_orbit[9] * aud2ms);
    // objet volumique
    const geometryPlanete = new THREE.SphereGeometry(r * echellePlanetes, 32, 32);
    const texturePlanete = new THREE.TextureLoader().load(texture);
    const materialPlanete = new THREE.MeshPhongMaterial({ map: texturePlanete });
    this.mesh = new THREE.Mesh(geometryPlanete, materialPlanete);

    /* orbite
    const curveOrbit = new THREE.EllipseCurve(0, 0, data_orbit[4] * au2m * echelleDistances, data_orbit[4] * au2m * echelleDistances, 0, 2 * Math.PI, false, 0);
    const pointsOrbit = curveOrbit.getPoints(200);
    const geometryOrbit = new THREE.BufferGeometry().setFromPoints(pointsOrbit);
    const materialOrbit = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.orbit = new THREE.Line(geometryOrbit, materialOrbit);
    this.orbit.rotation.x = obliq * Math.PI / 180;*/

    // Réglages de positionnement et d'inclinaison
    this.mesh.rotation.x += Math.PI / 2;
    this.mesh.rotation.z -= inclinaison * Math.PI / 180;
    // mise à l'échelle pour la maquette virtuelle
    this.mesh.position.add(this.p.clone().multiplyScalar(echelleDistances));

    // Orbits particles
    this.orbitGeometry = new THREE.BufferGeometry();
    this.orbitCount = 10000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++){
      positions[i] = 0;
      colors[i] = Math.random();
    }
    this.orbitGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
    )
    this.orbitGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
    )
    const particlesTexture = new THREE.TextureLoader().load(STATIC_PATH + 'textures/circle_05.png');
    const particlesMaterial = new THREE.PointsMaterial({
      //color: 'white',
      size: 1,
      transparent: true,
      alphaMap: particlesTexture,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      vertexColors: true,
    })
    this.orbitParticles = new THREE.Points(this.orbitGeometry, particlesMaterial);
  }
}

// Initialition
init();
// Animation et rendu
animate();

function init() {
  // Initialisation  de la scène
  scene = new THREE.Scene();

  // Couleur de fond
  scene.background = new THREE.Color(0xcccccc);

  // Initialisation du moteur de rendu
  renderer = new THREE.WebGLRenderer({ antialias: true , preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Initialisation de la caméra
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 6000);
  //camera = new THREE.OrthographicCamera(-500, 500, 500, -500, 0.1, 1000);
  camera.position.set(0, -400, 400);

  // Initialisation des contrôles
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 0.1;
  controls.maxDistance = 1000;
  controls.enablePan = false;
  //controls.maxPolarAngle = Math.PI ;

  // Initialisation du fond stellaire
  const geometrySky = new THREE.SphereGeometry(2000, 32, 32);
  const materialSky = new THREE.MeshBasicMaterial();
  materialSky.map = new THREE.TextureLoader().load(STATIC_PATH + 'textures/galaxy_starfield.png');
  materialSky.side = THREE.BackSide;
  const meshSky = new THREE.Mesh(geometrySky, materialSky);
  scene.add(meshSky);

  // Initialisation des géométries et matériaux pour le Soleil
  const geometrySun = new THREE.SphereGeometry(1.3927e9 * echelleSoleil, 32, 32);
  const textureSun = new THREE.TextureLoader().load(STATIC_PATH + 'textures/sunmap.jpg');
  const materialSun = new THREE.MeshBasicMaterial({ color: 0xffffee, map: textureSun, emissive: 16777215 });
  sun = new THREE.Mesh(geometrySun, materialSun);
  scene.add(sun);

  // Initialisation des planètes
  planetes = [

    new Planete("Mercure", imcce("Mercury"), 3.30e23, 2.44e6, 1407.5, 0, 7.0, STATIC_PATH + 'textures/mercurymap.jpg'),
    new Planete("Vénus", imcce("Venus"), 5.972e24, 6.05e6, 5832, 0, 3.39471, STATIC_PATH + 'textures/venusmap.jpg'),
    new Planete("Terre",imcce("Earth"), 5.972e24, 6.38e6, 23.9344, 23.45, 1.578690,STATIC_PATH + 'textures/earthmap1k.jpg'),
    new Planete("Mars", imcce("Mars"), 6.42e23, 3.40e6, 25.19, 24.622962,1.85, STATIC_PATH + 'textures/mars_1k_color.jpg'),
    new Planete("Lune",imcce("Moon"), 1.023e3, 1.737e6, 27.321582 * 24, 0, 0,STATIC_PATH + 'textures/mercurymap.jpg'),

  ];

  // Ajout de toutes les planètes à la scène
  for (const planete of planetes) {
    scene.add(planete.mesh);
    //scene.add(planete.orbit);
    scene.add(planete.orbitParticles);
  }

  // Initialisation de l'éclairage
  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  // Lumière du Soleil
  const light = new THREE.PointLight(0xffffff, 2, 600);
  light.position.set(0, 0, 0);
  scene.add(light);

  // écoute du redimensionnement
  window.addEventListener('resize', onWindowResize, false);

  control = new function () {
    this.deltaT = 5000;
    this.numPlanete = 0;
    this.orbits = true;
  };
  addControls(control);
}

function animate() {
  const elapsedTime = clock.getElapsedTime();

  // Affichage de la date
  document.getElementById("date").innerText = date.toLocaleDateString();
  // Demande de rafraîchissement du navigateur (60x/s) fonction web
  // https://developer.mozilla.org/fr/docs/Web/API/Window/requestAnimationFrame
  requestAnimationFrame(animate);

  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  // Rendu de la scène
  render();


  for (const planete of planetes) {
    // Calculs de mécanique spatiale sur toutes les planètes
    const n = planete.p.clone().normalize(); // Vecteur unitaire Soleil -> Planète
    const a = n.multiplyScalar(-G * M / planete.p.distanceToSquared(sun.position)); // acceleration due au Soleil
    for (const corps of planetes) {
      if (corps !== planete) {
        const ni = planete.p.clone().sub(corps.p).normalize(); // Vecteur unitaire ni corps -> planète
        const ai = ni.multiplyScalar(-G * corps.m / planete.p.distanceToSquared(corps.p)); // acceleration due au corps i
        a.add(ai); // Les accélérations s'ajoutent
      }
      planete.orbitParticles.visible = control.orbits // Visibilité des orbites
    }
    const dv = a.multiplyScalar(control.deltaT); // variation de vitesse dv = a.dt car a =dv/dt
    planete.v.add(dv); // nouvelle vitesse v = v + dv
    const dp = planete.v.clone().multiplyScalar(control.deltaT); // variation de position dp = v.dt car v = dp/dt
    planete.p.add(dp); // nouvelle position p = p + dp
    planete.mesh.position.add(dp.multiplyScalar(echelleDistances)); // position du mesh à l'échelle de la scène
    planete.mesh.rotateOnWorldAxis(planete.axe, planete.omega * control.deltaT);  // rotation de la planète

    // Dépôt des traînées d'orbite
    planete.orbitGeometry.attributes.position.array[indexOrbiteActif + 0] = planete.mesh.position.x;
    planete.orbitGeometry.attributes.position.array[indexOrbiteActif + 1] = planete.mesh.position.y;
    planete.orbitGeometry.attributes.position.array[indexOrbiteActif + 2] = planete.mesh.position.z;
    planete.orbitGeometry.attributes.position.needsUpdate = true;

  }
  indexOrbiteActif+= 3;
  if (indexOrbiteActif === count * 3){
    indexOrbiteActif = 0;
  }
  sun.rotation.z += 2 * control.deltaT * Math.PI / (30 * 24 * 3600); // rotation du Soleil

  // gestion de la caméra et de la cible pointée
  if (control.numPlanete === 0) controls.target = sun.position;
  else {
    const indexPlanete = control.numPlanete - 1;
    controls.target = planetes[indexPlanete].mesh.position;
    //camera.position.x = planetes[indexPlanete].mesh.position.x + 10
    //camera.position.y = planetes[indexPlanete].mesh.position.y - 10
    camera.rotation.set(0, 0, 0);
  }
  //camera.lookAt(planetes[2].mesh.position);
  //console.log(camera.target);

  // Mise à jour de la date
  date.setSeconds(date.getSeconds() + control.deltaT);

}

function render() {
  // Rendu de la scène à travers la caméra
  renderer.render(scene, camera);
}

function onWindowResize() {
  // Actualisation de la caméra
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function addControls(controlObject) {
  var gui = new dat.GUI();
  gui.add(controlObject, 'deltaT', -10000, 10000, 200);
  gui.add(controlObject, 'numPlanete', 0, 4, 1);
  gui.add(controlObject, 'orbits', true, false)
}

// Récupération des données orbitales d'une planète du système solaire
function imcce(nomPlanete) {
  let xhttp = new XMLHttpRequest();
  // Requête synchrone vers le serveur de IMCCE https://ssp.imcce.fr/forms/ephemeris
  xhttp.open("GET", "https://ssp.imcce.fr/webservices/miriade/api/ephemcc.php?-name=" + nomPlanete +
      "&-type=Planet&-ep=2459254.3808679977&-tscale=UTC&-nbd=1&-step=1d&-rplane=2&-theory=INPOP&-teph=1&-observer=@sun&-output=--iofile(ssp-ephemcc-rectangular.xml)&-lang=fr&-from=ssp", false);
  xhttp.send();
  return Array.from(xhttp.responseXML.getElementsByTagName("vot:TD")).map(item=>parseFloat(item.childNodes[0].data));
}
