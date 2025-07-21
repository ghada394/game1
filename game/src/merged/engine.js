// استيراد المكتبات الأساسية
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.142.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/js/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/js/loaders/FBXLoader.js';

// استيراد المكونات الخاصة بالمشروع
import { third_person_camera } from './merged/player/third-person-camera.js';
import { entity_manager } from './merged/core/entity-manager.js';
import { player_entity } from './merged/player/player-entity.js';
import { entity } from './merged/core/entity.js';
import { gltf_component } from './merged/components/gltf-component.js';
import { health_component } from './merged/components/health-component.js';
import { player_input } from './merged/player/player-input.js';
import { npc_entity } from './merged/world/npc-entity.js';
import { math } from './merged/core/math.js';
import { spatial_hash_grid } from './merged/engine/spatial-hash-grid.js';
import { ui_controller } from './merged/ui/ui-controller.js';
import { health_bar } from './merged/ui/health-bar.js';
import { level_up_component } from './merged/effects/level-up-component.js';
import { quest_component } from './merged/home/quest-component.js';
import { spatial_grid_controller } from './merged/engine/spatial-grid-controller.js';
import { inventory_controller } from './merged/components/inventory-controller.js';
import { equip_weapon_component } from './merged/combat/equip-weapon-component.js';
import { attack_controller } from './merged/combat/attacker-controller.js';

// شادر (Shader) السماء
const _VS = `
varying vec3 vWorldPosition;
void main(){
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;
void main(){
    float h = normalize(vWorldPosition + offset).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
}`;

class HackNSlashDemo {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
        // إعداد الـ Renderer
        this._threejs = new THREE.WebGLRenderer({ antialias: true });
        this._threejs.outputEncoding = THREE.sRGBEncoding;
        this._threejs.gammaFactor = 2.2;
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);
        this._threejs.domElement.id = 'threejs';
        document.getElementById('container').appendChild(this._threejs.domElement);
        window.addEventListener('resize', () => { this._OnWindowResize(); }, false);

        // إعداد الكاميرا
        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 10000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(25, 10, 25);

        // إعداد المشهد
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xFFFFFF);
        this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

        // إضافة الإضاءة
        this._AddLighting();

        // إضافة الـ Entity Manager و Spatial Hash Grid
        this._entityManager = new entity_manager.EntityManager();
        this._grid = new spatial_hash_grid.SpatialHashGrid([[-1000, -1000], [1000, 1000]], [100, 100]);

        // تحميل الكائنات
        this._LoadControllers();
        this._LoadPlayer();
        this._LoadFoliage();
        this._LoadClouds();
        this._LoadSky();

        // إعداد الـ Animation Frame
        this._previousRAF = null;
        this._RAF();
    }

    // إضافة الإضاءة
    _AddLighting() {
        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(-10, 500, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 1000.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this._scene.add(light);
        this._sun = light;

        // إضافة الأرض
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(5000, 5000, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0x1e601c })
        );
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);
    }

    // تحميل المتحكمات (Controllers)
    _LoadControllers() {
        const ui = new entity.Entity();
        ui.AddComponent(new ui_controller.UIController());
        this._entityManager.Add(ui, 'ui');
    }

    // تحميل السماء
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

    // تحميل الغيوم
    _LoadClouds() {
        for (let i = 0; i < 20; ++i) {
            const index = math.rand_int(1, 3);
            const pos = new THREE.Vector3(
                (Math.random() * 2.0 - 1.0) * 500,
                100,
                (Math.random() * 2.0 - 1.0) * 500
            );
            const e = new entity.Entity();
            e.AddComponent(new gltf_component.StaticModelComponent({
                scene: this._scene,
                resourcePath: './resources/nature2/GLTF/',
                resourceName: 'Cloud' + index + '.glb',
                position: pos,
                scale: Math.random() * 5 + 10,
                emissive: new THREE.Color(0x808080)
            }));
            e.SetPosition(pos);
            this._entityManager.Add(e);
            e.SetActive(false);
        }
    }

    // تحميل اللاعب
    _LoadPlayer() {
        const params = { camera: this._camera, scene: this._scene };
        const levelUpSpawner = new entity.Entity();
        levelUpSpawner.AddComponent(new level_up_component.LevelUpComponentSpawner({ camera: this._camera, scene: this._scene }));
        this._entityManager.Add(levelUpSpawner, 'level-up-spawner');

        // إضافة أسلحة
        const axe = new entity.Entity();
        axe.AddComponent(new inventory_controller.InventoryItem({
            type: 'weapon',
            damage: 3,
            renderParams: { name: 'Axe', scale: 0.25, icon: 'war-axe-64.png' }
        }));
        this._entityManager.Add(axe);

        const sword = new entity.Entity();
        sword.AddComponent(new inventory_controller.InventoryItem({
            type: 'weapon',
            damage: 3,
            renderParams: { name: 'Sword', scale: 0.25, icon: 'pointy-sword-64.png' }
        }));
        this._entityManager.Add(sword);

        // إضافة نموذج فتاة
        const girl = new player_entity.PlayerEntity(params);
        this._entityManager.Add(girl);
    }

    // تحميل الفوليج (Foliage)
    _LoadFoliage() {
        for (let i = 0; i < 10; ++i) {
            const e = new entity.Entity();
            e.AddComponent(new gltf_component.StaticModelComponent({
                scene: this._scene,
                resourcePath: './resources/nature2/GLTF/',
                resourceName: 'Tree' + (i + 1) + '.glb',
                position: new THREE.Vector3(Math.random() * 300 - 150, 0, Math.random() * 300 - 150),
                scale: Math.random() * 4 + 2
            }));
            e.SetActive(false);
            this._entityManager.Add(e);
        }
    }

    // تنفيذ الـ Animation Frame
    _RAF() {
        this._RAFFrame = requestAnimationFrame(() => { this._RAF(); });
        this._Update();
    }

    // تحديث المشهد
    _Update() {
        const delta = 1 / 60;
        this._entityManager.Update(delta);
        this._threejs.render(this._scene, this._camera);
    }

    // معالجة تغيير حجم النافذة
    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }
}
