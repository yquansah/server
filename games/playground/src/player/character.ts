import {
  RayHelper,
  Space,
  Scene, Scalar,
  Vector3, Mesh, Color3, Quaternion, MeshBuilder, StandardMaterial, PhysicsImpostor, MotorEnabledJoint, PhysicsJoint, Axis, Ray, LinesMesh, SceneLoader, AnimationGroup,
} from '@babylonjs/core';
import {
  getDimensions, getGroupDimensions, StateEmitter,
} from './util';

enum CharacterState {
  Walking = 'WALKING',
  Idle = 'IDLE',
  Falling = 'FALLING',
  Jumping = 'JUMPING',
  Running = 'Running',
}

class Character {
  humanoidRoot: Mesh;

  hipHeight: number;

  events: StateEmitter;

  private _state: CharacterState;

  scene: any;

  camera: any;

  dimensions: Vector3;

  humanoidRootDims: Vector3;

  constructor(scene, camera) {
    this.events = new StateEmitter();
    this.camera = camera;

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

    this.scene = scene;
    this.state = CharacterState.Idle;
  }

  private initializeHumanoidRoot() {
    const { scene } = this;
    const humanoidMaterial = new StandardMaterial('humanoidMaterial', scene);
    humanoidMaterial.alpha = 0;

    const humanoidRoot = MeshBuilder.CreateBox('humanoidRoot',
      {
        width: this.dimensions.x,
        height: this.dimensions.y - this.hipHeight,
        depth: this.dimensions.z,
      },
      scene);
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
    this.humanoidRootDims = getDimensions(humanoidRoot);
    this.humanoidRoot = humanoidRoot;
  }

  initializeCharacter(characterMeshes) {
    const { scene } = this;
    const meshRoot = characterMeshes[0];
    this.dimensions = getGroupDimensions(meshRoot);
    this.hipHeight = this.dimensions.y / 4;
    this.initializeHumanoidRoot();

    meshRoot.parent = this.humanoidRoot;
    meshRoot.position = new Vector3(0, (-this.dimensions.y - this.hipHeight) / 2, 0);

    this.camera.initialize(this);

    // Initialize override animations, turn on idle by default
    const idleAnim = scene.animationGroups.find((a) => a.name === 'idle');
    const idleParam = { name: 'Idle', anim: idleAnim, weight: 1 };
    idleAnim.play(true);
    idleAnim.setWeightForAllAnimatables(1);

    const walkAnim = scene.animationGroups.find((a) => a.name === 'walk');
    const walkParam = { name: 'Walk', anim: walkAnim, weight: 0 };
    walkAnim.play(true);
    walkAnim.setWeightForAllAnimatables(0);

    const runAnim = scene.animationGroups.find((a) => a.name === 'run');
    const runParam = { name: 'Run', anim: runAnim, weight: 0 };
    runAnim.play(true);
    runAnim.setWeightForAllAnimatables(0);

    let currentParam = idleParam;
    function onBeforeAnimation() {
      const weightInc = 0.1;
      // Increment the weight of the current override animation
      if (currentParam) {
        currentParam.weight = Scalar.Clamp(currentParam.weight + weightInc, 0, 1);
        currentParam.anim.setWeightForAllAnimatables(currentParam.weight);
      }

      // Decrement the weight of all override animations that aren't current
      if (currentParam !== idleParam) {
        idleParam.weight = Scalar.Clamp(idleParam.weight - weightInc, 0, 1);
        idleParam.anim.setWeightForAllAnimatables(idleParam.weight);
      }

      if (currentParam !== walkParam) {
        walkParam.weight = Scalar.Clamp(walkParam.weight - weightInc, 0, 1);
        walkParam.anim.setWeightForAllAnimatables(walkParam.weight);
      }

      if (currentParam !== runParam) {
        runParam.weight = Scalar.Clamp(runParam.weight - weightInc, 0, 1);
        runParam.anim.setWeightForAllAnimatables(runParam.weight);
      }

      // Remove the callback the current animation weight reaches 1 or
      // when all override animations reach 0 when current is undefined
      if ((currentParam && currentParam.weight === 1)
        || (idleParam.weight === 0 && walkParam.weight === 0 && runParam.weight === 0)) {
        scene.onBeforeAnimationsObservable.removeCallback(onBeforeAnimation);
      }
    }

    this.events.on('state', (state, lastState) => {
      scene.onBeforeAnimationsObservable.removeCallback(onBeforeAnimation);

      if (this.state === CharacterState.Idle) {
        currentParam = idleParam;
      } else if (this.state === CharacterState.Falling) {
        currentParam = idleParam;
      } else if (this.state === CharacterState.Running) {
        currentParam = runParam;
      } else if (this.state === CharacterState.Walking) {
        currentParam = walkParam;
      }

      scene.onBeforeAnimationsObservable.add(onBeforeAnimation);
      console.log(`changing state: ${state} ${lastState}`);
    });
  }

