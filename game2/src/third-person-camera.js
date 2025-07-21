import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import { entity } from './entity.js';

export const third_person_camera = (() => {

  class ThirdPersonCamera extends entity.Component {
    constructor(params) {
      super();

      this._params = params;
      this._camera = params.camera;
      this._domElement = document.getElementById('threejs'); // نأخذ العنصر مباشرة

      this._currentPosition = new THREE.Vector3();
      this._currentLookat = new THREE.Vector3();

      this._yaw = 0;
      this._pitch = 0;
      this._sensitivity = 0.002;

      this.viewMode = 0; // 0 = خلفي، 1 = أمامي

      // التقاط حركة الماوس فقط عندما يتم تفعيل pointer lock
      this._domElement.addEventListener('mousemove', (e) => this._OnMouseMove(e), false);

      // تبديل الكاميرا الأمامية/الخلفية عند الضغط على F5
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
          e.preventDefault();
          this._ToggleViewMode();
        }
      });
    }

    _ToggleViewMode() {
      this.viewMode = (this.viewMode + 1) % 2;

      if (this.viewMode === 0) {
        this._yaw = 0;
      } else {
        this._yaw = Math.PI;
      }
    }

    _OnMouseMove(event) {
      if (document.pointerLockElement === this._domElement) {
        this._yaw -= event.movementX * this._sensitivity;
        this._pitch -= event.movementY * this._sensitivity;

        const pitchLimit = Math.PI / 2;
        this._pitch = Math.max(-pitchLimit, Math.min(pitchLimit, this._pitch));
      }
    }

    _CalculateIdealOffset() {
      const distance = 15;
      const height = 10;

      const offset = new THREE.Vector3();
      offset.x = distance * Math.sin(this._yaw) * Math.cos(this._pitch);
      offset.y = height + distance * Math.sin(this._pitch);
      offset.z = distance * Math.cos(this._yaw) * Math.cos(this._pitch);

      offset.add(this._params.target._position);

      return offset;
    }

    _CalculateIdealLookat() {
      const lookAt = this._params.target._position.clone();
      lookAt.y += 5;
      return lookAt;
    }

    Update(timeElapsed) {
      const idealOffset = this._CalculateIdealOffset();
      const idealLookat = this._CalculateIdealLookat();

      const t = 1.0 - Math.pow(0.01, timeElapsed);

      this._currentPosition.lerp(idealOffset, t);
      this._currentLookat.lerp(idealLookat, t);

      this._camera.position.copy(this._currentPosition);
      this._camera.lookAt(this._currentLookat);
    }
  }

  return {
    ThirdPersonCamera: ThirdPersonCamera
  };

})();
