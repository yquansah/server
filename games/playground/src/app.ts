import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, Color3, SceneLoader, CannonJSPlugin } from "@babylonjs/core";
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
  const ground = Mesh.CreateGround("ground1", 12, 12, 0, scene);
}

function setupCharacter(scene){

}

function setupCamera(scene, canvas){
  const camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);


  // TODO NEXT: setup character
  SceneLoader.ImportMesh("", "./assets/", "Xbot.glb", scene, function onSuccess(newMeshes) {

  })
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
  scene.enablePhysics(new Vector3(20,0,0),new CannonJSPlugin(true, 100, cannon))

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
  setupCamera(scene, canvas)
  setupLighting(lightingConfig, scene);
  setupSky(scene)
  setupCharacter(scene)

  // run the main render loop
  engine.runRenderLoop(() => {
    scene.render();
  });
}

main();
