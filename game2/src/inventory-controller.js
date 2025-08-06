// MultipleFiles/inventory-controller.js
import {entity} from './entity.js';

export const inventory_controller = (() => {

  class InventoryController extends entity.Component {
    constructor(params) {
      super();

      this._inventory = {};
      for (let i = 1; i <= 24; ++i) {
        this._inventory['inventory-' + i] = {
          type: 'inventory',
          value: null,
        };
      }

      for (let i = 1; i <= 8; ++i) {
        this._inventory['inventory-equip-' + i] = {
          type: 'equip',
          value: null,
        };
      }

      this._gold = 0; // كمية الذهب
    }

    InitComponent() {
      this._RegisterHandler('inventory.add', (m) => this._OnInventoryAdded(m));
      this._RegisterHandler('gold.add', (m) => this.AddGold(m.value));

      // ✅ السلوك: عند الشراء، يدخل العنصر مباشرة إلى المخزون.
      // هذا المستمع يضمن أن أي رسالة 'inventory.add' (سواء من التاجر أو غيره)
      // يتم معالجتها لإضافة العنصر إلى المخزون.
      document.addEventListener("inventory.add", (e) => {
        this.Broadcast({
          topic: 'inventory.add',
          value: e.detail.value, // اسم السلاح (مثل "Axe")
          params: e.detail.params, // بيانات السلاح (damage, renderParams, etc.)
        });
      });

      const _SetupElement = (n) => {
        const element = document.getElementById(n);
        element.ondragstart = (ev) => {
          ev.dataTransfer.setData('text/plain', n);
        };
        element.ondragover = (ev) => {
          ev.preventDefault();
        };
        element.ondrop = (ev) => {
          ev.preventDefault();
          const data = ev.dataTransfer.getData('text/plain');
          const other = document.getElementById(data);
    
          this._OnItemDropped(other, element);
        };
      }

      for (let k in this._inventory) {
        _SetupElement(k);
      }
    }


    _OnItemDropped(oldElement, newElement) {
      const oldItem = this._inventory[oldElement.id];
      const newItem = this._inventory[newElement.id];

      const oldValue = oldItem.value;
      const newValue = newItem.value;

      this._SetItemAtSlot(oldElement.id, newValue);
      this._SetItemAtSlot(newElement.id, oldValue);

      // ✅ السلوك: يظهر في يد اللاعب عند السحب إلى خانة الـ equip.
      // هذا الجزء يرسل رسالة 'inventory.equip' إلى مكون EquipWeapon
      // ليقوم بتحميل النموذج وتجهيزه.
      if (newItem.type === 'equip') {
        this.Broadcast({
          topic: 'inventory.equip',
          value: oldValue, // السلاح الذي تم تجهيزه
          added: false,
        });
      }
    }

    _SetItemAtSlot(slot, itemName) {
      const div = document.getElementById(slot);
      const obj = this.FindEntity(itemName); // البحث عن الكيان بالاسم
      if (obj) {
        const item = obj.GetComponent('InventoryItem');
        // START_CHANGE: استخدام iconName لعرض الأيقونة
        const path = './resources/icons/weapons/' + item.RenderParams.iconName;
        // END_CHANGE
        div.style.backgroundImage = "url('" + path + "')";
      } else {
        div.style.backgroundImage = '';
      }
      this._inventory[slot].value = itemName;
    }

    _OnInventoryAdded(msg) {
      // ✅ السلوك: عند الشراء، يدخل العنصر مباشرة إلى المخزون.
      // هذا الجزء يضمن أن كل عنصر يتم شراؤه أو الحصول عليه
      // يتم تحويله إلى كيان (Entity) في EntityManager،
      // مما يسمح لمكونات أخرى (مثل EquipWeapon) بالوصول إليه.
      let itemEntity = this.FindEntity(msg.value);
      if (!itemEntity) {
        itemEntity = new entity.Entity();
        itemEntity.SetName(msg.value); // تعيين اسم الكيان ليتوافق مع msg.value
        itemEntity.AddComponent(new InventoryItem(msg.params)); // استخدام msg.params لإنشاء InventoryItem
        this._parent._parent.Add(itemEntity, msg.value); // إضافة الكيان إلى EntityManager
      }

      for (let k in this._inventory) {
        if (!this._inventory[k].value && this._inventory[k].type === 'inventory') {
          this._inventory[k].value = msg.value;
          msg.added = true;

          this._SetItemAtSlot(k, msg.value);
  
          break;
        }
      }
    }

    // --- إضافة دعم الذهب ---

    AddGold(amount) {
      this._gold += amount;

      // بث الحدث الخاص بجمع الذهب (يحدث المهام)
      this.Broadcast({
        topic: 'gold.collected',
        amount: amount,
      });

      // تحديث HUD أو أي شيء آخر يستمع لهذا الحدث
      document.dispatchEvent(new CustomEvent('update-gold', {
        detail: this._gold,
      }));
    }

    GetGold() {
      return this._gold;
    }

    GetItemByName(name) {
      for (let k in this._inventory) {
        if (this._inventory[k].value === name) {
          return this.FindEntity(name);
        }
      }
      return null;
    }
  };

  class InventoryItem extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
    }

    InitComponent() {}

    get Params() {
      return this._params;
    }

    get RenderParams() {
      return this._params.renderParams;
    }
  };

  
  return {
    InventoryController: InventoryController,
    InventoryItem: InventoryItem,
  };
})();
