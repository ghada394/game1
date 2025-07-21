// MultipleFiles/home_and_merchant_components.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { entity } from './entity.js';

export const home_and_merchant_components = (() => {

  class HomeComponent extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._level = 1;
      this._homePosition = new THREE.Vector3(0, 0, 0); // موقع المنزل
      this._interactionRange = 10; // نطاق التفاعل مع المنزل
    }

    InitComponent() {
      this._RegisterHandler('input.interact_home', (m) => this._OnInteract(m));
    }

    _OnInteract(msg) {
      const player = this.FindEntity('player');
      if (!player) return;

      const distance = player._position.distanceTo(this._homePosition);
      if (distance <= this._interactionRange) {
        console.log(`💬 أنت بالقرب من المنزل (المستوى ${this._level}). اضغط [E] للترقية.`);
        this.upgradeHome(); // استدعاء الترقية مباشرة عند التفاعل
      } else {
        console.log('💬 أنت بعيد جدًا عن المنزل للتفاعل معه.');
      }
    }

    upgradeHome() {
      const cost = this._level * 50;
      const playerInventory = this.FindEntity('player').GetComponent('InventoryController');
      if (playerInventory && playerInventory.GetGold() >= cost) {
        playerInventory.AddGold(-cost);
        this._level++;
        console.log(`✅ تم ترقية المنزل إلى المستوى ${this._level}`);
        this.Broadcast({
          topic: 'home.upgraded',
          newLevel: this._level,
        });
      } else {
        console.log(`❌ ليس لديك ما يكفي من الذهب. تحتاج ${cost} ذهب.`);
      }
    }

    IsPlayerInside(playerPos) {
      const minX = this._homePosition.x - 10;
      const maxX = this._homePosition.x + 10;
      const minZ = this._homePosition.z - 10;
      const maxZ = this._homePosition.z + 10;
      return playerPos.x >= minX && playerPos.x <= maxX &&
             playerPos.z >= minZ && playerPos.z <= maxZ;
    }
  }

  class MerchantComponent extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._merchantPosition = new THREE.Vector3(30, 0, 5);
      this._interactionRange = 10;
      this._inventory = [
        { name: "Axe", price: 30, type: "weapon", damage: 3, icon: 'war-axe-64.png' },
        { name: "Sword", price: 30, type: "weapon", damage: 3, icon: 'pointy-sword-64.png' },
        { name: "Home Upgrade", price: 50, type: "upgrade" },
        { name: "Health Potion", price: 15, type: "potion" }
      ];

      this._merchantMesh = null;
      this._shopUI = null;
      this._uiVisible = false;

      this._LoadMerchantModel();
    }

    InitComponent() {
      this._RegisterHandler('input.interact_merchant', (m) => this._OnInteract(m));
    }

    _LoadMerchantModel() {
      const loader = new FBXLoader();
      loader.load('./resources/girl/peasant_girl.fbx', (fbx) => {
        this._merchantMesh = fbx;
        this._merchantMesh.scale.set(0.03, 0.03, 0.03);
        this._merchantMesh.position.copy(this._merchantPosition);
        this._merchantMesh.position.y = 0;
        this._merchantMesh.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
        });
        this._params.scene.add(this._merchantMesh);
        console.log("✅ تم تحميل نموذج التاجر عند:", this._merchantPosition);

        this._CreateShopUI();
      }, undefined, (error) => {
        console.error("❌ خطأ في تحميل نموذج التاجر:", error);
      });
    }

    _CreateShopUI() {
      this._interactButton = document.createElement('button');
      this._interactButton.innerText = 'تفاعل مع التاجر (T)';
      this._interactButton.style.position = 'absolute';
      this._interactButton.style.bottom = '100px';
      this._interactButton.style.left = '50%';
      this._interactButton.style.transform = 'translateX(-50%)';
      this._interactButton.style.padding = '10px 20px';
      this._interactButton.style.backgroundColor = '#4CAF50';
      this._interactButton.style.color = 'white';
      this._interactButton.style.border = 'none';
      this._interactButton.style.borderRadius = '5px';
      this._interactButton.style.cursor = 'pointer';
      this._interactButton.style.zIndex = '1000';
      this._interactButton.style.display = 'none';
      document.body.appendChild(this._interactButton);

      this._interactButton.onclick = () => {
        this._ToggleShopUI();
      };

      this._shopUI = document.createElement('div');
      this._shopUI.style.position = 'absolute';
      this._shopUI.style.top = '50%';
      this._shopUI.style.left = '50%';
      this._shopUI.style.transform = 'translate(-50%, -50%)';
      this._shopUI.style.padding = '20px';
      this._shopUI.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      this._shopUI.style.color = 'white';
      this._shopUI.style.border = '2px solid gold';
      this._shopUI.style.borderRadius = '10px';
      this._shopUI.style.zIndex = '1001';
      this._shopUI.style.display = 'none';

      let shopContent = '<h2>متجر التاجر</h2><ul style="list-style: none; padding: 0;">';
      this._inventory.forEach((item, i) => {
        shopContent += `<li>${i + 1}. ${item.name} - ${item.price} ذهب <button data-index="${i + 1}" class="buy-item-btn">شراء</button></li>`;
      });
      shopContent += '</ul><button id="close-shop-btn" style="margin-top: 10px; padding: 8px 15px; background-color: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">إغلاق</button>';
      this._shopUI.innerHTML = shopContent;
      document.body.appendChild(this._shopUI);

      this._shopUI.querySelectorAll('.buy-item-btn').forEach(button => {
        button.onclick = (event) => {
          const index = parseInt(event.target.dataset.index);
          this.buyItem(index);
        };
      });

      document.getElementById('close-shop-btn').onclick = () => {
        this._ToggleShopUI();
      };
    }

    _ToggleShopUI() {
      this._uiVisible = !this._uiVisible;
      this._shopUI.style.display = this._uiVisible ? 'block' : 'none';
      this._interactButton.style.display = this._uiVisible ? 'none' : 'block';
    }

    _OnInteract(msg) {
      const player = this.FindEntity('player');
      if (!player) return;

      const distance = player._position.distanceTo(this._merchantPosition);
      if (distance <= this._interactionRange) {
        this._interactButton.style.display = 'block';
        console.log('💬 اضغط [T] أو زر "تفاعل مع التاجر" لفتح المتجر.');
      } else {
        this._interactButton.style.display = 'none';
        if (this._uiVisible) {
          this._ToggleShopUI();
        }
        console.log('💬 أنت بعيد جدًا عن التاجر للتفاعل معه.');
      }
    }

    buyItem(index) {
      const item = this._inventory[index - 1];
      if (!item) {
        console.log("❌ هذا العنصر غير موجود.");
        return;
      }

      const player = this.FindEntity('player');
      const playerInventory = player.GetComponent('InventoryController');

      if (playerInventory && playerInventory.GetGold() >= item.price) {
        playerInventory.AddGold(-item.price);
        if (item.type === "weapon") {
          console.log(`🗡️ حصلت على: ${item.name} (ضرر: ${item.damage})`);
          this.Broadcast({
            topic: 'inventory.add',
            value: item.name,
            added: false,
          });
        } else if (item.type === "upgrade") {
          const home = this.FindEntity('home').GetComponent('HomeComponent');
          if (home) {
            home.upgradeHome();
          }
        } else if (item.type === "potion") {
          console.log("🍷 شربت جرعة صحة");
          // هنا يمكنك إضافة تأثير الجرعة (مثلاً زيادة الصحة)
        }
      } else {
        console.log(`❌ ليس لديك ما يكفي من الذهب. السعر: ${item.price} ذهب`);
      }
    }

    Update(timeElapsed) {
      const player = this.FindEntity('player');
      if (player && this._merchantMesh && !this._uiVisible) {
        const distance = player._position.distanceTo(this._merchantPosition);
        this._interactButton.style.display = distance <= this._interactionRange ? 'block' : 'none';
      }
    }
  }

  return {
    HomeComponent,
    MerchantComponent,
  };
})();
