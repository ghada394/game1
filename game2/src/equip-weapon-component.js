// MultipleFiles/equip-weapon-component.js
import {entity} from './entity.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';


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
      if (msg.value == this._name) {
        return;
      }

      if (this._target) {
        this._UnloadModels();
      }
      const inventory = this.GetComponent('InventoryController');
      const item = inventory.GetItemByName(msg.value).GetComponent('InventoryItem');
      this._name = msg.value;

      // ✅ السلوك: يظهر في يد اللاعب عند السحب إلى خانة الـ equip.
      // يتم تحميل نموذج السلاح هنا بناءً على خصائص العنصر.
      this._LoadModels(item, () => {
        this._AttachTarget();
      });
    }

    _UnloadModels() {
      if (this._target) {
        this._target.parent.remove(this._target);
        // Probably need to free the memory properly, whatever
        this._target = null;
      }
    }

    _LoadModels(item, cb) {
      const loader = new FBXLoader();
      // START_CHANGE: تحديد مسار ملفات FBX للفأس
      // تأكد أن هذا المسار صحيح بالنسبة لموقع ملفات FBX الخاصة بك.
      // إذا كان ملف axe.fbx في resources/FBX/، فالمسار هو './resources/FBX/'
      loader.setPath('./resources/weapons\fBX');
      // END_CHANGE

      // START_CHANGE: استخدام modelName لتحميل النموذج
      loader.load(item.RenderParams.modelName + '.fbx', (fbx) => {
      // END_CHANGE
        this._target = fbx;
        this._target.scale.setScalar(item.RenderParams.scale);
        this._target.rotateY(Math.PI);
        this._target.rotateX(-Math.PI / 3);
        this._target.rotateY(-1);

        this._target.traverse(c => {
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
  };

  return {
      EquipWeapon: EquipWeapon,
  };
})();
