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

      // START_CHANGE
      this._gold = 0; // كمية الذهب  -----------
      // END_CHANGE
    }

    InitComponent() {
      this._RegisterHandler('inventory.add', (m) => this._OnInventoryAdded(m));
      // START_CHANGE
      this._RegisterHandler('gold.add', (m) => this.AddGold(m.value));

      // Listen for custom event dispatched by merchant for adding items
      document.addEventListener("inventory.add", (e) => {
        this.Broadcast({
          topic: 'inventory.add',
          value: e.detail.value, // Item name (e.g., "Axe")
          params: e.detail.params, // Item data (damage, renderParams, etc.)
        });
      });
      // END_CHANGE

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
      };

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

      // START_CHANGE
      // If the new slot is an equip slot, broadcast the equip event for the item that was moved into it
      if (newItem.type === 'equip') {
        this.Broadcast({
          topic: 'inventory.equip',
          value: oldValue, // The item that was moved into the equip slot
          added: false,
        });
      }
      // END_CHANGE
    }

    _SetItemAtSlot(slot, itemName) {
      const div = document.getElementById(slot);
      const obj = this.FindEntity(itemName); // البحث عن الكيان بالاسم
      if (obj) {
        const item = obj.GetComponent('InventoryItem');
        // START_CHANGE
        // Comment for weapon icon resources
        // Place your weapon icons (e.g., war-axe-64.png, pointy-sword-64.png) in ./resources/icons/weapons/
        // END_CHANGE
        const path = './resources/icons/weapons/' + item.RenderParams.icon;
        div.style.backgroundImage = "url('" + path + "')";
      } else {
        div.style.backgroundImage = '';
      }
      this._inventory[slot].value = itemName;
    }

    _OnInventoryAdded(msg) {
      // START_CHANGE
      // If the entity for the item doesn't exist, create it and add it to the EntityManager
      let itemEntity = this.FindEntity(msg.value);
      if (!itemEntity) {
        itemEntity = new entity.Entity();
        itemEntity.SetName(msg.value); // Set entity name to match msg.value
        itemEntity.AddComponent(new InventoryItem(msg.params)); // Use msg.params to create InventoryItem
        this._parent._parent.Add(itemEntity, msg.value); // Add entity to EntityManager
      }
      // END_CHANGE

      for (let k in this._inventory) {
        if (!this._inventory[k].value && this._inventory[k].type === 'inventory') {
          this._inventory[k].value = msg.value;
          msg.added = true;

          this._SetItemAtSlot(k, msg.value);

          break;
        }
      }
    }

    // START_CHANGE
    // Add gold support
    AddGold(amount) {
      this._gold += amount;

      // Broadcast event for gold collection (updates quests)
      this.Broadcast({
        topic: 'gold.collected',
        amount: amount,
      });

      // Update HUD or anything else listening for this event
      document.dispatchEvent(new CustomEvent('update-gold', {
        detail: this._gold,
      }));
    }

    GetGold() {
      return this._gold;
    }
    // END_CHANGE

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
