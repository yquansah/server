import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import '@babylonjs/loaders/glTF';
import {
  Engine, Scene, Vector3, HemisphericLight, Mesh, Color3, CannonJSPlugin, MeshBuilder, StandardMaterial, PhysicsImpostor, MotorEnabledJoint, PhysicsJoint, Axis, UniversalCamera,
} from '@babylonjs/core';
import * as cannon from 'cannon';
import Sky from './sky';
import Character from './player/character';
import ThirdPersonCamera from './player/thirdPersonCamera';
// TODO: figure out how to do eslint with formatting white space
// look into airbnb config

const lightingConfig = {
  ambient: new Color3(138 / 255, 138 / 255, 138 / 255),
};

function setupLighting(config, scene) {
  const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
  ambientLight.groundColor = config.ambient;
  ambientLight.intensity = 0.7;
}

function setupMap(scene) {
  const ground = Mesh.CreateGround('ground', 10, 10, 0, scene);
  ground.physicsImpostor = new PhysicsImpostor(
    ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5, friction: 0.5 }, scene,
  );

  const sky = new Sky(scene);
}

async function main() {
  // create the canvas html element and attach it to the webpage
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.id = 'gameCanvas';
  document.body.appendChild(canvas);

  // initialize babylon scene and engine
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin(true, 100, cannon));

  setupMap(scene);
  setupLighting(lightingConfig, scene);

  const character = new Character(scene);
  const camera = new ThirdPersonCamera(scene, character);

  canvas.onclick = function onClick() {
    canvas.requestPointerLock();
  };

  let mouseXDiff = 0;
  let mouseYDiff = 0;
  function updatePosition(e) {
    mouseXDiff += e.movementX;
    mouseYDiff += e.movementY;
  }

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      document.addEventListener('mousemove', updatePosition, false);
    } else {
      document.removeEventListener('mousemove', updatePosition, false);
    }
  });

  const keysPressed = {};
  window.addEventListener('keydown', (ev) => {
    if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === 'I') { // Shift+Ctrl+Alt+I
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        scene.debugLayer.show();
      }
    }
    keysPressed[ev.key] = true;
  });

  window.addEventListener('keyup', (ev) => {
    keysPressed[ev.key] = false;
  });

  // run the main render loop
  engine.runRenderLoop(() => {
    const deltaTimeMs = engine.getDeltaTime();
    const moveKeys = {
      w: [0, 1], a: [-1, 0], s: [0, -1], d: [1, 0],
    };

    const move2DVector = [0, 0];
    Object.entries(moveKeys).forEach(([key, key2DVector]) => {
      if (keysPressed[key]) {
        move2DVector[0] += key2DVector[0];
        move2DVector[1] += key2DVector[1];
      }
    });

    character.move(move2DVector[0], move2DVector[1], deltaTimeMs);
    character.rotate(mouseXDiff / 1000);
    camera.rotate(mouseYDiff / 1000);

    scene.render();

    mouseXDiff = 0;
    mouseYDiff = 0;
  });
}

main();
