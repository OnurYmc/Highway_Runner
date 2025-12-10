console.log("Highway Runner Starting...");

// --- IMPORTS ---
import * as THREE from "three";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDRsjxW-rfhOOvNmBH-Q1_EWZN0MNl9jyM",
  authDomain: "highwayrunner-3d0b4.firebaseapp.com",
  projectId: "highwayrunner-3d0b4",
  storageBucket: "highwayrunner-3d0b4.firebasestorage.app",
  messagingSenderId: "350388025736",
  appId: "1:350388025736:web:d351bae015c2478625623d",
};

// Initialize Cloud Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONSTANTS ---
const startSpeed = 15;
const laneWidth = 2;

// --- GLOBAL VARIABLES ---
let currentLane = 0;
let touchStartX = 0;
let touchEndX = 0;
let isGameOver = false;
let score = 0;
let currentSpeed = startSpeed;

const clock = new THREE.Clock();

// --- DOM ELEMENTS ---
const scoreElement = document.getElementById("score");
const gameOverElement = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const nameInput = document.getElementById("player-name");
const submitBtn = document.getElementById("submit-score");
const statusMsg = document.getElementById("status-msg");
const inputContainer = document.getElementById("input-container");
const miniLeaderboard = document.getElementById("mini-leaderboard");
const studentIdInput = document.getElementById("student-id");

// --- SCENE SETUP ---
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

// --- ASSETS ---
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

// --- GAME LOGIC ---
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

// --- SUBMIT SCORE & SHOW RANK ---
async function submitScore() {
  const name = nameInput.value.trim();
  const studentId = studentIdInput.value.trim(); // <--- Capture ID

  // VALIDATION: Must fill both
  if (name === "" || studentId === "") {
    statusMsg.innerText = "Please fill Name AND Student ID!";
    statusMsg.style.color = "yellow";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Sending...";

  try {
    // Send data to Cloud (Including the secret ID)
    const docRef = await addDoc(collection(db, "leaderboard"), {
      name: name,
      studentId: studentId, // Saved in DB, but we won't show it on screen
      score: score,
      timestamp: new Date(),
    });

    statusMsg.innerText = "Calculating Rank...";
    inputContainer.style.display = "none";

    await fetchAndShowRank(docRef.id);
  } catch (e) {
    console.error("Error:", e);
    statusMsg.innerText = "Error saving.";
    submitBtn.disabled = false;
  }
}

async function fetchAndShowRank(myDocId) {
  // Get ALL scores sorted by high score
  // (For a uni event with <1000 players, fetching all is fine and fast)
  const q = query(collection(db, "leaderboard"), orderBy("score", "desc"));
  const snapshot = await getDocs(q);

  miniLeaderboard.innerHTML = ""; // Clear old list
  miniLeaderboard.style.display = "block"; // Show container
  statusMsg.style.display = "none"; // Hide status text

  let rank = 1;
  let myRank = -1;
  let html = "";

  // Loop through everyone to build the list
  snapshot.forEach((doc) => {
    const data = doc.data();
    const isMe = doc.id === myDocId;

    if (isMe) {
      myRank = rank;
    }

    // Logic: Always show Top 10.
    // If I am found later (Rank > 10), I will be added separately.
    if (rank <= 10) {
      html += `
                <div class="lb-row ${isMe ? "my-rank" : ""}">
                    <span>#${rank} ${escapeHtml(data.name)}</span>
                    <span>${data.score}</span>
                </div>
            `;
    }
    rank++;
  });

  // If I wasn't in the top 10, add a "..." and then my row
  if (myRank > 10) {
    html += `<div class="lb-gap">...</div>`;

    // We need to fetch my data again or just reuse variables since we know them
    // To be safe, we just manually create the row since we know the name/score
    html += `
            <div class="lb-row my-rank">
                <span>#${myRank} ${escapeHtml(nameInput.value)}</span>
                <span>${score}</span>
            </div>
        `;
  }

  miniLeaderboard.innerHTML = html;
}

// Helper to prevent HTML injection in names
function escapeHtml(text) {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- ANIMATION LOOP ---
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (!isGameOver) {
    // 1. Move Road
    gridHelper.position.z += (currentSpeed / 3) * delta;
    if (gridHelper.position.z > 5) gridHelper.position.z = 0;

    // 2. Move Player
    cube.position.x = THREE.MathUtils.lerp(
      cube.position.x,
      currentLane * laneWidth,
      10 * delta
    );

    // 3. Move Enemy
    enemy.position.z += currentSpeed * delta;
    if (enemy.position.z > 5) {
      enemy.position.z = -50;
      const randomLane = Math.floor(Math.random() * 3) - 1;
      enemy.position.x = randomLane * laneWidth;
    }

    // 4. Update Score
    score += 1;
    scoreElement.innerText = score;
    currentSpeed = startSpeed + score * 0.1;

    // 5. Collision Check
    if (Math.abs(enemy.position.z - cube.position.z) < 1.0) {
      if (Math.abs(enemy.position.x - cube.position.x) < 1.0) {
        // --- GAME OVER TRIGGERS ---
        isGameOver = true;
        cube.material.color.setHex(0x000000);

        // Show UI
        finalScoreElement.innerText = score;
        gameOverElement.style.display = "block";
        inputContainer.style.display = "block"; // Show input again
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit";
        statusMsg.innerText = "";
        nameInput.value = ""; // Clear old name
      }
    }
  }
  renderer.render(scene, camera);
}
animate();

// --- EVENT LISTENERS ---

// Submit Button Click
submitBtn.addEventListener("click", submitScore);

// Restart Logic (Modified to not restart if clicking the input box)
function restartGame() {
  isGameOver = false;
  score = 0;
  scoreElement.innerText = "0";

  // RESET UI
  gameOverElement.style.display = "none";
  inputContainer.style.display = "block"; // Bring back input for next time
  miniLeaderboard.style.display = "none"; // Hide list
  statusMsg.style.display = "block"; // Bring back status text
  statusMsg.innerText = "";
  submitBtn.disabled = false;
  submitBtn.innerText = "Submit";
  nameInput.value = "";
  studentIdInput.value = "";

  // Reset Game State
  currentSpeed = startSpeed;
  enemy.position.z = -50;
  cube.material.color.setHex(0x00ff00);
}

document.addEventListener("keydown", (event) => {
  // If typing in the input box, don't move the car!
  if (document.activeElement === nameInput) return;

  if (isGameOver && event.code === "Space") {
    restartGame();
    return;
  }

  if (!isGameOver) {
    if (event.key === "ArrowLeft") changeLane(-1);
    if (event.key === "ArrowRight") changeLane(1);
  }
});

document.addEventListener("touchstart", (event) => {
  // Check if we tapped the UI button or input
  if (event.target === submitBtn || event.target === nameInput) return;

  if (isGameOver) {
    restartGame();
    return;
  }
  touchStartX = event.changedTouches[0].screenX;
});

document.addEventListener("touchend", (event) => {
  if (event.target === submitBtn || event.target === nameInput) return;
  touchEndX = event.changedTouches[0].screenX;
  if (!isGameOver) handleSwipe();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
