// Last Shift at the Library: a wave shooter inside a Marble world.
// The Gaussian splat is what you see. The collider mesh is what you walk on and bump into.
// Everything that makes it a game (health, shells, waves, winning, losing) is ordinary code below.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { computeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ---------- World ----------
// Put your own Marble exports in assets/ under these two names.
// If they are missing, the game loads the public sample scene instead.
const MY_WORLD = {
	label: "Your Marble world",
	splat: "assets/world.spz",
	collider: "assets/collider.glb",
	// Press C in the game to overlay the collider. If it does not line up with
	// the picture, change these flips first.
	splatFlip: [1, -1, -1], // half turn about X: Marble splats are stored Y-down
	colliderFlip: [-1, 1, -1], // half turn about Y
	// Size multiplier. null = fit automatically, so the world's starting camera
	// (the origin) ends up at eye height above the floor.
	scale: null,
};
const SAMPLE = "https://raw.githubusercontent.com/bmild/spark-physics/main/public/";
const SAMPLE_WORLD = {
	label: "Sample world: kitchen from World Labs' spark-physics example (not my export)",
	splat: SAMPLE + "kitchen_splats_500k.spz",
	collider: SAMPLE + "kitchen_mesh.glb",
	splatFlip: [1, -1, -1], // half turn about X: Marble splats are stored Y-down
	colliderFlip: [-1, 1, -1], // half turn about Y
	scale: null,
};

// ---------- Rules ----------
const EYE = 1.6, RADIUS = 0.3, STEP = 0.45, SPEED = 3.5, JUMP = 4.5, GRAVITY = 12;
const MAX_HEALTH = 100, MAX_SHELLS = 6, PELLETS = 6, SPREAD = 0.035;
const FIRE_DELAY = 0.7, RELOAD_TIME = 1.4;
const WAVES = 5, ENEMY_HP = 4, ENEMY_DAMAGE = 8, ENEMY_REACH = 1.0, ENEMY_HIT_DELAY = 1.0;

// ---------- Scene ----------
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);
camera.rotation.order = "YXZ";
scene.add(camera);
scene.add(new SparkRenderer({ renderer }));
scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 2.2));
const muzzle = new THREE.PointLight(0xffc070, 0, 12);
camera.add(muzzle);
addEventListener("resize", () => {
	renderer.setSize(innerWidth, innerHeight);
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
});

// Shotgun in the corner of the view.
const gun = new THREE.Group();
const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 });
const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.8 });
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), dark);
barrel.rotation.x = Math.PI / 2;
barrel.position.z = -0.25;
const pump = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), wood);
pump.position.set(0, -0.04, -0.3);
const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.3), wood);
stock.position.set(0, -0.04, 0.12);
gun.add(barrel, pump, stock);
gun.position.set(0.2, -0.18, -0.45);
camera.add(gun);

// ---------- Load the world ----------
const world = (await fetch(MY_WORLD.splat, { method: "HEAD" }).then((r) => r.ok, () => false))
	? MY_WORLD : SAMPLE_WORLD;
$("note").textContent = world.label;

const root = new THREE.Group();
scene.add(root);

const splat = new SplatMesh({ url: world.splat });
splat.scale.set(...world.splatFlip);
root.add(splat);

const colliderMat = new THREE.MeshBasicMaterial({
	color: 0x00ff88, wireframe: true, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.35,
});
const collider = (await new GLTFLoader().loadAsync(world.collider)).scene;
collider.scale.set(...world.colliderFlip);
collider.visible = false; // rays still hit it; C shows it
root.add(collider);
root.updateMatrixWorld(true);
collider.traverse((m) => {
	if (!m.isMesh) return;
	m.geometry.computeBoundsTree();
	m.material = colliderMat;
});
if (splat.initialized) await splat.initialized;

// ---------- Collision helpers ----------
const ray = new THREE.Raycaster();
ray.firstHitOnly = true;
const DOWN = new THREE.Vector3(0, -1, 0);
const tmp = new THREE.Vector3();