  checkOnGround() {
    const width = this.humanoidRootDims.x;
    const depth = this.humanoidRootDims.z;
    const height = this.humanoidRootDims.y;
    const buffer = height / 100;
    for (let xScale = -1; xScale <= 1; xScale += 1) {
      for (let zScale = -1; zScale <= 1; zScale += 1) {
        const ray = new Ray(
          this.humanoidRoot.position.add(
            new Vector3(xScale * 0.5 * width, 0 - height / 2 + buffer, zScale * 0.5 * depth),
          ),
          new Vector3(0, -1, 0), this.hipHeight + buffer,
        );
        const curHit = this.scene.pickWithRay(ray, (mesh) => {
          if (mesh === this.humanoidRoot || mesh.isDescendantOf(this.humanoidRoot)) {
            return false;
          }
          return true;
        });
        if (curHit.hit) {
          return true;
        }
      }
    }
    return false;
  }

  getGoalY() {
    const height = this.humanoidRootDims.y;
    const buffer = height / 100;
    const ray = new Ray(
      this.humanoidRoot.position.add(
        new Vector3(0, 0 - height / 2 + buffer, 0),
      ),
      new Vector3(0, -1, 0), this.hipHeight + buffer,
    );
    const curHit = this.scene.pickWithRay(ray, (mesh) => {
      if (mesh === this.humanoidRoot || mesh.isDescendantOf(this.humanoidRoot)) {
        return false;
      }
      return true;
    });
    if (curHit.hit) {
      return curHit.pickedPoint.y + this.hipHeight + height / 2;
    }
    return null;
  }

  move(x: number, z: number, deltaTimeMs: number) {
    let nextState;
    if (x === 0 && z === 0) {
      nextState = CharacterState.Idle;
    } else {
      nextState = CharacterState.Walking;
    }

    // set the humanoid speed
    this.humanoidRoot.physicsImpostor.setAngularVelocity(new Vector3(0, 0, 0));
    this.humanoidRoot.physicsImpostor.setLinearVelocity(
      new Vector3(0, this.humanoidRoot.physicsImpostor.getLinearVelocity().y, 0),
    );

    // reorient humanoid root
    const eulerRotation = this.humanoidRoot.rotationQuaternion.toEulerAngles();
    this.humanoidRoot.rotationQuaternion = Quaternion.FromEulerAngles(
      0, eulerRotation.y, 0,
    );

    // ray casting from all 4 corners and center to characterize as falling
    const isOnGround = this.checkOnGround();
    if (isOnGround) {
      const goalY = this.getGoalY();
      if (goalY) {
        if (this.humanoidRoot.physicsImpostor.getLinearVelocity().y < 0) {
          this.humanoidRoot.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));

          // spring up humanoid root part
          const diff = goalY - this.humanoidRoot.position.y;

          // this.humanoidRoot.translate(Axis.Y, movementY, Space.WORLD);
          this.humanoidRoot.position.y += diff * 0.3;
        }
      }
    } else {
      nextState = CharacterState.Falling;
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

  get state() {
    return this._state;
  }

  set state(nextState: CharacterState) {
    const lastState = this._state;
    this._state = nextState;

    if (lastState !== nextState) {
      this.events.emit('state', nextState, lastState);
    }
  }
}

export default Character;
