import {
  Space, Vector3, HemisphericLight, Mesh, Color3, CannonJSPlugin, MeshBuilder, StandardMaterial, PhysicsImpostor, MotorEnabledJoint, PhysicsJoint, Axis, UniversalCamera,
} from '@babylonjs/core';

class Character {
  humanoidRoot: Mesh;

  constructor(scene) {
    const humanoidMaterial = new StandardMaterial('humanoidMaterial', scene);
    humanoidMaterial.diffuseColor = new Color3(0, 1, 0);

    const humanoidRoot = MeshBuilder.CreateBox('humanoidRoot', { width: 0.5, height: 0.5, depth: 0.5 }, scene);
    humanoidRoot.position = new Vector3(0, 1.75, 0);
    humanoidRoot.material = humanoidMaterial;
    humanoidRoot.showBoundingBox = true;
    humanoidRoot.physicsImpostor = new PhysicsImpostor(
      humanoidRoot,
      PhysicsImpostor.BoxImpostor,
      {
        mass: 0,
        friction: 0.1,
        restitution: 0.1,
      }, scene,
    );

    const feet = MeshBuilder.CreateBox('player', { width: 1, height: 1, depth: 1 }, scene);
    feet.position = new Vector3(0, 0.5, 0);
    feet.material = humanoidMaterial;
    feet.physicsImpostor = new PhysicsImpostor(
      feet,
      PhysicsImpostor.BoxImpostor,
      {
        mass: 1,
        friction: 0.1,
        restitution: 0.1,
      }, scene,
    );

    const joint = new MotorEnabledJoint(PhysicsJoint.LockJoint, {
      mainPivot: new Vector3(0, 0, 0),
      connectedPivot: new Vector3(0, 5, 0),
      mainAxis: Axis.Y,
      nativeParams: {
        collision: false,
      },
    });

    humanoidRoot.physicsImpostor.addJoint(feet.physicsImpostor, joint);

    this.humanoidRoot = humanoidRoot;
  }

  move(x, z, deltaTimeMs) {
    const moveAmount = new Vector3(x, 0, z).normalize();
    moveAmount.normalize();
    moveAmount.scaleInPlace(deltaTimeMs / 500);
    console.log(moveAmount);
    this.humanoidRoot.translate(Axis.Z, moveAmount.z, Space.LOCAL);
    this.humanoidRoot.translate(Axis.X, moveAmount.x, Space.LOCAL);
  }

  // rotate character around y axis to look side to side
  rotate(yAngle) {
    this.humanoidRoot.rotate(new Vector3(0, 1, 0), yAngle, Space.WORLD);
  }
}

export default Character;
