
import * as THREE from 'three';
import { entity } from './entity.js';
import { math } from './math.js';

export const attack_controller = (() => {
  class AttackController extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._timeElapsed = 0.0;
      this._action = null;
      this._lastAttackTime = 0;
    }

    InitComponent() {
      this._RegisterHandler('player.action', (m) => this._OnAnimAction(m));
    }

    _OnAnimAction(msg) {
      if (msg.action !== this._action) {
        this._action = msg.action;
        this._timeElapsed = 0.0;
      }

      const prevTime = this._timeElapsed;
      this._timeElapsed = msg.time;

      const timing = this._params.timing || 0.2;
      const cooldown = this._params.attackCooldown || 0.4;

      if (prevTime < timing && this._timeElapsed >= timing && (msg.time - this._lastAttackTime) >= cooldown) {
        this._lastAttackTime = msg.time;
        this._PerformAttack();
      }
    }

    _PerformAttack() {
      const inventory = this.GetComponent('InventoryController');
      const equip = this.GetComponent('EquipWeapon');
      const health = this.GetComponent('HealthComponent');

      if (!inventory || !equip || !health) return;

      let item = inventory.GetItemByName(equip.Name);
      item = item?.GetComponent('InventoryItem');

      const baseDamage = health._params.strength;
      const damage = item ? Math.round(baseDamage * item.Params.damage) : baseDamage;

      const grid = this.GetComponent('SpatialGridController');
      if (!grid) return;

      const nearby = grid.FindNearbyEntities(2);
      const targets = nearby
        .filter(c => c.entity !== this._parent)
        .filter(c => {
          const h = c.entity.GetComponent('HealthComponent');
          return h?.IsAlive();
        });

      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this._parent._rotation).normalize();

      for (let t of targets) {
        const target = t.entity;
        const toTarget = target._position.clone().sub(this._parent._position).normalize();
        const dot = forward.dot(toTarget);

        if (math.in_range(dot, 0.7, 1.1)) {
          target.Broadcast({
            topic: 'health.damage',
            value: damage,
            attacker: this._parent,
          });
        }
      }
    }
  }

  return {
    AttackController,
  };
})();

// ======= INVENTORY CONTROLLER =======
export const inventory_controller = (() => {
  class InventoryController extends entity.Component {
    constructor(params) {
      super();
      this._inventory = {};

      for (let i = 1; i <= 24; ++i) {
        this._inventory[`inventory-${i}`] = { type: 'inventory', value: null };
      }

      for (let i = 1; i <= 8; ++i) {
        this._inventory[`inventory-equip-${i}`] = { type: 'equip', value: null };
      }
    }

    InitComponent() {
      this._RegisterHandler('inventory.add', (m) => this._OnInventoryAdded(m));

      const setupElement = (id) => {
        const element = document.getElementById(id);
        if (!element) return;

        element.ondragstart = (ev) => {
          ev.dataTransfer.setData('text/plain', id);
        };
        element.ondragover = (ev) => ev.preventDefault();
        element.ondrop = (ev) => {
          ev.preventDefault();
          const from = ev.dataTransfer.getData('text/plain');
          const source = document.getElementById(from);
          this._OnItemDropped(source, element);
        };
      };

      for (let key in this._inventory) setupElement(key);
    }

    _OnItemDropped(oldEl, newEl) {
      const oldItem = this._inventory[oldEl.id];
      const newItem = this._inventory[newEl.id];
      const oldVal = oldItem.value;
      const newVal = newItem.value;

      this._SetItemAtSlot(oldEl.id, newVal);
      this._SetItemAtSlot(newEl.id, oldVal);

      if (newItem.type === 'equip') {
        this.Broadcast({ topic: 'inventory.equip', value: oldVal, added: false });
      }
    }

    _SetItemAtSlot(slot, itemName) {
      const div = document.getElementById(slot);
      const obj = this.FindEntity(itemName);

      if (obj) {
        const item = obj.GetComponent('InventoryItem');
        const path = './resources/icons/weapons/' + item.RenderParams.icon;
        div.style.backgroundImage = `url('${path}')`;
      } else {
        div.style.backgroundImage = '';
      }

      this._inventory[slot].value = itemName;
    }

    _OnInventoryAdded(msg) {
      for (let key in this._inventory) {
        const slot = this._inventory[key];
        if (!slot.value && slot.type === 'inventory') {
          slot.value = msg.value;
          msg.added = true;
          this._SetItemAtSlot(key, msg.value);
          break;
        }
      }
    }

    GetItemByName(name) {
      for (let k in this._inventory) {
        if (this._inventory[k].value === name) {
          return this.FindEntity(name);
        }
      }
      return null;
    }
  }

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
  }

  return {
    InventoryController,
    InventoryItem,
  };
})();

