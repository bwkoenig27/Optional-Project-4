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
    const geometry = new THREE.TorusGeometry(7, 2, 16, 100);
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
        let scale = dataArray[i] / 8;
        bar.scale.y = scale < 1 ? 1 : scale; // Ensure there's always a minimum scale
        bar.material.color.setHSL(scale / 3, 1, 0.5);  // Color transition based on the data
    });

    // Update camera position to spin vertically
    camera.position.x = 500 * Math.sin(Date.now() * 0.0005);
    camera.position.y = 500 * Math.cos(Date.now() * 0.0005);  
    camera.position.z = 500 * Math.cos(Date.now() * 0.0005);
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}

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

function setupAudioProcessing(stream) {
    if (!audioContext) {
        audioContext = new AudioContext();
    }

    const source = audioContext.createMediaStreamSource(stream);
    setupAnalyser(source);

    // Initialize and create visuals as needed
    createVisuals();
    animate();
}
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
async function getMicrophoneInput() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setupAudioProcessing(stream);
    } catch (err) {
        console.error('Error accessing the microphone:', err);
        alert('Could not access the microphone. Please check browser permissions.');
    }
}
async function requestMicrophoneAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');
        // Continue setting up audio processing with the stream
    } catch (error) {
        console.log('Microphone access denied:', error);
    }
}
async function checkMicrophonePermission() {
    if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' });
        return result.state;
    } else {
        return 'unsupported';
    }
}

document.getElementById('micButton').addEventListener('click', async function() {
    const micPermission = await checkMicrophonePermission();
    if (micPermission === 'prompt' || micPermission === 'denied') {
        await requestMicrophoneAccess();
    } else if (micPermission === 'granted') {
        console.log('Microphone already granted');
        // Proceed with functionality as the mic is already accessible
    } else if (micPermission === 'unsupported') {
        alert('Microphone access is not supported in your browser.');
    }
});
document.addEventListener('DOMContentLoaded', function() {
    initThreeJS();
    document.getElementById('startMicButton').addEventListener('click', function() {
        getMicrophoneInput();
    });

    document.getElementById('frequencyRange').addEventListener('change', function(event) {
        // Adjust the frequency bin count or other parameters based on selection
        switch(event.target.value) {
            case 'treble':
                analyser.fftSize = 2048;
                break;
            case 'bass':
                analyser.fftSize = 512;
                break;
            case 'mid':
                analyser.fftSize = 1024;
                break;   
        }
        createVisuals(); // Re-create visuals with new settings
    });
    
});