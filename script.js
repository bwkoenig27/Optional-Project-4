let scene, camera, renderer, analyser, audioContext;
let source = null;
let isPlaying = false;
let bars = [];

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 500; // Adjusted for better view
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('visualization').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 500);
    pointLight.position.set(0, 50, 50);
    scene.add(pointLight);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupAnalyser(source) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
}

function createVisuals() {
    const radius = 300; // Radius of the circle
    const geometry = new THREE.TorusGeometry(5, 2, 16, 100);
    const numBars = analyser.frequencyBinCount;
    const angleStep = Math.PI * 2 / numBars; // Full circle divided by the number of bars

    for (let i = 0; i < numBars; i++) {
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        let bar = new THREE.Mesh(geometry, material);
        
        // Calculate x and z using circular coordinates
        let angle = angleStep * i;
        bar.position.x = radius * Math.cos(angle);
        bar.position.z = radius * Math.sin(angle);
        bar.rotation.y = -angle; // Orient the torus to face outwards

        scene.add(bar);
        bars.push(bar);
    }
}

function updateLights(dataArray) {
    const avgFrequency = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    pointLight.color.setHSL(avgFrequency / 256, 1, 0.5);
}

function animate() {
    requestAnimationFrame(animate);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    bars.forEach((bar, i) => {
        let scale = dataArray[i] / 12;
        bar.scale.y = scale < 1 ? 1 : scale; // Ensure there's always a minimum scale
        bar.material.color.setHSL(scale / 3, 1, 0.5);  // Color transition based on the data
    });

    

    renderer.render(scene, camera);
}

document.getElementById('startButton').addEventListener('click', function() {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    if (!isPlaying && audioContext.state !== 'running') {
        // Optionally prompt user to select a file if none has been selected yet
        if (document.getElementById('fileInput').files.length > 0) {
            const audioUrl = URL.createObjectURL(document.getElementById('fileInput').files[0]);
            loadAndPlayAudio(audioUrl);
            isPlaying = true;
        } else {
            alert("Please select a file first.");
        }
    }
});


document.getElementById('pauseButton').addEventListener('click', function() {
    if (!audioContext) return;

    if (audioContext.state === 'running') {
        audioContext.suspend().then(() => console.log('Playback paused'));
    } else if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log('Playback resumed'));
    }
});

document.getElementById('fileInput').addEventListener('change', function(event) {
    if (event.target.files.length > 0) {
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        const audioUrl = URL.createObjectURL(event.target.files[0]);
        loadAndPlayAudio(audioUrl);
        isPlaying = true;
    }
});

async function loadAndPlayAudio(filePath) {
    if (source) {
        source.stop();
    }

    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    setupAnalyser(source);
    source.connect(audioContext.destination);
    source.start(0);

    createVisuals();
    animate();
}
function setupCameraControls() {
    window.addEventListener('keydown', function(event) {
        console.log("Key pressed:", event.key); // This helps to debug if the correct keys are detected
        switch (event.key) {
            case 'w':
            case 'W':
                camera.position.z -= 10;
                break;
            case 's':
            case 'S':
                camera.position.z += 10;
                break;
            case 'a':
            case 'A':
                camera.position.x -= 10;
                break;
            case 'd':
            case 'D':
                camera.position.x += 10;
                break;
        }
        camera.lookAt(scene.position); // Keep the camera looking at the center of the scene
        console.log("Camera position:", camera.position.x, camera.position.z); // Log the updated position
    });
}
document.addEventListener('DOMContentLoaded', function() {
    initThreeJS();
    setupCameraControls();
});