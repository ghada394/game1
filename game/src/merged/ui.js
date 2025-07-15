import { entity } from './entity.js';
import { math } from './math.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.0/build/three.module.js';

export const game_components = (() => {

  // ** UIController (تحكم واجهة المستخدم) **

  class UIController extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._quests = {};
    }

    InitComponent() {
      // إعداد العناصر UI
      this._iconBar = {
        stats: document.getElementById('icon-bar-stats'),
        inventory: document.getElementById('icon-bar-inventory'),
        quests: document.getElementById('icon-bar-quests'),
      };
      this._ui = {
        inventory: document.getElementById('inventory'),
        stats: document.getElementById('stats'),
        quests: document.getElementById('quest-journal'),
      };

      // إضافة الأحداث على الأزرار
      this._iconBar.inventory.onclick = (m) => { this._OnInventoryClicked(m); };
      this._iconBar.stats.onclick = (m) => { this._OnStatsClicked(m); };
      this._iconBar.quests.onclick = (m) => { this._OnQuestsClicked(m); };

      this._HideUI(); // إخفاء الواجهة عند البداية
    }

    // إضافة مهمة جديدة
    AddQuest(quest) {
      if (quest.id in this._quests) {
        return;
      }

      // إنشاء عنصر جديد لعرض المهمة
      const e = document.createElement('DIV');
      e.className = 'quest-entry';
      e.id = 'quest-entry-' + quest.id;
      e.innerText = quest.title;
      e.onclick = (evt) => { this._OnQuestSelected(e.id); };

      // إضافة المهمة إلى قائمة المهام
      document.getElementById('quest-journal').appendChild(e);
      this._quests[quest.id] = quest;
      this._OnQuestSelected(quest.id); // عرض تفاصيل المهمة
    }

    // عرض تفاصيل المهمة عند اختيارها
    _OnQuestSelected(id) {
      const quest = this._quests[id];
      const e = document.getElementById('quest-ui');
      e.style.visibility = '';
      const text = document.getElementById('quest-text');
      text.innerText = quest.text;
      const title = document.getElementById('quest-text-title');
      title.innerText = quest.title;
    }

    // إخفاء واجهة المستخدم
    _HideUI() {
      this._ui.inventory.style.visibility = 'hidden';
      this._ui.stats.style.visibility = 'hidden';
      this._ui.quests.style.visibility = 'hidden';
    }

    // التعامل مع الضغط على زر المهام
    _OnQuestsClicked(msg) {
      const visibility = this._ui.quests.style.visibility;
      this._HideUI();
      this._ui.quests.style.visibility = (visibility ? '' : 'hidden');
    }

    // التعامل مع الضغط على زر الإحصائيات
    _OnStatsClicked(msg) {
      const visibility = this._ui.stats.style.visibility;
      this._HideUI();
      this._ui.stats.style.visibility = (visibility ? '' : 'hidden');
    }

    // التعامل مع الضغط على زر الجرد
    _OnInventoryClicked(msg) {
      const visibility = this._ui.inventory.style.visibility;
      this._HideUI();
      this._ui.inventory.style.visibility = (visibility ? '' : 'hidden');
    }

    // تحديث الواجهة
    Update(timeInSeconds) { }
  }

  // ** Health Bar (شريط الصحة) **

  const _VS = `
    #version 300 es
    varying vec2 vUV;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      vUV = uv;
    }
  `;

  const _PS = `
    #version 300 es
    uniform vec3 colour;
    uniform float health;
    varying vec2 vUV;
    out vec4 out_FragColor;
    void main() {
      out_FragColor = vec4(mix(colour, vec3(0.0), step(health, vUV.y)), 1.0);
    }
  `;

  class HealthBar extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._Initialize();
    }

    // إعدادات البداية
    _Initialize() {
      const uniforms = {
        colour: { value: new THREE.Color(0, 1, 0) }, // اللون الأخضر للصحة الكاملة
        health: { value: 1.0 }, // صحة كاملة (100%)
      };
      this._material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: _VS,
        fragmentShader: _PS,
        blending: THREE.NormalBlending,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      this._geometry = new THREE.BufferGeometry();
      this._bar = new THREE.Mesh(this._geometry, this._material);
      this._bar.frustumCulled = false; // منع التقطيع
      this._bar.scale.set(2, 0.125, 1); // حجم الشريط
      this._realHealth = 1.0; // الصحة الحالية
      this._animHealth = 1.0; // الصحة المتحركة
      this._params.parent.add(this._bar);
      this._GenerateBuffers(); // إنشاء ال buffers
    }

    InitComponent() {
      // التسجيل لاستقبال رسائل التحديث
      this._RegisterHandler('health.update', (m) => { this._OnHealth(m); });
    }

    // التعامل مع تحديث الصحة
    _OnHealth(msg) {
      const healthPercent = (msg.health / msg.maxHealth);
      this._realHealth = healthPercent; // تحديث الصحة
    }

    // تحديث شريط الصحة
    Update(timeElapsed) {
      // تحديث الصحة المتحركة
      const t = 1.0 - Math.pow(0.001, timeElapsed);
      this._animHealth = math.lerp(t, this._animHealth, this._realHealth);

      // تحديد اللون بناءً على الصحة
      const _R = new THREE.Color(1.0, 0, 0);
      const _G = new THREE.Color(0.0, 1.0, 0.0);
      const c = _R.clone();
      c.lerpHSL(_G, this._animHealth);
      this._material.uniforms.health.value = this._animHealth;
      this._material.uniforms.colour.value = c;

      // تحديث موقع الشريط
      this._bar.position.copy(this._parent._position);
      this._bar.position.y += 8.0;
      this._bar.quaternion.copy(this._params.camera.quaternion);
    }

    // إنشاء الـ buffers لشريط الصحة
    _GenerateBuffers() {
      const indices = [];
      const positions = [];
      const uvs = [];
      const square = [0, 1, 2, 2, 3, 0];
      indices.push(...square);

      // إنشاء النقاط
      const p1 = new THREE.Vector3(-1, -1, 0);
      const p2 = new THREE.Vector3(-1, 1, 0);
      const p3 = new THREE.Vector3(1, 1, 0);
      const p4 = new THREE.Vector3(1, -1, 0);
      uvs.push(0.0, 0.0);
      uvs.push(1.0, 0.0);
      uvs.push(1.0, 1.0);
      uvs.push(0.0, 1.0);
      positions.push(p1.x, p1.y, p1.z);
      positions.push(p2.x, p2.y, p2.z);
      positions.push(p3.x, p3.y, p3.z);
      positions.push(p4.x, p4.y, p4.z);

      this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      this._geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      this._geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
      this._geometry.attributes.position.needsUpdate = true; // تأكيد التحديث
    }
  }

  return {
    UIController: UIController,
    HealthBar: HealthBar,
  };

})();