// ======= SPATIAL GRID CONTROLLER =======
export const spatial_grid_controller = (() => {
  class SpatialGridController extends entity.Component {
    constructor(params) {
      super();
      this._grid = params.grid;
    }

    InitComponent() {
      const pos = [this._parent._position.x, this._parent._position.z];
      this._client = this._grid.NewClient(pos, [1, 1]);
      this._client.entity = this._parent;

      this._RegisterHandler('update.position', (m) => this._OnPosition(m));
    }

    _OnPosition(msg) {
      this._client.position = [msg.value.x, msg.value.z];
      this._grid.UpdateClient(this._client);
    }

    FindNearbyEntities(range) {
      const pos = [this._parent._position.x, this._parent._position.z];
      return this._grid.FindNear(pos, [range, range])
        .filter(c => c.entity !== this._parent);
    }
  }

  return {
    SpatialGridController,
  };
})();

// ======= SPATIAL HASH GRID =======
export const spatial_hash_grid = (() => {
  class SpatialHashGrid {
    constructor(bounds, dimensions) {
      const [x, y] = dimensions;
      this._cells = Array.from({ length: x }, () => Array(y).fill(null));
      this._dimensions = dimensions;
      this._bounds = bounds;
      this._queryIds = 0;
    }

    _GetCellIndex([x, y]) {
      const sx = math.sat((x - this._bounds[0][0]) / (this._bounds[1][0] - this._bounds[0][0]));
      const sy = math.sat((y - this._bounds[0][1]) / (this._bounds[1][1] - this._bounds[0][1]));
      return [
        Math.floor(sx * (this._dimensions[0] - 1)),
        Math.floor(sy * (this._dimensions[1] - 1)),
      ];
    }

    NewClient(position, size) {
      const client = {
        position,
        dimensions: size,
        _cells: { min: null, max: null, nodes: null },
        _queryId: -1,
      };
      this._Insert(client);
      return client;
    }

    _Insert(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);

      const nodes = [];

      for (let xi = i1[0]; xi <= i2[0]; xi++) {
        nodes.push([]);
        for (let yi = i1[1]; yi <= i2[1]; yi++) {
          const node = { next: this._cells[xi][yi], prev: null, client };
          if (this._cells[xi][yi]) {
            this._cells[xi][yi].prev = node;
          }
          this._cells[xi][yi] = node;
          nodes[xi - i1[0]].push(node);
        }
      }

      client._cells = { min: i1, max: i2, nodes };
    }

    UpdateClient(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);

      if (
        client._cells.min &&
        client._cells.min[0] === i1[0] &&
        client._cells.min[1] === i1[1] &&
        client._cells.max[0] === i2[0] &&
        client._cells.max[1] === i2[1]
      ) {
        return;
      }

      this.Remove(client);
      this._Insert(client);
    }

    Remove(client) {
      const i1 = client._cells.min;
      const i2 = client._cells.max;
      const nodes = client._cells.nodes;

      for (let x = i1[0]; x <= i2[0]; x++) {
        for (let y = i1[1]; y <= i2[1]; y++) {
          const node = nodes[x - i1[0]][y - i1[1]];
          if (node.next) node.next.prev = node.prev;
          if (node.prev) node.prev.next = node.next;
          if (!node.prev) this._cells[x][y] = node.next;
        }
      }

      client._cells = { min: null, max: null, nodes: null };
    }

    FindNear([x, y], [w, h]) {
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);

      const result = [];
      const queryId = this._queryIds++;

      for (let xi = i1[0]; xi <= i2[0]; xi++) {
        for (let yi = i1[1]; yi <= i2[1]; yi++) {
          let head = this._cells[xi][yi];
          while (head) {
            const c = head.client;
            if (c._queryId !== queryId) {
              c._queryId = queryId;
              result.push(c);
            }
            head = head.next;
          }
        }
      }

      return result;
    }
  }

  return {
    SpatialHashGrid,
  };
})();
