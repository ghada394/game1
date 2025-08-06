// (الكود الكامل كما في ملفك، مع الإضافات) 
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import {entity} from './entity.js';
import {finite_state_machine} from './finite-state-machine.js';
import {player_state} from './player-state.js';


export const player_entity = (() => {

  class CharacterFSM extends finite_state_machine.FiniteStateMachine {
    constructor(proxy) {
      super();
      this._proxy = proxy;
      this._Init();
    }
  
    _Init() {
      this._AddState('idle', player_state.IdleState);
      this._AddState('walk', player_state.WalkState);
      this._AddState('run', player_state.RunState);
      this._AddState('attack', player_state.AttackState);
      this._AddState('death', player_state.DeathState);
    }
  };
  
  class BasicCharacterControllerProxy {
    constructor(animations) {
      this._animations = animations;
    }
  
    get animations() {
      return this._animations;
    }
  };


  class BasicCharacterController extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.125, 200.0); // سسسسسررررررعهههههههههه

      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();
  
      this._animations = {};
      this._stateMachine = new CharacterFSM(
          new BasicCharacterControllerProxy(this._animations));
  
      this._LoadModels();

      // << ADDED: player data (inventory + gold + helper methods)
      // هذا الكائن يمثل "واجهة" اللاعب التي يمكن للتاجر أو واجهات UI استخدامها
      this._playerData = {
        gold: 100, // القيمة الافتراضية — عدّلها عند تهيئة اللاعب إذا أردت
        inventory: [],

        // callback hooks (يمكنك إسناد دوال هنا لتحديث HUD عند التغيير)
        onInventoryChanged: null,
        onGoldChanged: null,

        addItem: (item) => {
          // item: { id, name, qty, data }
          const existing = this._playerData.inventory.find(i => i.id === item.id);
          if (existing) {
            existing.qty = (existing.qty || 1) + (item.qty || 1);
          } else {
            this._playerData.inventory.push(Object.assign({}, item, { qty: item.qty || 1 }));
          }
          // نداء اختياري لتحديث الواجهة
          if (typeof this._playerData.onInventoryChanged === 'function') {
            this._playerData.onInventoryChanged(this._playerData.inventory);
          }
          console.log(`🧰 تمت الإضافة: ${item.name}. المخزون الآن: ${this._playerData.inventory.map(i=>`${i.name} x${i.qty}`).join(', ')}`);
        },

        hasGold: (amount) => {
          return this._playerData.gold >= amount;
        },

        spendGold: (amount) => {
          if (!this._playerData.gold || this._playerData.gold < amount) return false;
          this._playerData.gold -= amount;
          if (typeof this._playerData.onGoldChanged === 'function') {
            this._playerData.onGoldChanged(this._playerData.gold);
          }
          console.log(`💰 خصم ${amount} ذهب. المتبقي: ${this._playerData.gold}`);
          return true;
        }
      };
      // >> ADDED
    }

    // << ADDED: دالة لإرجاع "واجهة اللاعب" للاستخدام الخارجي (التاجر، UI، الخ)
    getPlayer() {
      return this._playerData;
    }
    // >> ADDED

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });

      // << ADDED: الاستماع لبث 'input.interact_merchant'
      // عند الضغط على T (الذي يبعث هذا الحدث في player-input)، نحاول فتح المتجر
      this._RegisterHandler('input.interact_merchant', (m) => {
        try {
          // أولاً: نتحقق إذا في كائن shop (الذي قد تكون أنشأته من merchant.js المقترح)
          if (window.shop && typeof window.shop.openFor === 'function') {
            window.shop.openFor(this.getPlayer());
            console.log('🧾 فتح متجر عبر window.shop.openFor(...)');
            return;
          }

          // إذا كانت هناك دالة openShop() عالمية قديمة (نسختك البسيطة)
          if (typeof window.openShop === 'function') {
            // في النسخة القديمة openShop() لا تأخذ اللاعب كوسيط. سنقوم بنداءها.
            window.openShop();
            console.log('🧾 فتح المتجر عبر openShop() (دالة قديمة)');
            return;
          }

          // إذا يوجد كائن merchant مع موقع، نتحقق المسافة ثم نفتح المتجر عبر openShop (أو نطبع الارشادات)
          if (window.merchant) {
            // حساب المسافة بين لاعب (this._position) وإحداثيات المتجر (merchant.x, merchant.z)
            const mx = window.merchant.x !== undefined ? window.merchant.x : null;
            const mz = window.merchant.z !== undefined ? window.merchant.z : null;
            if (mx !== null && mz !== null) {
              const dx = this._position.x - mx;
              const dz = this._position.z - mz;
              const dist = Math.sqrt(dx*dx + dz*dz);
              const ALLOWED_DIST = 6.0; // مسافة التفاعل المسموح بها (قابلة للتعديل)
              if (dist <= ALLOWED_DIST) {
                // إذا كانت دالة openShop موجودة نستخدمها
                if (typeof window.openShop === 'function') {
                  window.openShop();
                  console.log('🧾 فتح المتجر عبر openShop() (قريب من التاجر)');
                  return;
                }
                // بخلاف ذلك، نعرض قائمة التاجر في الكونسول (نسخة قديمة)
                console.log('📦 فتح المتجر - (مرر player إلى واجهة التاجر إن أردت)');
                if (typeof window.buyItem === 'function') {
                  // نخبر المستخدم بكيفية الشراء عبر الدالة القديمة
                  console.log('لاستكمال الشراء، استخدم buyItem(index) أو buyItemById(id).');
                }
                return;
              } else {
                console.log(`📍 بعيد عن التاجر (المسافة ${dist.toFixed(2)}). اقترب حتى تفتح المتجر (≤ ${ALLOWED_DIST}).`);
                return;
              }
            }
          }

          // إن لم نجد آلية فتح المتجر، نعطي إرشادات للمطور
          console.log("⚠️ لا يوجد نظام متجر معرف. للتكامل: إما عرف global `shop` (مع openFor(player)) أو global `openShop()` أو object `merchant` ودالة `openShop()`.");
        } catch (err) {
          console.error("خطأ عند محاولة فتح المتجر:", err);
        }
      });
      // >> ADDED
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _LoadModels() {
      const loader = new FBXLoader();
      loader.setPath('./resources/guard/');
      loader.load('errrr.fbx', (fbx) => {
        this._target = fbx;
        this._target.scale.setScalar(0.035);
        this._params.scene.add(this._target);
  
        this._bones = {};

        for (let b of this._target.children[1].skeleton.bones) {
          this._bones[b.name] = b;
        }

        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material && c.material.map) {
            c.material.map.encoding = THREE.sRGBEncoding;
          }
        });

        this.Broadcast({
            topic: 'load.character',
            model: this._target,
            bones: this._bones,
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        const _OnLoad = (animName, anim) => {
          const clip = anim.animations[0];
          const action = this._mixer.clipAction(clip);
    
          this._animations[animName] = {
            clip: clip,
            action: action,
          };
        };

        this._manager = new THREE.LoadingManager();
        this._manager.onLoad = () => {
          this._stateMachine.SetState('idle');
        };
  
        const loader = new FBXLoader(this._manager);
        loader.setPath('./resources/guard/');
        loader.load('Sword And Shield Idle.fbx', (a) => { _OnLoad('idle', a); });
        loader.load('Sword And Shield Run.fbx', (a) => { _OnLoad('run', a); });
        loader.load('Sword And Shield Walk.fbx', (a) => { _OnLoad('walk', a); });
        loader.load('Sword And Shield Slash.fbx', (a) => { _OnLoad('attack', a); });
        loader.load('Sword And Shield Death.fbx', (a) => { _OnLoad('death', a); });
      });
    }

    _FindIntersections(pos) {
      const _IsAlive = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return true;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(5).filter(e => _IsAlive(e));
      const collisions = [];

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // HARDCODED
        if (d <= 4) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      const input = this.GetComponent('BasicCharacterControllerInput');
      this._stateMachine.Update(timeInSeconds, input);

      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }

      const currentState = this._stateMachine._currentState;
      if (currentState.Name != 'walk' &&
          currentState.Name != 'run' &&
          currentState.Name != 'idle') {
        return;
      }
    
      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(
          velocity.x * this._decceleration.x,
          velocity.y * this._decceleration.y,
          velocity.z * this._decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
          Math.abs(frameDecceleration.z), Math.abs(velocity.z));
  
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
  };
  
  return {
      BasicCharacterControllerProxy: BasicCharacterControllerProxy,
      BasicCharacterController: BasicCharacterController,
  };

})();
