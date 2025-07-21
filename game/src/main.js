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

    // حالة دورة النهار والليل
    this._isDay = true; // الحالة الحالية: نهار
    this._lastDayNightSwitch = performance.now(); // توقيت آخر تبديل بين النهار والليل
    this._cycleDuration = 60000; // مدة دورة النهار/الليل بالميلي ثانية (60 ثانية)

    this._monstersSpawned = false; // هل تم إنشاء الوحوش في الليل؟

    // تهيئة واجهة المستخدم (HUD)
    this._hud = new HUD();
    this._playerGold = 0; // الذهب المبدئي للاعب
    this._dayCount = 1; // عداد الأيام
  }

  //======================== تحديث دورة النهار والليل ========================
  _UpdateDayNightCycle() {
    const now = performance.now();

    if (now - this._lastDayNightSwitch >= this._cycleDuration) {
      this._isDay = !this._isDay;
      this._lastDayNightSwitch = now;

      if (this._isDay) {
        // إعدادات النهار
        this._sun.intensity = 1.0;
        this._scene.background = new THREE.Color(0x87ceeb);
        this._scene.fog.color.set(0x89b2eb);

        this._monstersSpawned = false;

        this._RemoveMonsters(); // إزالة الوحوش عند بدء النهار
        this._dayCount++; // زيادة عدد الأيام
      } else {
        // إعدادات الليل
        this._sun.intensity = 0.2;
        this._scene.background = new THREE.Color(0x000022);
        this._scene.fog.color.set(0x000022);

        this._SpawnMonstersIfNight(); // استدعاء إنشاء الوحوش بالليل
      }
    }
  }

  //======================== إزالة جميع الوحوش من المشهد ========================
  _RemoveMonsters() {
    // الحصول على جميع الكيانات التي تحتوي على NPCController
    const npcs = this._entityManager.Filter(e => e.GetComponent('NPCController'));

    for (const npc of npcs) {
        // إزالة النموذج من المشهد
        const modelComponent = npc.GetComponent('NPCController');
        if (modelComponent && modelComponent._target) {
            this._scene.remove(modelComponent._target);
        }
        // إزالة الكيان من مدير الكيانات
        this._entityManager.Remove(npc);
    }
}


  //======================== إنشاء الوحوش إذا كان الوقت ليلاً ========================
  _SpawnMonstersIfNight() {
  if (this._monstersSpawned) return;
  this._monstersSpawned = true;

  
  for (let i = 0; i < 10; ++i) {
    const monsters = [
      { resourceName: 'Ghost.fbx', resourceTexture: 'Ghost_Texture.png' },
      { resourceName: 'Alien.fbx', resourceTexture: 'Alien_Texture.png' },
      { resourceName: 'Skull.fbx', resourceTexture: 'Skull_Texture.png' },
      { resourceName: 'GreenDemon.fbx', resourceTexture: 'GreenDemon_Texture.png' },
      { resourceName: 'Cyclops.fbx', resourceTexture: 'Cyclops_Texture.png' },
      { resourceName: 'Cactus.fbx', resourceTexture: 'Cactus_Texture.png' },
    ];
    const m = monsters[math.rand_int(0, monsters.length - 1)];

    // باقي الكود لإنشاء الوحش
    const npc = new entity.Entity();
    npc.AddComponent(new npc_entity.NPCController({
      camera: this._camera,
      scene: this._scene,
      resourceName: m.resourceName,
      resourceTexture: m.resourceTexture,
    }));
    npc.AddComponent(new health_component.HealthComponent({
      health: 50,
      maxHealth: 50,
      strength: 2,
      wisdomness: 2,
      benchpress: 3,
      curl: 1,
      experience: 0,
      level: 1,
      camera: this._camera,
      scene: this._scene,
    }));
    npc.AddComponent(new spatial_grid_controller.SpatialGridController({ grid: this._grid }));
    npc.AddComponent(new health_bar.HealthBar({
      parent: this._scene,
      camera: this._camera,
    }));
    npc.AddComponent(new attack_controller.AttackController({ timing: 0.35 }));
    npc.SetPosition(new THREE.Vector3(
      (Math.random() * 2 - 1) * 500,
      0,
      (Math.random() * 2 - 1) * 500));
    this._entityManager.Add(npc);
  }
}


  //======================== تهيئة المشهد، الكاميرا، الإضاءة، وعناصر العالم ========================
  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.gammaFactor = 2.2;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);
    this._threejs.domElement.id = 'threejs';

    document.getElementById('container').appendChild(this._threejs.domElement);

    this._threejs.domElement.addEventListener('click', () => {
      this._threejs.domElement.requestPointerLock();
    });

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    // إعداد الكاميرا الرئيسية
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 10000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(0, 10, 20);

    // إنشاء المشهد وإعداد الخلفية والضباب
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xFFFFFF);
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

    // إعداد مصدر الضوء (الشمس)
    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-10, 500, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    this._sun = light;

    // الأرضية الرئيسية
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1e601c,
      }));
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    //======================== حذف إنشاء الجدران والسقف والباب (لم يتم تضمينه هنا) ========================

    // إنشاء مدير الكيانات
    this._entityManager = new entity_manager.EntityManager();

    // إنشاء الشبكة المكانية لتسهيل الحسابات
    this._grid = new spatial_hash_grid.SpatialHashGrid(
      [[-1000, -1000], [1000, 1000]], [100, 100]);

    // تحميل باقي المكونات المختلفة من وحدات منفصلة
    this._LoadControllers();
    this._LoadPlayer();
    this._LoadFoliage();
    this._LoadClouds();
    this._LoadSky();
    this._LoadHomeAndMerchant();

    //======================== تحميل عالم الغابة والكوخ ========================
    // تحميل نموذج الغابة
    const forestWorld = new entity.Entity();
    forestWorld.AddComponent(new gltf_component.StaticModelComponent({
      scene: this._scene,
      resourcePath: 'resources/world/forest/',
      resourceName: '/scene.gltf',
      position: new THREE.Vector3(0, 0, 0),
      scale: 100,
      receiveShadow: true,
      castShadow: true,
    }));
    forestWorld.SetPosition(new THREE.Vector3(0, 0, 0));
    this._entityManager.Add(forestWorld, 'forestWorld');

    // تحميل نموذج الكوخ
    const forestHut = new entity.Entity();
    forestHut.AddComponent(new gltf_component.StaticModelComponent({
      scene: this._scene,
      resourcePath: 'resources/world/forest_hut/',
      resourceName: 'scene.gltf',
      position: new THREE.Vector3(0, 0, -5),
      scale: 10,
      receiveShadow: true,
      castShadow: true,
    }));
    forestHut.SetPosition(new THREE.Vector3(0, 0, -5));
    this._entityManager.Add(forestHut, 'forestHut');

    this._previousRAF = null;
    this._RAF();
  }

  //======================== تحميل عناصر واجهة المستخدم (UI) ========================
  _LoadControllers() {
    const ui = new entity.Entity();
    ui.AddComponent(new ui_controller.UIController());
    this._entityManager.Add(ui, 'ui');
  }

  //======================== إعداد السماء ========================
  _LoadSky() {
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFFF, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    this._scene.add(hemiLight);

    const uniforms = {
      "topColor": { value: new THREE.Color(0x0077ff) },
      "bottomColor": { value: new THREE.Color(0xffffff) },
      "offset": { value: 33 },
      "exponent": { value: 0.6 }
    };
    uniforms["topColor"].value.copy(hemiLight.color);

    this._scene.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(sky);
  }

  //======================== تحميل السحب ========================
  _LoadClouds() {
    for (let i = 0; i < 1; ++i) {
      const index = math.rand_int(1, 3);
      const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        100,
        (Math.random() * 2.0 - 1.0) * 500);

      const e = new entity.Entity();
      e.AddComponent(new gltf_component.StaticModelComponent({
        scene: this._scene,
        resourcePath: './resources/nature2/GLTF/',
        resourceName: 'Cloud' + index + '.glb',
        position: pos,
        scale: Math.random() * 5 + 10,
        emissive: new THREE.Color(0x808080),
      }));
      e.SetPosition(pos);
      this._entityManager.Add(e);
      e.SetActive(false);
    }
  }

  //======================== تحميل الأشجار والنباتات ========================
  _LoadFoliage() {
    for (let i = 0; i < 5; ++i) {
      const names = [
        'CommonTree_Dead', 'CommonTree',
        'BirchTree', 'BirchTree_Dead',
        'Willow', 'Willow_Dead',
        'PineTree',
      ];
      const name = names[math.rand_int(0, names.length - 1)];
      const index = math.rand_int(1, 5);

      const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        0,
        (Math.random() * 2.0 - 1.0) * 500);

      const e = new entity.Entity();
      e.AddComponent(new gltf_component.StaticModelComponent({
        scene: this._scene,
        resourcePath: './resources/nature/FBX/',
        resourceName: name + '_' + index + '.fbx',
        scale: 0.25,
        emissive: new THREE.Color(0x000000),
        specular: new THREE.Color(0x000000),
        receiveShadow: true,
        castShadow: true,
      }));
      e.AddComponent(
        new spatial_grid_controller.SpatialGridController({ grid: this._grid }));
      e.SetPosition(pos);
      this._entityManager.Add(e);
      e.SetActive(false);
    }
  }

  //======================== تحميل المنزل والتاجر ========================
  _LoadHomeAndMerchant() {
    // تحديث ذهب اللاعب
    const updatePlayerGold = (amount) => {
      this._playerGold += amount;
      console.log(`الذهب الحالي: ${this._playerGold}`);
    };

    // ترقية المنزل
    const upgradeHome = () => {
      const homeEntity = this._entityManager.Get('home');
      if (homeEntity) {
        homeEntity.GetComponent('HomeComponent').upgradeHome();
      }
    };

    // إضافة عنصر للمخزون
    const addInventoryItem = (itemName) => {
      const player = this._entityManager.Get('player');
      if (player) {
        player.Broadcast({
          topic: 'inventory.add',
          value: itemName,
          added: false,
        });
      }
    };

    // إنشاء كيان المنزل مع مكون HomeComponent
    const home = new entity.Entity();
    home.AddComponent(new home_and_merchant_components.HomeComponent({
      scene: this._scene,
      playerGold: this._playerGold,
      updatePlayerGold: updatePlayerGold,
      upgradeHome: upgradeHome,
    }));
    this._entityManager.Add(home, 'home');

    // إنشاء كيان التاجر مع مكون MerchantComponent
    const merchant = new entity.Entity();
    merchant.AddComponent(new home_and_merchant_components.MerchantComponent({
      scene: this._scene,
      playerGold: this._playerGold,
      updatePlayerGold: updatePlayerGold,
      upgradeHome: upgradeHome,
      addInventoryItem: addInventoryItem,
    }));
    this._entityManager.Add(merchant, 'merchant');
  }

  //======================== تحميل اللاعب والمكونات المرتبطة ========================
  _LoadPlayer() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };

    // مكون مسؤول عن إضافة نظام ترقية للاعب
    const levelUpSpawner = new entity.Entity();
    levelUpSpawner.AddComponent(new level_up_component.LevelUpComponentSpawner({
      camera: this._camera,
      scene: this._scene,
    }));
    this._entityManager.Add(levelUpSpawner, 'level-up-spawner');

    // إنشاء كيان اللاعب وإضافة مكونات تحكم، صحة، سلاح، مخزون، هجوم، وغيرها
    const player = new entity.Entity();
    player.AddComponent(new player_input.BasicCharacterControllerInput(params));
    player.AddComponent(new player_entity.BasicCharacterController(params));
    player.AddComponent(
      new equip_weapon_component.EquipWeapon({ anchor: 'RightHandIndex1' }));
    player.AddComponent(new inventory_controller.InventoryController(params));
    player.AddComponent(new health_component.HealthComponent({
      updateUI: true,
      health: 100,
      maxHealth: 100,
      strength: 50,
      wisdomness: 5,
      benchpress: 20,
      curl: 100,
      experience: 0,
      level: 1,
    }));
    player.AddComponent(
      new spatial_grid_controller.SpatialGridController({ grid: this._grid }));
    player.AddComponent(new attack_controller.AttackController({ timing: 0.7 }));
    this._entityManager.Add(player, 'player');

    // إضافة كاميرا تتبع للاعب
    const camera = new entity.Entity();
    camera.AddComponent(
      new third_person_camera.ThirdPersonCamera({
        camera: this._camera,
        target: this._entityManager.Get('player')
      }));
    this._entityManager.Add(camera, 'player-camera');
  }

  //======================== تحديث حجم الكاميرا عند تغيير حجم النافذة ========================
  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  //======================== تحديث موقع الشمس لتتبع اللاعب ========================
  _UpdateSun() {
    const player = this._entityManager.Get('player');
    const pos = player._position;

    this._sun.position.copy(pos);
    this._sun.position.add(new THREE.Vector3(-10, 500, -10));
    this._sun.target.position.copy(pos);
    this._sun.updateMatrixWorld();
    this._sun.target.updateMatrixWorld();
  }

  //======================== الحلقة الرئيسية للرسم والتحديث ========================
  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  //======================== تحديث اللعبة في كل إطار ========================
  _Step(timeElapsed) {
    // تحديد الوقت المستغرق بالثواني، مع حد أقصى 1/30 ثانية
    const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);
    this._UpdateSun();
    this._UpdateDayNightCycle();
    this._entityManager.Update(timeElapsedS);

    // تحديث معلومات واجهة المستخدم (HUD)
    const playerHealthComponent = this._entityManager.Get('player')?.GetComponent('HealthComponent');
    const playerHealth = playerHealthComponent ? playerHealthComponent._health : 0;
    const numEnemies = this._entityManager.Filter(e => e.GetComponent('NPCController')).length;

    this._hud.update({
      health: playerHealth,
      day: this._dayCount,
      enemies: numEnemies,
      gold: this._playerGold,
    });
  }
}

//======================== نقطة الدخول: بدء اللعبة بعد تحميل الصفحة ========================
let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new HackNSlashDemo();
});