function cast(origin, dir, far) {
	ray.set(origin, dir);
	ray.far = far;
	return ray.intersectObject(collider, true)[0];
}
function normalOf(hit, dir) {
	const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
	return n.dot(dir) > 0 ? n.negate() : n;
}
// Move `pos` by `delta` on the floor plane, stopping at walls and sliding along them.
// A step that would leave no floor underfoot is refused: colliders have gaps, and
// nothing exists outside the generated room.
function slide(pos, delta, radius) {
	const from = pos.clone();
	slideOnce(pos, delta, radius);
	if (!cast(tmp.set(pos.x, pos.y + STEP, pos.z), DOWN, STEP + 2.5)) pos.copy(from);
}
function slideOnce(pos, delta, radius) {
	for (let i = 0; i < 2; i++) {
		const len = delta.length();
		if (len < 1e-6) return;
		const dir = delta.clone().divideScalar(len);
		let hit = null;
		for (const h of [0.7, 1.4]) {
			const r = cast(tmp.set(pos.x, pos.y + h, pos.z), dir, len + radius);
			if (r && (!hit || r.distance < hit.distance)) hit = r;
		}
		if (!hit) { pos.add(delta); return; }
		const allowed = Math.max(0, hit.distance - radius);
		pos.addScaledVector(dir, allowed);
		const n = normalOf(hit, dir).setY(0);
		if (n.lengthSq() < 1e-6) return;
		n.normalize();
		delta.addScaledVector(dir, -allowed);
		delta.addScaledVector(n, -delta.dot(n));
	}
}
// Gravity, landing, and walking up or down steps no taller than STEP.
function settle(body, dt) {
	body.vy -= GRAVITY * dt;
	const y = body.pos.y + body.vy * dt;
	const hit = cast(tmp.set(body.pos.x, body.pos.y + STEP, body.pos.z), DOWN, 60);
	const floor = hit ? hit.point.y : -Infinity;
	const stepDown = body.onGround && body.vy <= 0 && body.pos.y - floor <= STEP;
	if (y <= floor || stepDown) {
		body.pos.y = floor; body.vy = 0; body.onGround = true;
	} else {
		body.pos.y = y; body.onGround = false;
	}
}
// A standable point: floor below, headroom above, near the player's floor level.
function floorPoint(x, z, nearY) {
	const hit = cast(tmp.set(x, nearY + 1.2, z), DOWN, 2.4);
	if (!hit || normalOf(hit, DOWN).y < 0.7) return null;
	const p = hit.point.clone();
	if (cast(tmp.set(p.x, p.y + 0.2, p.z), DOWN.clone().negate(), 1.7)) return null;
	return p;
}

// ---------- Size the world, then find where the player starts ----------
{
	const under = cast(tmp.set(0, 0, 0), DOWN, 60);
	root.scale.setScalar(world.scale ?? (under ? EYE / under.distance : 1));
	root.updateMatrixWorld(true);
}
const bounds = new THREE.Box3().setFromObject(collider);

// ---------- Player ----------
const player = { pos: new THREE.Vector3(), vy: 0, onGround: false, yaw: 0, pitch: 0 };
const start = new THREE.Vector3();
{
	// Marble puts the starting camera at the origin, so look for floor under it first.
	const hit = cast(tmp.set(0, 0.5, 0), DOWN, 60);
	if (hit) start.copy(hit.point);
	else {
		const c = bounds.getCenter(new THREE.Vector3());
		const h = cast(tmp.set(c.x, c.y, c.z), DOWN, 60);
		start.copy(h ? h.point : c);
	}
}

// ---------- Enemies ----------
const enemies = [];
const enemyGeo = {
	body: new THREE.CapsuleGeometry(0.26, 0.8, 4, 10),
	head: new THREE.SphereGeometry(0.2, 12, 10),
	eye: new THREE.SphereGeometry(0.04, 6, 6),
};
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3020 });

function spawnEnemy() {
	const size = bounds.getSize(new THREE.Vector3());
	const minDist = Math.min(5, Math.hypot(size.x, size.z) * 0.2);
	for (let i = 0; i < 200; i++) {
		const p = floorPoint(
			bounds.min.x + Math.random() * size.x,
			bounds.min.z + Math.random() * size.z,
			start.y,
		);
		if (!p || p.distanceTo(player.pos) < minDist) continue;
		const mat = new THREE.MeshStandardMaterial({ color: 0x3f5f4a, roughness: 0.9 });
		const g = new THREE.Group();
		const body = new THREE.Mesh(enemyGeo.body, mat);
		body.position.y = 0.66;
		const head = new THREE.Mesh(enemyGeo.head, mat);
		head.position.y = 1.5;
		head.userData.head = true;
		for (const x of [-0.08, 0.08]) {
			const eye = new THREE.Mesh(enemyGeo.eye, eyeMat);
			eye.position.set(x, 1.53, 0.17);
			g.add(eye);
		}
		g.add(body, head);
		g.position.copy(p);
		scene.add(g);
		const e = { g, mat, pos: g.position, vy: 0, onGround: true, hp: ENEMY_HP, hitTimer: 0, flash: 0,
			best: Infinity, stuck: 0 };
		g.traverse((o) => (o.userData.enemy = e));
		enemies.push(e);
		return;
	}
}
function removeEnemy(e) {
	scene.remove(e.g);
	enemies.splice(enemies.indexOf(e), 1);
}

