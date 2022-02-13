"use strict";
/* --------------------------Import--------------------------------- */

import "./style.css";
import * as THREE from "three";
import CameraControls from "camera-controls";
CameraControls.install({ THREE: THREE });
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; //Imports the GLTF Model loader
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { fogParsVert, fogVert, fogParsFrag, fogFrag } from "./js/FogReplace";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise";
/* ----------------------------------------------------------------- */

/* Parameters for the fog */
var params = {
  fogNearColor: 0x544a7d,
  fogHorizonColor: 0xe5cdcd,
  fogDensity: 0.0025,
  fogNoiseSpeed: 100,
  fogNoiseFreq: 0.0012,
  fogNoiseImpact: 0.5,
};
var worldWidth = 250,
  worldDepth = 250;
/* --------------------------------- */

/* Start of WebSerial and ArduinoJSON communication, mostly Love's code */
if (!("serial" in navigator)) {
  alert(
    "Your browser does not support Web Serial, try using something Chromium based."
  );
}
const getSerialPort = document.getElementById("initSerial");
getSerialPort.addEventListener("pointerdown", async (event) => {
  state.serial = await navigator.serial.requestPort();
  await state.serial.open({ baudRate: 19200 });

  readJSONFromArduino(async () => {
    updateDataDisplay();
    //if (state.joystick.x || state.joystick.y) {
    writeJoystickBrightnessToArduino();
    //}
  });
});

const updateDataDisplay = () => {
  document.querySelector("#joystick-x").innerHTML = state.joystick.x;
  document.querySelector("#joystick-y").innerHTML = state.joystick.y;
  document.querySelector("#joystick-pressed").innerHTML =
    state.joystick.pressed;
};

// This function reads data from the Arduino and calls the callback, if any.
const readJSONFromArduino = async (callback) => {
  if (!state.serial)
    throw new Error("No Arduino connected to read the data from!");

  // This part is a bit more complex, but you can safely "hand wave it".
  // I explain it in some depth in the demo.
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = state.serial.readable.pipeTo(
    textDecoder.writable
  );
  const reader = textDecoder.readable.getReader();
  let lineBuffer = "";

  // Listen to data coming from the serial device.
  while (state.serial.readable) {
    const response = await reader.read();

    if (response.done) {
      reader.releaseLock();
      break;
    }

    // Again, a bit more complex. We have to manully handle the response
    // from the Arduino. See the demo.
    lineBuffer += response.value;
    const lines = lineBuffer.split("\n");
    if (lines.length > 1) {
      // We have a complete JSON response!
      lineBuffer = lines.pop(); // Set the buffer to any data from the next response
      const line = lines.pop().trim(); // Get the JSON and remove the newline
      state.joystick = JSON.parse(line); // Parse the JSON and put it in the state under joystick
      if (callback) callback(); // Run the callback function, if any
    }
  }
};

const writeJSONToArduino = async (callback) => {
  if (!state.serial)
    throw new Error("No Arduino connected to write the data to!");

  const data = state.dataToWrite; // First, we get the object an object and turn it into JSON.
  const json = JSON.stringify(data); // Transform our internal JS object into JSON representation, which we store as a string

  // The serial writer will want the data in a specific format, which we can do with the TextEncoder object, see https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
  const payload = new TextEncoder().encode(json);

  // Get the writer, write to it and then release it for the next write

  const writer = await state.serial.writable.getWriter();

  await writer.write(payload);
  writer.releaseLock();

  if (callback) callback(); // Run the callback function, if any
};

// Takes the position of the scene Camera and maps x, y and z to rgb values.
//To avoid negative values going to the led, we take the pos and add 50. (50 because that's low enough to still let us get values close to 0).
//Then we multiply with 2.5, so that we can also get values as close to 255 as possible.
const writeJoystickBrightnessToArduino = async () => {
  state.dataToWrite = {
    red: Math.floor((camera.position.x + 50) * 2.5),
    green: Math.floor((camera.position.y + 50) * 2.5),
    blue: Math.floor((camera.position.z + 50) * 2.5),
  };
  writeJSONToArduino();
};

/*
! three.js stuff begins here, I think
 */
