import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, Color3, MeshBuilder, VectorMergerBlock } from "@babylonjs/core";
import {SkyMaterial} from "@babylonjs/materials";
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

function setupSky(scene){
  const skyMaterial = new SkyMaterial("skyMaterial", scene);
  skyMaterial.backFaceCulling = false;
  // skyMaterial.turbidity = 1
  // skyMaterial.luminance = 100
  skyMaterial.useSunPosition = true; // Do not set sun position from azimuth and inclination

  const skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
  skybox.material = skyMaterial;
  // skybox.infiniteDistance = true
  // skybox.renderingGroupId = 0;


  // TODO: figure out data structure for stopping and starting skyloop
  const dayLengthSec = 60 * 5
  let startTime = Date.now();
  let angle = 0
  function skyLoop(){
    const curTime = Date.now()
    const diffSec = (curTime - startTime) / 1000
    startTime = curTime
    angle += diffSec * 2 * Math.PI / dayLengthSec
    angle %= 2 * Math.PI
    skyMaterial.sunPosition = new Vector3(Math.cos(angle), Math.sin(angle), 0)
  }

  scene.registerAfterRender(skyLoop)
}

function main() {
  // create the canvas html element and attach it to the webpage
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.id = "gameCanvas";
  document.body.appendChild(canvas);

  // initialize babylon scene and engine
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  const sphere = Mesh.CreateSphere("sphere1", 16, 2, scene);
  const ground = Mesh.CreateGround("ground1", 12, 12, 0, scene);

  // Move the sphere upward 1/2 its height
  sphere.position.y = 1;

  const camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

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



  setupLighting(lightingConfig, scene);
  setupSky(scene)

  // run the main render loop
  engine.runRenderLoop(() => {
    scene.render();
  });

}

main();