// ---------- Game state ----------
const game = { state: "menu", health: 0, shells: 0, score: 0, wave: 0, toSpawn: 0, spawnTimer: 0,
	fireTimer: 0, reloadTimer: 0, kick: 0, hurt: 0 };

function newGame() {
	while (enemies.length) removeEnemy(enemies[0]);
	Object.assign(game, { state: "play", health: MAX_HEALTH, shells: MAX_SHELLS, score: 0, wave: 0,
		toSpawn: 0, spawnTimer: 2, fireTimer: 0, reloadTimer: 0 });
	player.pos.copy(start);
	player.vy = 0; player.yaw = 0; player.pitch = 0;
	$("msg").style.display = "none";
}
function endGame(state, title, line) {
	game.state = state;
	document.exitPointerLock?.();
	showMessage(title, [line, `Score ${game.score}`, "Click to play again"]);
}
function showMessage(title, lines) {
	$("msg").innerHTML = `<h1>${title}</h1>` + lines.map((l) => `<p>${l}</p>`).join("");
	$("msg").style.display = "flex";
}

// ---------- Sound ----------
let audio;
function bang() {
	audio ??= new AudioContext();
	const n = audio.sampleRate * 0.25;
	const buf = audio.createBuffer(1, n, audio.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
	const src = audio.createBufferSource();
	src.buffer = buf;
	src.connect(audio.destination);
	src.start();
}

// ---------- Shooting ----------
const aim = new THREE.Raycaster();
function shoot() {
	if (game.state !== "play" || game.fireTimer > 0 || game.reloadTimer > 0) return;
	if (game.shells === 0) { reload(); return; }
	game.shells--;
	game.fireTimer = FIRE_DELAY;
	game.kick = 1;
	muzzle.intensity = 30;
	bang();
	scene.updateMatrixWorld(); // enemies have moved since the last drawn frame
	const origin = camera.getWorldPosition(new THREE.Vector3());
	const forward = camera.getWorldDirection(new THREE.Vector3());
	const targets = enemies.map((e) => e.g);
	for (let i = 0; i < PELLETS; i++) {
		const dir = forward.clone()
			.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(SPREAD * 2))
			.normalize();
		aim.set(origin, dir);
		const hit = aim.intersectObjects(targets, true)[0];
		if (!hit) continue;
		const wall = cast(origin, dir, hit.distance);
		if (wall) continue; // the world is in the way
		const e = hit.object.userData.enemy;
		if (!e || e.hp <= 0) continue;
		e.hp -= hit.object.userData.head ? 2 : 1;
		e.flash = 0.12;
		if (e.hp <= 0) { game.score += 100; removeEnemy(e); }
	}
}
function reload() {
	if (game.state !== "play" || game.reloadTimer > 0 || game.shells === MAX_SHELLS) return;
	game.reloadTimer = RELOAD_TIME;
}