/* First we declare base constants to use throughout three.js */
const width = window.innerWidth;
const height = window.innerHeight;
const clock = new THREE.Clock();
const scene = new THREE.Scene(); //Declares the three.js Scene
const loader = new GLTFLoader(); //Declares the object loader for our chair.
const objLoader = new OBJLoader(); //Another object loader, this was used to import a 3D plane during development
const mtlLoader = new MTLLoader(); //Declares a material loader to use with the objLoader
const camera = new THREE.PerspectiveCamera(65, width / height, 0.01, 1000); //Sets up a scene camera.
camera.position.set(25, 15, 35); //Sets the xyz pos for scene camera.
const renderer = new THREE.WebGLRenderer({ antialias: true }); //Declares the actual renderer of the scene
/* Params for the renderer, such as width, height, aspect ration. */
/* We also calibrate the exposure and colorprofile */
/* As well as enabling shadows */
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.8;
renderer.shadowMap.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);
//! ---------------------------------------------------------

/* Here begins the library we used to get rotational controls mapped to keypresses  */
/* We don't really need all of these these controls since we decided on a simpler solution. */
const cameraControls = new CameraControls(camera, renderer.domElement);
const KEYCODE = {
  W: 87,
  A: 65,
  S: 83,
  D: 68,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
};

const wKey = new holdEvent.KeyboardKeyHold(KEYCODE.W, 16.666);
const aKey = new holdEvent.KeyboardKeyHold(KEYCODE.A, 16.666);
const sKey = new holdEvent.KeyboardKeyHold(KEYCODE.S, 16.666);
const dKey = new holdEvent.KeyboardKeyHold(KEYCODE.D, 16.666);
aKey.addEventListener("holding", function (event) {
  cameraControls.truck(-0.01 * event.deltaTime, 0, false);
});
dKey.addEventListener("holding", function (event) {
  cameraControls.truck(0.01 * event.deltaTime, 0, false);
});
wKey.addEventListener("holding", function (event) {
  cameraControls.forward(0.01 * event.deltaTime, false);
});
sKey.addEventListener("holding", function (event) {
  cameraControls.forward(-0.01 * event.deltaTime, false);
});

const leftKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_LEFT, 100);
const rightKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_RIGHT, 100);
const upKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_UP, 100);
const downKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_DOWN, 100);
leftKey.addEventListener("holding", function (event) {
  cameraControls.rotate(
    -0.1 * THREE.MathUtils.DEG2RAD * event.deltaTime,
    0,
    true
  );
});
rightKey.addEventListener("holding", function (event) {
  cameraControls.rotate(
    0.1 * THREE.MathUtils.DEG2RAD * event.deltaTime,
    0,
    true
  );
});
upKey.addEventListener("holding", function (event) {
  cameraControls.rotate(
    0,
    -0.05 * THREE.MathUtils.DEG2RAD * event.deltaTime,
    true
  );
});
downKey.addEventListener("holding", function (event) {
  cameraControls.rotate(
    0,
    0.05 * THREE.MathUtils.DEG2RAD * event.deltaTime,
    true
  );
});
/*--------------End of camera controls --------------------- */

/* ------------------------------------------------- */
//loads the chair model and imports it to the scene
loader.load(
  "./assets/gltf-chair/chair2.gltf",
  function (gltf) {
    gltf.scene.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        if (n.material.map) n.material.map.anisotropy = 16;
      }
    });
    scene.add(gltf.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

/* Here we load a plane onto the scene */
/* loader.load(
  "./assets/model/floor/untitled3.gltf",
  function (gltf) {
    gltf.scene.traverse((n) => {
      if (n.isMesh) {
        n.receiveShadow = true;
        if (n.material.map) n.material.map.anisotropy = 16;
      }
    });
    scene.add(gltf.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  }
); */

/* Here we set up the fog in the scene */
var texture, terrainShader;
/* Sets the fog background of the scene, and loads the parameters specefied at the top of the script  */
scene.background = new THREE.Color(params.fogHorizonColor);
scene.fog = new THREE.FogExp2(params.fogHorizonColor, params.fogDensity);
var data = generateHeight(worldWidth, worldDepth);

var geometry = new THREE.PlaneBufferGeometry(
  500,
  500,
  worldWidth - 1,
  worldDepth - 1
);
geometry.rotateX(-Math.PI / 2);
var vertices = geometry.attributes.position.array;
for (var i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
  vertices[j + 1] = data[i] * 10;
}

const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ color: new THREE.Color(0xefd1b5) })
);

