        // MultipleFiles/hud.js
        export class HUD {
          constructor() {
            this._CreateUI();
          }

          _CreateUI() {
            this._container = document.createElement('div');
            this._container.style.position = 'absolute';
            this._container.style.top = '10px';
            this._container.style.left = '10px';
            this._container.style.color = 'white';
            this._container.style.fontFamily = 'Arial';
            this._container.style.fontSize = '20px';
            this._container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this._container.style.padding = '10px';
            this._container.style.borderRadius = '10px';
            this._container.style.zIndex = '100';
            document.body.appendChild(this._container);

            this._healthEl = document.createElement('div');
            this._dayEl = document.createElement('div');
            this._enemiesEl = document.createElement('div');
            this._goldEl = document.createElement('div'); // عنصر جديد للذهب

            this._container.appendChild(this._healthEl);
            this._container.appendChild(this._dayEl);
            this._container.appendChild(this._enemiesEl);
            this._container.appendChild(this._goldEl); // إضافة عنصر الذهب
          }

          update({ health, day, enemies, gold }) { // إضافة gold إلى المعلمات
            this._healthEl.textContent = `❤️ الصحة: ${health}`;
            this._dayEl.textContent = `📅 اليوم: ${day}`;
            this._enemiesEl.textContent = `👾 أعداء: ${enemies}`;
            this._goldEl.textContent = `💰 الذهب: ${gold}`; // تحديث عرض الذهب
          }
        }
