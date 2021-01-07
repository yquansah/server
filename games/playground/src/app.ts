import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, Space, Vector3, HemisphericLight, Mesh, Color3, SceneLoader, CannonJSPlugin, MeshBuilder, StandardMaterial, PhysicsImpostor, MotorEnabledJoint, PhysicsJoint, Axis, UniversalCamera } from "@babylonjs/core";
import * as cannon from "cannon"
import {setupSky} from "./sky"
// TODO: figure out how to do eslint with formatting white space
// look into airbnb config

const lightingConfig = {
  ambient: new Color3(138/255, 138/255, 138/255)
}

function setupLighting(config, scene){
  const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), scene)
  ambientLight.groundColor = config.ambient
  ambientLight.intensity = 0.7;
}

function setupMap(scene){
  const ground = Mesh.CreateGround("ground", 200, 200, 0, scene);
  ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass:0, restitution: 0.5, friction: 0.5 }, scene);
}

function setupCharacter(scene, canvas){
  const humanoidMaterial = new StandardMaterial("humanoidMaterial", scene);
  humanoidMaterial.diffuseColor = new Color3(0, 1, 0)

  const humanoidRoot = MeshBuilder.CreateBox("humanoidRoot", {width: 0.5, height: 0.5, depth: 0.5}, scene)
  humanoidRoot.position = new Vector3(0, 1.75, 0);
  humanoidRoot.material = humanoidMaterial
  humanoidRoot.showBoundingBox = true
  humanoidRoot.physicsImpostor = new PhysicsImpostor(
    humanoidRoot,
    PhysicsImpostor.BoxImpostor,
    {
        mass: 0,
        friction: 0.1,
        restitution: 0.1
    }, scene);
  
  const feet = MeshBuilder.CreateBox("player", {width:1, height:1, depth:1}, scene);
  feet.position = new Vector3(0, 0.5, 0)
  feet.material = humanoidMaterial
  feet.physicsImpostor = new PhysicsImpostor(
    feet,
    PhysicsImpostor.BoxImpostor,
    {
      mass: 1,
      friction: 0.1,
      restitution: 0.1,
    }, scene);
  
  const joint = new MotorEnabledJoint(PhysicsJoint.LockJoint, {
    mainPivot: new Vector3(0,0,0),
    connectedPivot: new Vector3(0, 5, 0),
    mainAxis: Axis.Y,
    nativeParams: {
      collision: false
    }
  })

  humanoidRoot.physicsImpostor.addJoint(feet.physicsImpostor, joint)

  // TODO NEXT: setup character
  SceneLoader.ImportMesh("", "./assets/", "Xbot.glb", scene, function onSuccess(newMeshes) {

  })

  return humanoidRoot
}

async function main() {
  // create the canvas html element and attach it to the webpage
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.id = "gameCanvas";
  document.body.appendChild(canvas);

  // initialize babylon scene and engine
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -9.81, 0),new CannonJSPlugin(true, 100, cannon))

  // hide/show the Inspector
  window.addEventListener("keydown", (ev) => {
    // Shift+Ctrl+Alt+I
    if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        scene.debugLayer.show();
      }
    }
  });

  setupMap(scene)
  setupLighting(lightingConfig, scene);
  setupSky(scene)
  const humanoidRoot = setupCharacter(scene, canvas)


  const camera = new UniversalCamera("viewCamera", new Vector3(1, 0.2, -4), scene);
  camera.parent = humanoidRoot

  // run the main render loop
  engine.runRenderLoop(() => {
    humanoidRoot.rotate(new Vector3(0, 1, 0), 0.01, Space.WORLD)
    scene.render();
  });
}

main();