mesh.material.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    `#include <fog_pars_vertex>`,
    fogParsVert
  );
  shader.vertexShader = shader.vertexShader.replace(
    `#include <fog_vertex>`,
    fogVert
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    `#include <fog_pars_fragment>`,
    fogParsFrag
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    `#include <fog_fragment>`,
    fogFrag
  );
  terrainShader = shader;
  const uniforms = {
    fogNearColor: { value: new THREE.Color(params.fogNearColor) },
    fogNoiseFreq: { value: params.fogNoiseFreq },
    fogNoiseSpeed: { value: params.fogNoiseSpeed },
    fogNoiseImpact: { value: params.fogNoiseImpact },
    time: { value: 5 },
  };

  shader.uniforms = THREE.UniformsUtils.merge([shader.uniforms, uniforms]);
};

/* Loads a cube map as background */
/* scene.background = new THREE.CubeTextureLoader()
  .setPath("assets/cubemap/")
  .load(["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]); */

/*--------------------------Light---------------------------------*/
const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 2);
scene.add(hemiLight);
const spotLight = new THREE.SpotLight(0xffa95c, 5);
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;
spotLight.shadow.mapSize.width = 1024 * 4;
spotLight.shadow.mapSize.height = 1024 * 4;
scene.add(spotLight);

/* Add eventListener for Enter keypress, used to reset Camera and spotlight position */
document.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    camera.position.set(25, 15, 35);
    spotLight.position.set(
      camera.position.x + 10,
      camera.position.y + 10,
      camera.position.z + 10
    );
  }
});
spotLight.position.set(
  camera.position.x + 10,
  camera.position.y + 10,
  camera.position.z + 10
);
/* --------------------------------------------------------------- */
//! HERE IS ANIMATE --------------------------------------------------------------
/* Here is where we animate the scene */
function animate() {
  if (terrainShader) {
    terrainShader.uniforms.time.value += deltaTime;
  }
  /* Tracks one of the lights to the camera position to get some nice shadows in the scene */
  spotLight.position.set(
    camera.position.x + 10,
    camera.position.y + 10,
    camera.position.z + 10
  );
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  const updated = cameraControls.update(delta);

  /* Here is where the easy route of the controls come in. */
  /* We get the joysticks values of x and y. */

  var xValx = state.joystick.x;
  var yValy = state.joystick.y;
  /* We use the fact of that we have declared a joystick"deadzone" at 0 inside the arduino sketch  */
  /* So if the value is above or below that deadzone of 0, the camera will move in that direction. */
  if (xValx < 0) {
    cameraControls.rotate(-0.1 * THREE.MathUtils.DEG2RAD * 6, 0, true);
  } else if (xValx > 0) {
    cameraControls.rotate(0.1 * THREE.MathUtils.DEG2RAD * 6, 0, true);
  }
  if (yValy < 0) {
    cameraControls.rotate(0, -0.05 * THREE.MathUtils.DEG2RAD * 6, true);
  } else if (yValy > 0) {
    cameraControls.rotate(0, 0.05 * THREE.MathUtils.DEG2RAD * 6, true);
  }
  if (updated) {
    renderer.render(scene, camera);
  }
  renderer.render(scene, camera);
  camera.updateProjectionMatrix();
  requestAnimationFrame(animate);
}

function render() {
  let deltaTime = clock.getDelta();
  renderer.render(scene, camera);
}

function generateHeight(width, height) {
  var seed = Math.PI / 4;
  window.Math.random = function () {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  var size = width * height,
    data = new Uint8Array(size);
  var perlin = new ImprovedNoise(),
    quality = 1,
    z = Math.random() * 100;

  for (var j = 0; j < 4; j++) {
    for (var i = 0; i < size; i++) {
      var x = i % width,
        y = ~~(i / width);
      data[i] += Math.abs(
        perlin.noise(x / quality, y / quality, z) * quality * 1.75
      );
    }

    quality *= 5;
  }

  return data;
}

const state = {
  dataToWrite: {
    red: 0,
    green: 0,
    blue: 0,
  },
  serial: null,
  joystick: {
    x: 0,
    y: 0,
  },
};

animate();
