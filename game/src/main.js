//======================== استيراد المكتبات والموديلات اللازمة ========================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js'; // تأكد من استيراد FBXLoader هنا أيضًا

// استيراد مكونات اللعبة المختلفة من ملفات منفصلة
import { third_person_camera } from './third-person-camera.js';
import { entity_manager } from './entity-manager.js';
import { player_entity } from './player-entity.js';
import { entity } from './entity.js';
import { gltf_component } from './gltf-component.js';
import { health_component } from './health-component.js';
import { player_input } from './player-input.js';
import { npc_entity } from './npc-entity.js';
import { math } from './math.js';
import { spatial_hash_grid } from './spatial-hash-grid.js';
import { ui_controller } from './ui-controller.js';
import { health_bar } from './health-bar.js';
import { level_up_component } from './level-up-component.js';
import { quest_component } from './quest-component.js';
import { spatial_grid_controller } from './spatial-grid-controller.js';
import { inventory_controller } from './inventory-controller.js';
import { equip_weapon_component } from './equip-weapon-component.js';
import { attack_controller } from './attacker-controller.js';

// استيراد مكونات إضافية للمنزل، التاجر وواجهة العرض HUD
import { home_and_merchant_components } from './home_and_merchant_components.js';
import { HUD } from './hud.js';

//======================== شيدر السماء (Sky Shader) ========================
// الكود الخاص بالـ vertex shader
const _VS = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

// الكود الخاص بالـ fragment shader
const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

//======================== تعريف كلاس اللعبة الرئيسية ========================
class HackNSlashDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({ antialias: true });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);
    this._threejs.domElement.id = 'threejs-canvas';

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => this._OnWindowResize(), false);

    this._camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1.0, 1000.0);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xaaaaaa);

    this._entityManager = new entity_manager.EntityManager();
    this._entityManager.SetCamera(this._camera);

    this._LoadEnvironment();
    this._LoadPlayer();
    this._previousRAF = null;
    this._RAF();
  }

  _LoadEnvironment() {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this._scene.add(ambientLight);
  }

  _LoadPlayer() {
    const params = {
      scene: this._scene,
      camera: this._camera,
    };

    const player = new entity.Entity();
    player.AddComponent(new player_input.BasicCharacterControllerInput(params));
    player.AddComponent(new player_entity.BasicCharacterController(params));
    player.AddComponent(new equip_weapon_component.EquipWeapon({ anchor: 'RightHandIndex1' }));
    player.AddComponent(new inventory_controller.InventoryController(params));
    player.AddComponent(new health_component.HealthComponent({
      updateUI: true,
      health: 100,
      maxHealth: 100,
      strength: 10,
    }));

    this._entityManager.Add(player, 'player');

    const camera = new third_person_camera.ThirdPersonCamera({
      camera: this._camera,
      target: player,
    });
    this._thirdPersonCamera = camera;

    // HUD
    const ui = new entity.Entity();
    ui.AddComponent(new ui_controller.UIController());
    this._entityManager.Add(ui, 'ui');

    // مهمات
    const quest = new entity.Entity();
    quest.AddComponent(new quest_component.QuestComponent());
    this._entityManager.Add(quest, 'quest');

    // NPC للتجربة
    const npc = new entity.Entity();
    npc.AddComponent(new npc_entity.NPCController({ model: 'resources/npc/NPC.fbx' }));
    npc.SetPosition(new THREE.Vector3(10, 0, 10));
    this._entityManager.Add(npc);

    this._SetupTouchControls(); // ← ربط أزرار اللمس
  }

  _SetupTouchControls() {
    const input = this._entityManager.Get('player').GetComponent('BasicCharacterControllerInput');

    if (!input) return;

    const bind = (id, onPress, onRelease) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onPress();
      }, { passive: false });

      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        onRelease();
      }, { passive: false });
    };

    bind('btn-left',
      () => input._keys.left = true,
      () => input._keys.left = false
    );
    bind('btn-right',
      () => input._keys.right = true,
      () => input._keys.right = false
    );
    bind('btn-up',
      () => input._keys.forward = true,
      () => input._keys.forward = false
    );
    bind('btn-down',
      () => input._keys.backward = true,
      () => input._keys.backward = false
    );
    bind('btn-attack',
      () => input._keys.space = true,
      () => input._keys.space = false
    );
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    this._entityManager.Update(timeElapsedS);

    this._thirdPersonCamera.Update(timeElapsedS);
    this._threejs.render(this._scene, this._camera);
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new HackNSlashDemo();
});
