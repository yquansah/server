import {
  Vector3, Mesh,
} from '@babylonjs/core';
import { SkyMaterial } from '@babylonjs/materials';

class Sky {
  constructor(scene) {
    const skyMaterial = new SkyMaterial('skyMaterial', scene);
    skyMaterial.backFaceCulling = false;
    // skyMaterial.turbidity = 1
    // skyMaterial.luminance = 100
    skyMaterial.useSunPosition = true; // Do not set sun position from azimuth and inclination

    const skybox = Mesh.CreateBox('skyBox', 1000.0, scene);
    skybox.material = skyMaterial;
    // skybox.infiniteDistance = true
    // skybox.renderingGroupId = 0;

    // TODO: figure out data structure for stopping and starting skyloop
    const dayLengthSec = 60 * 5;
    let startTime = Date.now();
    let angle = 0;
    function skyLoop() {
      const curTime = Date.now();
      const diffSec = (curTime - startTime) / 1000;
      startTime = curTime;
      angle += diffSec * 2 * Math.PI / dayLengthSec;
      angle %= 2 * Math.PI;
      skyMaterial.sunPosition = new Vector3(Math.cos(angle), Math.sin(angle), 0);
    }

    scene.registerAfterRender(skyLoop);
  }
}

export default Sky;
