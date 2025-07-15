// === Imports ===
import * as THREE from 'https://cdn.skypack.dev/three'; 
import { entity } from './entity.js';
import { particle_system } from './particle-system.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';



export const equip_weapon_component = (() => {
  class EquipWeapon extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._target = null;
      this._name = null;
    }

    InitComponent() {
      this._RegisterHandler('load.character', (m) => this._OnCharacterLoaded(m));
      this._RegisterHandler('inventory.equip', (m) => this._OnEquip(m));
    }

    get Name() {
      return this._name;
    }

    _OnCharacterLoaded(msg) {
      this._bones = msg.bones;
      this._AttachTarget();
    }

    _AttachTarget() {
      if (this._bones && this._target) {
        this._bones[this._params.anchor].add(this._target);
      }
    }

    _OnEquip(msg) {
      if (msg.value === this._name) return;

      if (this._target) {
        this._UnloadModels();
      }

      const inventory = this.GetComponent('InventoryController');
      const item = inventory.GetItemByName(msg.value).GetComponent('InventoryItem');

      this._name = msg.value;
      this._LoadModels(item, () => {
        this._AttachTarget();
      });
    }

    _UnloadModels() {
      if (this._target) {
        this._target.parent.remove(this._target);
        this._target = null;
      }
    }

    _LoadModels(item, cb) {
      const loader = new FBXLoader();
      loader.setPath('./resources/weapons/FBX/');
      loader.load(item.RenderParams.name + '.fbx', (fbx) => {
        this._target = fbx;
        this._target.scale.setScalar(item.RenderParams.scale);

        // تحسين سلاسة الضربة (زمن أقل + موضع جاهز للضرب)
        this._target.rotation.set(-Math.PI / 3, Math.PI - 1, 0);

        this._target.traverse((c) => {
          c.castShadow = true;
          c.receiveShadow = true;
        });

        cb();

        this.Broadcast({
          topic: 'load.weapon',
          model: this._target,
          bones: this._bones,
        });
      });
    }
  }

  return { EquipWeapon };
})();


// === Level Up Component ===
export const level_up_component = (() => {
  class LevelUpComponentSpawner extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
    }

    Spawn(pos) {
      const e = new entity.Entity();
      e.SetPosition(pos);
      e.AddComponent(new LevelUpComponent(this._params));
      this._parent._parent.Add(e);
      return e;
    }
  }

  class LevelUpComponent extends entity.Component {
    constructor(params) {
      super();
      this._params = params;

      this._particles = new particle_system.ParticleSystem({
        camera: params.camera,
        parent: params.scene,
        texture: './resources/textures/ball.png',
      });

      this._particles._alphaSpline.AddPoint(0.0, 0.0);
      this._particles._alphaSpline.AddPoint(0.1, 1.0);
      this._particles._alphaSpline.AddPoint(0.7, 1.0);
      this._particles._alphaSpline.AddPoint(1.0, 0.0);

      this._particles._colourSpline.AddPoint(0.0, new THREE.Color(0x00FF00));
      this._particles._colourSpline.AddPoint(0.5, new THREE.Color(0x40C040));
      this._particles._colourSpline.AddPoint(1.0, new THREE.Color(0xFF4040));

      this._particles._sizeSpline.AddPoint(0.0, 0.05);
      this._particles._sizeSpline.AddPoint(0.5, 0.25);
      this._particles._sizeSpline.AddPoint(1.0, 0.0);
    }

    InitComponent() {
      this._particles.AddParticles(this._parent._position, 300);
    }

    Update(timeElapsed) {
      this._particles.Step(timeElapsed);
      if (this._particles._particles.length === 0) {
        this._parent.SetActive(false);
      }
    }
  }

  return {
    LevelUpComponent,
    LevelUpComponentSpawner,
  };
})();


// === Health Component ===
export const health_component = (() => {
  class HealthComponent extends entity.Component {
    constructor(params) {
      super();
      this._health = params.health;
      this._maxHealth = params.maxHealth;
      this._params = params;
    }

    InitComponent() {
      this._RegisterHandler('health.damage', (m) => this._OnDamage(m));
      this._RegisterHandler('health.add-experience', (m) => this._OnAddExperience(m));
      this._UpdateUI();
    }

    IsAlive() {
      return this._health > 0;
    }

    _UpdateUI() {
      if (!this._params.updateUI) return;

      const bar = document.getElementById('health-bar');
      const healthAsPercentage = this._health / this._maxHealth;
      bar.style.width = Math.floor(200 * healthAsPercentage) + 'px';

      document.getElementById('stats-strength').innerText = this._params.strength;
      document.getElementById('stats-wisdomness').innerText = this._params.wisdomness;
      document.getElementById('stats-benchpress').innerText = this._params.benchpress;
      document.getElementById('stats-curl').innerText = this._params.curl;
      document.getElementById('stats-experience').innerText = this._params.experience;
    }

    _ComputeLevelXPRequirement() {
      const level = this._params.level;
      return Math.round(2 ** (level - 1) * 100);
    }

    _OnAddExperience(msg) {
      this._params.experience += msg.value;
      const requiredExperience = this._ComputeLevelXPRequirement();
      if (this._params.experience < requiredExperience) return;

      this._params.level += 1;
      this._params.strength += 1;
      this._params.wisdomness += 1;
      this._params.benchpress += 1;
      this._params.curl += 2;

      const spawner = this.FindEntity('level-up-spawner').GetComponent('LevelUpComponentSpawner');
      spawner.Spawn(this._parent._position);

      this.Broadcast({ topic: 'health.levelGained', value: this._params.level });
      this._UpdateUI();
    }

    _OnDeath(attacker) {
      if (attacker) {
        attacker.Broadcast({
          topic: 'health.add-experience',
          value: this._params.level * 100,
        });
      }
      this.Broadcast({ topic: 'health.death' });
    }

    _OnDamage(msg) {
      this._health = Math.max(0.0, this._health - msg.value);
      if (this._health === 0) {
        this._OnDeath(msg.attacker);
      }

      this.Broadcast({
        topic: 'health.update',
        health: this._health,
        maxHealth: this._maxHealth,
      });

      this._UpdateUI();
    }
  }

  return {
    HealthComponent,
  };
})();


// === Quest Component ===
export const quest_component = (() => {
  const _TITLE = 'Welcome Adventurer!';
  const _TEXT = `Welcome to Honeywood adventurer, you're the chosen one. But first, kill 30 ghosts, get my drycleaning, and pick up my kids from daycare.`;

  class QuestComponent extends entity.Component {
    constructor() {
      super();
      const e = document.getElementById('quest-ui');
      e.style.visibility = 'hidden';
    }

    InitComponent() {
      this._RegisterHandler('input.picked', (m) => this._OnPicked(m));
    }

    _OnPicked(msg) {
      const quest = {
        id: 'foo',
        title: _TITLE,
        text: _TEXT,
      };
      this._AddQuestToJournal(quest);
    }

    _AddQuestToJournal(quest) {
      const ui = this.FindEntity('ui').GetComponent('UIController');
      ui.AddQuest(quest);
    }
  }

  return {
    QuestComponent,
  };
})();