// ---------- Input ----------
const lockPointer = () => renderer.domElement.requestPointerLock?.()?.catch?.(() => {}); // arrow keys still work if refused
const keys = new Set();
addEventListener("keydown", (e) => {
	keys.add(e.code);
	if (e.code === "KeyR") reload();
	if (e.code === "KeyF") shoot();
	if (e.code === "KeyC") {
		collider.visible = !collider.visible;
		splat.opacity = collider.visible ? 0.35 : 1; // fade the picture so the wireframe shows through
	}
	if (e.code === "Space") e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
addEventListener("mousemove", (e) => {
	if (document.pointerLockElement !== renderer.domElement) return;
	player.yaw -= e.movementX * 0.0022;
	player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.4, 1.4);
});
renderer.domElement.addEventListener("mousedown", () => {
	if (document.pointerLockElement !== renderer.domElement) lockPointer();
	shoot();
});
$("msg").addEventListener("click", () => {
	newGame();
	lockPointer();
});

// ---------- Frame update ----------
function update(dt) {
	// Look with the arrow keys as well as the mouse.
	const turn = (keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0);
	const tilt = (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0);
	player.yaw += turn * 2 * dt;
	player.pitch = THREE.MathUtils.clamp(player.pitch + tilt * 1.5 * dt, -1.4, 1.4);

	// Walk.
	const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
	const s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
	if (f || s) {
		const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
		const move = new THREE.Vector3(-sin * f + cos * s, 0, -cos * f - sin * s)
			.normalize().multiplyScalar(SPEED * dt);
		slide(player.pos, move, RADIUS);
	}
	if (keys.has("Space") && player.onGround) { player.vy = JUMP; player.onGround = false; }
	settle(player, dt);
	if (player.pos.y < bounds.min.y - 20) { player.pos.copy(start); player.vy = 0; } // fell out of the world

	// Timers.
	game.fireTimer = Math.max(0, game.fireTimer - dt);
	if (game.reloadTimer > 0 && (game.reloadTimer -= dt) <= 0) { game.reloadTimer = 0; game.shells = MAX_SHELLS; }

	// Waves.
	if (game.toSpawn === 0 && enemies.length === 0) {
		if ((game.spawnTimer -= dt) <= 0) {
			if (game.wave === WAVES) return endGame("won", "You survived the night", "All five waves cleared.");
			game.wave++;
			game.toSpawn = 2 + game.wave * 2;
			game.spawnTimer = 0;
		}
	} else if (game.toSpawn > 0 && (game.spawnTimer -= dt) <= 0) {
		spawnEnemy();
		game.toSpawn--;
		game.spawnTimer = game.toSpawn ? 1.2 : 2.5; // 2.5 s pause before the next wave
	}

	// Enemies walk at the player and hit when close.
	for (const e of [...enemies]) {
		const to = player.pos.clone().sub(e.pos).setY(0);
		const dist = to.length();
		e.g.rotation.y = Math.atan2(to.x, to.z);
		if (dist > ENEMY_REACH * 0.8) {
			const speed = 1.3 + game.wave * 0.15;
			slide(e.pos, to.clone().multiplyScalar((speed * dt) / dist), 0.3);
		}
		settle(e, dt);
		e.g.children[2].position.y = 0.66 + Math.sin(performance.now() / 150 + e.g.id) * 0.03;
		e.flash = Math.max(0, e.flash - dt);
		e.mat.emissive.setHex(e.flash > 0 ? 0xaa2222 : 0x000000);
		e.hitTimer = Math.max(0, e.hitTimer - dt);
		if (dist < ENEMY_REACH && Math.abs(player.pos.y - e.pos.y) < 1.5 && e.hitTimer === 0) {
			e.hitTimer = ENEMY_HIT_DELAY;
			game.health -= ENEMY_DAMAGE;
			game.hurt = 1;
			if (game.health <= 0) { game.health = 0; return endGame("dead", "You died", `Reached wave ${game.wave} of ${WAVES}.`); }
		}
		// An enemy that makes no progress for 6 s (stuck behind furniture) is put somewhere else.
		if (dist < e.best - 0.3) { e.best = dist; e.stuck = 0; }
		else if ((e.stuck += dt) > 6 || e.pos.y < bounds.min.y - 2) { removeEnemy(e); game.toSpawn++; }
	}
}

function draw(dt) {
	camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
	camera.rotation.set(player.pitch, player.yaw, 0);
	game.kick = Math.max(0, game.kick - dt * 5);
	gun.position.z = -0.45 + game.kick * 0.08;
	gun.rotation.x = game.kick * 0.25 - (game.reloadTimer > 0 ? 0.6 : 0);
	muzzle.intensity = Math.max(0, muzzle.intensity - dt * 300);
	game.hurt = Math.max(0, game.hurt - dt * 2);
	$("flash").style.background = game.hurt > 0 ? "#f00" : "#fff";
	$("flash").style.opacity = Math.max(game.hurt * 0.4, game.kick > 0.8 ? 0.15 : 0);
	$("health").textContent = `HEALTH ${game.health}`;
	$("shells").textContent = game.reloadTimer > 0 ? "RELOADING" : `SHELLS ${game.shells}/${MAX_SHELLS}`;
	$("wave").textContent = `WAVE ${game.wave}/${WAVES}  LEFT ${enemies.length + game.toSpawn}`;
	$("score").textContent = `SCORE ${game.score}`;
	renderer.render(scene, camera);
}

showMessage("Last Shift at the Library", [
	"Survive five waves.",
	"WASD move · mouse or arrow keys look · click or F shoot · R reload · Space jump · C show collider",
	"Click to start",
]);
player.pos.copy(start);
window.__game = { game, player, enemies, world, splat, collider, bounds, camera, update }; // for the browser console

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
	const dt = Math.min(clock.getDelta(), 0.05);
	if (game.state === "play") update(dt);
	draw(dt);
});
