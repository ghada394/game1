import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.0/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.132.0/examples/jsm/loaders/FBXLoader.js';
import { entity } from './entity.js';
import { finite_state_machine } from './finite-state-machine.js';

export const player_entity = (() => {
  // تعريف الحالة
  class State {
    constructor(parent) {
      this._parent = parent;
    }
    Enter() {}
    Exit() {}
    Update() {}
  }

  class DeathState extends State {
    constructor(parent) {
      super(parent);
      this._action = null;
    }
    get Name() { return 'death'; }
    Enter(prevState) {
      this._action = this._parent._proxy._animations['death'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        this._action.reset();
        this._action.setLoop(THREE.LoopOnce, 1);
        this._action.clampWhenFinished = true;
        this._action.crossFadeFrom(prevAction, 0.2, true);
        this._action.play();
      } else {
        this._action.play();
      }
    }
    Exit() {}
    Update() {}
  }

  class AttackState extends State {
    constructor(parent) {
      super(parent);
      this._action = null;
      this._FinishedCallback = () => {
        this._Finished();
      };
    }
    get Name() { return 'attack'; }
    Enter(prevState) {
      this._action = this._parent._proxy._animations['attack'].action;
      const mixer = this._action.getMixer();
      mixer.addEventListener('finished', this._FinishedCallback);
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        this._action.reset();
        this._action.setLoop(THREE.LoopOnce, 1);
        this._action.clampWhenFinished = true;
        this._action.crossFadeFrom(prevAction, 0.2, true);
        this._action.play();
      } else {
        this._action.play();
      }
    }

    _Finished() {
      this._Cleanup();
      this._parent.SetState('idle');
    }

    _Cleanup() {
      if (this._action) {
        this._action.getMixer().removeEventListener('finished', this._FinishedCallback);
      }
    }

    Exit() {
      this._Cleanup();
    }

    Update() {}
  }

  class WalkState extends State {
    constructor(parent) {
      super(parent);
    }
    get Name() { return 'walk'; }
    Enter(prevState) {
      const curAction = this._parent._proxy._animations['walk'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        curAction.enabled = true;
        if (prevState.Name === 'run') {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
        }
        curAction.crossFadeFrom(prevAction, 0.1, true);
        curAction.play();
      } else {
        curAction.play();
      }
    }

    Exit() {}

    Update(timeElapsed, input) {
      if (input._keys.forward || input._keys.backward) {
        if (input._keys.shift) {
          this._parent.SetState('run');
        }
        return;
      }
      this._parent.SetState('idle');
    }
  }

  class RunState extends State {
    constructor(parent) {
      super(parent);
    }
    get Name() { return 'run'; }
    Enter(prevState) {
      const curAction = this._parent._proxy._animations['run'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        curAction.enabled = true;
        if (prevState.Name === 'walk') {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
        }
        curAction.crossFadeFrom(prevAction, 0.1, true);
        curAction.play();
      } else {
        curAction.play();
      }
    }

    Exit() {}

    Update(timeElapsed, input) {
      if (input._keys.forward || input._keys.backward) {
        if (!input._keys.shift) {
          this._parent.SetState('walk');
        }
        return;
      }
      this._parent.SetState('idle');
    }
  }

  class IdleState extends State {
    constructor(parent) {
      super(parent);
    }
    get Name() { return 'idle'; }
    Enter(prevState) {
      const idleAction = this._parent._proxy._animations['idle'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        idleAction.time = 0.0;
        idleAction.enabled = true;
        idleAction.setEffectiveTimeScale(1.0);
        idleAction.setEffectiveWeight(1.0);
        idleAction.crossFadeFrom(prevAction, 0.25, true);
        idleAction.play();
      } else {
        idleAction.play();
      }
    }

    Exit() {}

    Update(_, input) {
      if (input._keys.forward || input._keys.backward) {
        this._parent.SetState('walk');
      } else if (input._keys.space) {
        this._parent.SetState('attack');
      }
    }
  }

  // تعريف FSM (Finite State Machine) الخاص باللاعب
  class CharacterFSM extends finite_state_machine.FiniteStateMachine {
    constructor(proxy) {
      super();
      this._proxy = proxy;
      this._Init();
    }

    _Init() {
      this._AddState('idle', IdleState);
      this._AddState('walk', WalkState);
      this._AddState('run', RunState);
      this._AddState('attack', AttackState);
      this._AddState('death', DeathState);
    }
  }

  class BasicCharacterControllerProxy {
    constructor(animations) {
      this._animations = animations;
    }

    get animations() {
      return this._animations;
    }
  }

  class BasicCharacterController extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.125, 50.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();
      this._animations = {};
      this._stateMachine = new CharacterFSM(new BasicCharacterControllerProxy(this._animations));
      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _LoadModels() {
      const loader = new FBXLoader();
      loader.setPath('./resources/guard/');
      loader.load('castle_guard_01.fbx', (fbx) => {
        this._target = fbx;
        this._target.scale.setScalar(0.035);
        this._params.scene.add(this._target);
        this._bones = {};
        for (let b of this._target.children[1].skeleton.bones) {
          this._bones[b.name] = b;
        }
        this._target.traverse((c) => {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material && c.material.map) {
            c.material.map.encoding = THREE.sRGBEncoding;
          }
        });
        this.Broadcast({ topic: 'load.character', model: this._target, bones: this._bones });
        this._mixer = new THREE.AnimationMixer(this._target);

        const _OnLoad = (animName, anim) => {
          const clip = anim.animations[0];
          const action = this._mixer.clipAction(clip);
          this._animations[animName] = { clip: clip, action: action };
        };

        this._manager = new THREE.LoadingManager();
        this._manager.onLoad = () => {
          this._stateMachine.SetState('idle');
        };

        const loaderAnim = new FBXLoader(this._manager);
        loaderAnim.setPath('./resources/guard/');
        loaderAnim.load('Sword And Shield Idle.fbx', (a) => { _OnLoad('idle', a); });
        loaderAnim.load('Sword And Shield Run.fbx', (a) => { _OnLoad('run', a); });
        loaderAnim.load('Sword And Shield Walk.fbx', (a) => { _OnLoad('walk', a); });
        loaderAnim.load('Sword And Shield Slash.fbx', (a) => { _OnLoad('attack', a); });
        loaderAnim.load('Sword And Shield Death.fbx', (a) => { _OnLoad('death', a); });
      });
    }

    _FindIntersections(pos) {
      const _IsAlive = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        return !h || h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(5).filter((e) => _IsAlive(e));
      const collisions = [];
      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = Math.sqrt((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2);
        if (d <= 4) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) { return; }
      const input = this.GetComponent('BasicCharacterControllerInput');
      this._stateMachine.Update(timeInSeconds, input);

      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }

      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }

      const currentState = this._stateMachine._currentState;
      if (!['walk', 'run', 'idle'].includes(currentState.Name)) { return; }

      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(velocity.x * this._decceleration.x, velocity.y * this._decceleration.y, velocity.z * this._decceleration.z);
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));
      velocity.add(frameDecceleration);

      const controlObject = this._target;
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();
      const acc = this._acceleration.clone();

      if (input._keys.shift) {
        acc.multiplyScalar(2.0);
      }

      if (input._keys.forward) {
        velocity.z += acc.z * timeInSeconds;
      }

      if (input._keys.backward) {
        velocity.z -= acc.z * timeInSeconds;
      }

      if (input._keys.left) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
        _R.multiply(_Q);
      }

      if (input._keys.right) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
        _R.multiply(_Q);
      }

      controlObject.quaternion.copy(_R);

      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();

      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();
      sideways.multiplyScalar(velocity.x * timeInSeconds);

      forward.multiplyScalar(velocity.z * timeInSeconds);

      const pos = controlObject.position.clone();
      pos.add(forward);
      pos.add(sideways);

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }
  }

  return {
    BasicCharacterControllerProxy,
    BasicCharacterController,
  };
})();
