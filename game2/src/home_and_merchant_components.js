import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { entity } from './entity.js';

export const home_and_merchant_components = (() => {

  class HomeComponent extends entity.Component {
    constructor(params) {
      super(params);
      this.level = 1;
    }

    upgradeHome() {
      this.level++;
      console.log(`🏠 تم ترقية المنزل إلى المستوى ${this.level}`);
      // ممكن تضيف هنا تحسينات بصرية أو منطقية
    }
  }

  class MerchantComponent extends entity.Component {
    constructor(params) {
      super(params);
      this._inventory = [
        { name: 'Sword', type: 'weapon', price: 100, damage: 10 },
        { name: 'Health Potion', type: 'potion', price: 50 },
        { name: 'House Upgrade', type: 'upgrade', price: 200 },
      ];
      this._params = params || {};
    }

    buyItem(index) {
      const item = this._inventory[index - 1];
      if (!item) {
        console.log("❌ هذا العنصر غير موجود.");
        return;
      }

      // جلب الذهب الحالي من playerInventory مباشرة (إذا متوفر)
      const playerEntity = this.FindEntity('player');
      const playerInventory = playerEntity ? playerEntity.GetComponent('InventoryController') : null;
      const currentGold = playerInventory ? playerInventory.GetGold() : 0;

      if (currentGold >= item.price) {
        // تحديث الذهب عبر الدالة الممررة من main.js
        if (this._params.updatePlayerGold) {
          this._params.updatePlayerGold(-item.price);
        } else {
          console.warn('⚠️ updatePlayerGold غير معرف في params');
        }

        if (item.type === 'weapon') {
          console.log(`🗡️ حصلت على: ${item.name} (ضرر: ${item.damage})`);
          if (this._params.addInventoryItem) {
            this._params.addInventoryItem(item);
          } else {
            console.warn('⚠️ addInventoryItem غير معرف في params');
          }
        } else if (item.type === 'upgrade') {
          const home = this.FindEntity('home')?.GetComponent('HomeComponent');
          if (home) {
            home.upgradeHome();
          }
        } else if (item.type === 'potion') {
          console.log('🍷 شربت جرعة صحة');
          // ممكن تضيف هنا تأثير الجرعة على صحة اللاعب
        }

      } else {
        console.log(`❌ ليس لديك ما يكفي من الذهب. السعر: ${item.price} ذهب`);
      }
    }

    listInventory() {
      console.log('📦 قائمة التاجر:');
      this._inventory.forEach((item, i) => {
        console.log(`${i + 1}. ${item.name} - السعر: ${item.price} ذهب`);
      });

      class InventoryController extends entity.Component {
  constructor(params) {
    super(params);
    this.gold = 0;
    this.items = [];
  }

  GetGold() {
    return this.gold;
  }

  AddGold(amount) {
    this.gold += amount;
    if (this.gold < 0) this.gold = 0;
    console.log(`💰 رصيد الذهب الآن: ${this.gold}`);
  }

  AddItem(item) {
    this.items.push(item);
    console.log(`🛒 تمت إضافة ${item.name} للمخزون.`);
  }
}

    }
  }

  return {
    HomeComponent,
    MerchantComponent,
  };
})();
