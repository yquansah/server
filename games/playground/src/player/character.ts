import {
  RayHelper,
  Space,
  Scene,
  Vector3, Mesh, Color3, Quaternion, MeshBuilder, StandardMaterial, PhysicsImpostor, MotorEnabledJoint, PhysicsJoint, Axis, Ray, LinesMesh,
} from '@babylonjs/core';

enum CharacterState {
  Walking = 'WALKING',
  Idle = 'IDLE',
  Falling = 'FALLING',
  Jumping = 'JUMPING',
}

class Character {
  humanoidRoot: Mesh;

  hipHeight: number;

  state: CharacterState;

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
        mass: 1,
        friction: 0.1,
        restitution: 0.1,
      }, scene,
    );

    // const feet = MeshBuilder.CreateBox('player', { width: 1, height: 1, depth: 1 }, scene);
    // feet.position = new Vector3(0, 0.5, 0);
    // feet.material = humanoidMaterial;
    // feet.physicsImpostor = new PhysicsImpostor(
    //   feet,
    //   PhysicsImpostor.BoxImpostor,
    //   {
    //     mass: 1,
    //     friction: 0.1,
    //     restitution: 0.1,
    //   }, scene,
    // );

    // const joint = new MotorEnabledJoint(PhysicsJoint.LockJoint, {
    //   mainPivot: new Vector3(0, 0, 0),
    //   connectedPivot: new Vector3(0, 5, 0),
    //   mainAxis: Axis.Y,
    //   nativeParams: {
    //     stiffness: 1000000000,
    //     collision: false,
    //   },
    // });

    // humanoidRoot.physicsImpostor.addJoint(feet.physicsImpostor, joint);

    this.humanoidRoot = humanoidRoot;
    this.hipHeight = 1;
    this.state = CharacterState.Idle;
  }

  move(x: number, z: number, deltaTimeMs: number, scene: Scene) {
    let nextState;
    if (x === 0 && z === 0) {
      nextState = CharacterState.Idle;
    } else {
      nextState = CharacterState.Walking;
    }

    // reorient humanoid root
    const eulerRotation = this.humanoidRoot.rotationQuaternion.toEulerAngles();
    this.humanoidRoot.rotationQuaternion = Quaternion.FromEulerAngles(
      0, eulerRotation.y, 0,
    );

    // ray casting to see
    const boundingVectors = this.humanoidRoot.getBoundingInfo().boundingBox.vectorsWorld;
    const dimensions = boundingVectors[1].subtract(boundingVectors[0]);
    const height = dimensions.y;
    const point = this.humanoidRoot.position.add(
      new Vector3(0, -height / 2, 0),
    );
    const ray = new Ray(point, new Vector3(0, -1, 0), this.hipHeight);
    const hit = scene.pickWithRay(ray, (mesh) => {
      if (mesh === this.humanoidRoot || mesh instanceof LinesMesh) {
        return false;
      }
      return true;
    });
    if (hit.hit) {
      if (this.humanoidRoot.physicsImpostor.getLinearVelocity().y < 0) {
        this.humanoidRoot.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));
      }
      this.humanoidRoot.physicsImpostor.setAngularVelocity(new Vector3(0, 0, 0));

      // spring up humanoid root part
      const goalY = hit.pickedPoint.y + dimensions.y / 2 + this.hipHeight;

      // this.humanoidRoot.translate(Axis.Y, movementY, Space.WORLD);
      this.humanoidRoot.position.y = goalY;
    } else {
      nextState = CharacterState.Falling;
    }

    // set state
    if (this.state !== nextState) {
      console.log('change character state to:', nextState);
    }
    this.state = nextState;

    // move character
    const moveAmount = new Vector3(x, 0, z).normalize();
    moveAmount.normalize();
    moveAmount.scaleInPlace(deltaTimeMs / 500);
    this.humanoidRoot.translate(Axis.Z, moveAmount.z, Space.LOCAL);
    this.humanoidRoot.translate(Axis.X, moveAmount.x, Space.LOCAL);
  }

  jump() {
    if (this.state === CharacterState.Idle || this.state === CharacterState.Walking) {
      this.humanoidRoot.physicsImpostor.applyImpulse(
        new Vector3(0, 5, 0), this.humanoidRoot.getAbsolutePosition(),
      );
    }
  }

  // rotate character around y axis to look side to side
  rotate(yAngle) {
    this.humanoidRoot.rotate(new Vector3(0, 1, 0), yAngle, Space.WORLD);
  }
}

export default Character;
