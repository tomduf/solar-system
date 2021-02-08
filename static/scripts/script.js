// Variables three.js
let camera, controls, scene, renderer, control;
let sun, earth;
let planetes;
let j;

// Constantes physiques
const G = 6.67384e-11;
const M = 1989000e24;

// Position et vitesse initiales de la Terre (en m et m/s)
const x0Earth = 149.7e9, v0Earth = 29.8e3;

// Constantes du modèle
const echelleDistances = 1.8e-9;
const echellePlanetes = 1e-6;

// Incrément de temps et du Soleil (en secondes)
const dt = 1e3;
// Variation d'angle de rotation du Soleil par dt
const dThetaSun = 2 * dt * Math.PI / (30 * 24 * 3600);

// Classe planète
class Planete {
  constructor(nom, x0, v0, m, r, periode, axe, rotx, texture) {
    this.nom = nom;
    // masse
    this.m = m;
    // vitesse angulaire de rotation
    this.omega = 2 * Math.PI / (periode * 3600);
    // inclinaison de l'axe polaire
    this.axe = new THREE.Vector3(Math.sin(axe * Math.PI / 180), 0, Math.cos(axe * Math.PI / 180)).normalize();
    // position de départ
    this.p = new THREE.Vector3(x0, 0, 0);
    // vitesse de départ
    this.v = new THREE.Vector3(0, v0, 0);
    // objet volumique
    const geometryPlanete = new THREE.SphereGeometry(r * echellePlanetes, 32, 32);
    const texturePlanete = new THREE.TextureLoader().load(texture);
    const materialPlanete = new THREE.MeshPhongMaterial({ map: texturePlanete });
    this.mesh = new THREE.Mesh(geometryPlanete, materialPlanete);
    // orbite
    const curveOrbit = new THREE.EllipseCurve(0, 0, x0 * echelleDistances, x0 * echelleDistances, 0, 2 * Math.PI, false, 0);
    const pointsOrbit = curveOrbit.getPoints(200);
    const geometryOrbit = new THREE.BufferGeometry().setFromPoints(pointsOrbit);
    const materialOrbit = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.orbit = new THREE.Line(geometryOrbit, materialOrbit);
    // Réglages de positionnement et d'inclinaison
    this.mesh.rotation.x += rotx;
    this.mesh.rotation.z -= axe * Math.PI / 180;
    // mise à l'échelle pour la maquette virtuelle
    this.mesh.position.add(this.p.clone().multiplyScalar(echelleDistances));
    // Tableau des points de trail
    this.trail = [];
    const geometry = new THREE.BufferGeometry();
    for (let i = 0; i < 100; i++){
			geometry.setAttribute( 'position', this.mesh.position );
			const material = new THREE.PointsMaterial( { color: 0x888888 } );
      this.trail.push(new THREE.Points( geometry, material ));
    }
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
  renderer = new THREE.WebGLRenderer({ antialias: true });
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
  controls.minDistance = 50;
  controls.maxDistance = 1000;
  controls.enablePan = false;
  //controls.maxPolarAngle = Math.PI ;

  // Initialisation du fond stellaire
  const geometrySky = new THREE.SphereGeometry(2000, 32, 32);
  const materialSky = new THREE.MeshBasicMaterial();
  materialSky.map = new THREE.TextureLoader().load('/static/textures/galaxy_starfield.png');
  materialSky.side = THREE.BackSide;
  const meshSky = new THREE.Mesh(geometrySky, materialSky);
  scene.add(meshSky);

  // Initialisation des géométries et matériaux pour le Soleil
  const geometrySun = new THREE.SphereGeometry(20, 32, 32);
  const textureSun = new THREE.TextureLoader().load('/static/textures/sunmap.jpg');
  const materialSun = new THREE.MeshBasicMaterial({ color: 0xffffee, map: textureSun, emissive: 16777215 });
  sun = new THREE.Mesh(geometrySun, materialSun);
  scene.add(sun);

  // Initialisation des planètes
  planetes = [

    new Planete("Mercure", 57.9e9, 47e3, 3.30e23, 2.44e6, 1407.5, 0, Math.PI / 2, '/static/textures/mercurymap.jpg'),
    new Planete("Vénus", 108e9, 35.5e3, 5.972e24, 6.05e6, 5832, 0, Math.PI / 2, '/static/textures/venusmap.jpg'),
    new Planete("Terre", 149.7e9, 29.8e3, 5.972e24, 6.38e6, 23.9344, 23.45, Math.PI / 2, '/static/textures/earthmap1k.jpg'),
    new Planete("Mars", 228e9, 24.0802e3, 6.42e23, 3.40e6, 25.19, 24.622962, Math.PI / 2, '/static/textures/mars_1k_color.jpg'),

  ];

  // Ajout de toutes les planètes à la scène
  for (const planete of planetes) {
    scene.add(planete.mesh);
    scene.add(planete.orbit);
  }

  // Initialisation de l'éclairage
  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  // Lumière du Soleil
  const light = new THREE.PointLight(0xffffff, 2, 600);
  light.position.set(0, 0, 0);
  scene.add(light);

  // Début du temps et des jours
  j = 0;

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
  // Demande de rafraîchissement du navigateur (60x/s) fonction web
  // https://developer.mozilla.org/fr/docs/Web/API/Window/requestAnimationFrame
  requestAnimationFrame(animate);

  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  // Rendu de la scène
  render();

  // Calculs de mécanique spatiale sur toutes les planètes
  for (const planete of planetes) {

    // Vecteur unitaire n par normalisation du vecteur position de la planète par rapport au Soleil
    const n = planete.p.clone().normalize();
    // acceleration due au Soleil
    const a = n.multiplyScalar(-G * M / planete.p.distanceToSquared(sun.position));
    for (const corps of planetes) {
      if (corps !== planete) {
        // Vecteur unitaire n par normalisation du vecteur position de la planète par rapport au corps
        const ni = planete.p.clone().sub(corps.p).normalize();
        // acceleration due au corps i
        const ai = ni.multiplyScalar(-G * corps.m / planete.p.distanceToSquared(corps.p));
        // Les accélérations s'ajoutent
        a.add(ai);
      }
      // Visibilité des orbites
      planete.orbit.visible = control.orbits

      // Affichage des trails
      planete.trail = []
    }

    // variation de vitesse
    const dv = a.multiplyScalar(control.deltaT);
    // nouvelle vitesse v = v + dv
    planete.v.add(dv);

    // variation de position
    const dp = planete.v.clone().multiplyScalar(control.deltaT);
    // nouvelle position p = p + dp
    planete.p.add(dp);

    // position affichée à l'échelle
    planete.mesh.position.add(dp.multiplyScalar(echelleDistances));

    /* Comptage des jours
    if ((planete.mesh.rotation.y + planete.omega * control.deltaT) % (2 * Math.PI) < planete.mesh.rotation.y % (2 * Math.PI)) {
      //console.log(++j);
    }*/

    // rotation de la planète
    //planete.mesh.rotation.y += planete.omega * control.deltaT;
    planete.mesh.rotateOnWorldAxis(planete.axe, planete.omega * control.deltaT);
  }

  // rotation du Soleil
  sun.rotation.z += 2 * control.deltaT * Math.PI / (30 * 24 * 3600);;

  // alignement de la camera avec la planète active
  if (control.numPlanete === 0) controls.target = sun.position;
  else {
    const indexPlanete = control.numPlanete - 1;
    controls.target = planetes[indexPlanete].mesh.position;
    //camera.position.x = planetes[indexPlanete].mesh.position.x + 10
    //camera.position.y = planetes[indexPlanete].mesh.position.y - 10
    camera.rotation.set(0,0,0);
  }
  //camera.lookAt(planetes[2].mesh.position);
  //console.log(camera.target);

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