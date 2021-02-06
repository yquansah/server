import {
  MeshBuilder, Vector3, UniversalCamera, Space, TransformNode,
} from '@babylonjs/core';

class ThirdPersonCamera {
  xAngle: number;

  cameraTarget: any;

  scene: any;

  constructor(scene) {
    this.scene = scene;
  }

  initialize(character) {
    const { scene } = this;
    const cameraTarget = new TransformNode('cameraTarget');
    cameraTarget.position = new Vector3(0.75, 0, 0);
    cameraTarget.parent = character.humanoidRoot;

    const camera = new UniversalCamera('viewCamera', new Vector3(0, 0, -7), scene);
    camera.parent = cameraTarget;

    this.cameraTarget = cameraTarget;
    this.xAngle = 0;
  }

  // rotate camera on x axis to look down and up
  rotate(xAngleDiff) {
    // rotate camera on x axis to look down and up
    if (this.xAngle <= Math.PI / 2 && this.xAngle >= -Math.PI / 2) {
      this.cameraTarget.rotate(new Vector3(1, 0, 0), xAngleDiff, Space.LOCAL);
    } else {
      this.xAngle = Math.max(Math.min(this.xAngle, Math.PI / 2), -Math.PI / 2);
    }
  }
}

export default ThirdPersonCamera;
