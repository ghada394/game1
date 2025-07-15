import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export const entity = (() => {
  class Entity {
    constructor() {
      this._name = null;
      this._components = {};
      this._position = new THREE.Vector3();
      this._rotation = new THREE.Quaternion();
      this._handlers = {};
      this._parent = null;
    }

    _RegisterHandler(n, h) {
      if (!(n in this._handlers)) {
        this._handlers[n] = [];
      }
      this._handlers[n].push(h);
    }

    SetParent(p) {
      this._parent = p;
    }

    SetName(n) {
      this._name = n;
    }

    get Name() {
      return this._name;
    }

    SetActive(b) {
      this._parent.SetActive(this, b);
    }

    AddComponent(c) {
      c.SetParent(this);
      this._components[c.constructor.name] = c;
      c.InitComponent();
    }

    GetComponent(n) {
      return this._components[n];
    }

    FindEntity(n) {
      return this._parent.Get(n);
    }

    Broadcast(msg) {
      if (!(msg.topic in this._handlers)) {
        return;
      }
      for (let curHandler of this._handlers[msg.topic]) {
        curHandler(msg);
      }
    }

    SetPosition(p) {
      this._position.copy(p);
      this.Broadcast({ topic: 'update.position', value: this._position });
    }

    SetQuaternion(r) {
      this._rotation.copy(r);
      this.Broadcast({ topic: 'update.rotation', value: this._rotation });
    }

    Update(timeElapsed) {
      for (let k in this._components) {
        this._components[k].Update(timeElapsed);
      }
    }
  }

  class Component {
    constructor() {
      this._parent = null;
    }

    SetParent(p) {
      this._parent = p;
    }

    InitComponent() {}

    GetComponent(n) {
      return this._parent.GetComponent(n);
    }

    FindEntity(n) {
      return this._parent.FindEntity(n);
    }

    Broadcast(m) {
      this._parent.Broadcast(m);
    }

    Update(_) {}

    _RegisterHandler(n, h) {
      this._parent._RegisterHandler(n, h);
    }
  }

  return {
    Entity: Entity,
    Component: Component
  };
})();

export const math = (() => {
  return {
    rand_range: function(a, b) {
      return Math.random() * (b - a) + a;
    },

    rand_normalish: function() {
      const r = Math.random() + Math.random() + Math.random() + Math.random();
      return (r / 4.0) * 2.0 - 1;
    },

    rand_int: function(a, b) {
      return Math.round(Math.random() * (b - a) + a);
    },

    lerp: function(x, a, b) {
      return x * (b - a) + a;
    },

    smoothstep: function(x, a, b) {
      x = x * x * (3.0 - 2.0 * x);
      return x * (b - a) + a;
    },

    smootherstep: function(x, a, b) {
      x = x * x * x * (x * (x * 6 - 15) + 10);
      return x * (b - a) + a;
    },

    clamp: function(x, a, b) {
      return Math.min(Math.max(x, a), b);
    },

    sat: function(x) {
      return Math.min(Math.max(x, 0.0), 1.0);
    },

    in_range: (x, a, b) => {
      return x >= a && x <= b;
    }
  };
})();

export const finite_state_machine = (() => {
  class FiniteStateMachine {
    constructor() {
      this._states = {};
      this._currentState = null;
    }

    _AddState(name, type) {
      this._states[name] = type;
    }

    SetState(name) {
      const prevState = this._currentState;
      if (prevState) {
        if (prevState.Name == name) {
          return;
        }
        prevState.Exit();
      }
      const state = new this._states[name](this);
      this._currentState = state;
      state.Enter(prevState);
    }

    Update(timeElapsed, input) {
      if (this._currentState) {
        this._currentState.Update(timeElapsed, input);
      }
    }
  }

  return {
    FiniteStateMachine: FiniteStateMachine
  };
})();
