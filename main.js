console.log("Hello, World!");
import * as THREE from "three";
let currentLane = 0;
let touchStartX = 0;
let touchEndX = 0;
let isGameOver = false;
let score = 0;
let highScore = 0;
const clock = new THREE.Clock();
const scoreElement = document.getElementById("score");
const gameOverElement = document.getElementById("game-over");
const laneWidth = 2;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x333333);
document.body.appendChild(renderer.domElement);
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.y = 0.5;
const roadGeometry = new THREE.PlaneGeometry(10, 100);
const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2;
const gridHelper = new THREE.GridHelper(100, 20);
const enemyGeometry = new THREE.BoxGeometry();
const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
enemy.position.z = -50;
enemy.position.x = 0;
enemy.position.y = 0.5;
scene.add(enemy);
scene.add(road);
scene.add(cube);
scene.add(gridHelper);
camera.position.z = 5;
camera.position.y = 3;
camera.position.x = 0;
camera.rotation.x = -0.5;
function changeLane(direction) {
  const targetLane = currentLane + direction;
  if (targetLane >= -1 && targetLane <= 1) {
    currentLane = targetLane;
  }
}
function handleSwipe() {
  const threshold = 50;
  const diff = touchEndX - touchStartX;
  if (Math.abs(diff) > threshold) {
    if (diff > 0) {
      changeLane(1);
    } else changeLane(-1);
  }
}
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (!isGameOver) {
    gridHelper.position.z += 24.0 * delta;
    if (gridHelper.position.z > 5) {
      gridHelper.position.z = 0;
    }
    cube.position.x = THREE.MathUtils.lerp(
      cube.position.x,
      currentLane * laneWidth,
      40 * delta
    );
    enemy.position.z += 72 * delta;
    if (enemy.position.z > 5) {
      enemy.position.z = -50;
      const randomLane = Math.floor(Math.random() * 3) - 1;
      enemy.position.x = randomLane * laneWidth;
    }
    score += 1;
    scoreElement.innerText = score;
    if (Math.abs(enemy.position.z - cube.position.z) < 1.0) {
      if (Math.abs(enemy.position.x - cube.position.x) < 1.0) {
        isGameOver = true;
        cube.material.color.setHex(0x000000);
        gameOverElement.style.display = "block";
      }
    }
    renderer.render(scene, camera);
  }
}
animate();

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") changeLane(-1);
  if (event.key === "ArrowRight") changeLane(1);
  if (isGameOver && event.code === "Space") {
    isGameOver = false;
    score = 0;
    scoreElement.innerText = "0";
    gameOverElement.style.display = "none";
    enemy.position.z = -50;
    cube.material.color.setHex(0x00ff00);
    return;
  }
});
document.addEventListener("touchstart", (event) => {
  if (isGameOver && event.code === "Space") {
    isGameOver = false;
    score = 0;
    scoreElement.innerText = "0";
    gameOverElement.style.display = "none";
    enemy.position.z = -50;
    cube.material.color.setHex(0x00ff00);
    return;
  }
  touchStartX = event.changedTouches[0].screenX;
});
document.addEventListener("touchend", (event) => {
  touchEndX = event.changedTouches[0].screenX;
  handleSwipe();
});
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
