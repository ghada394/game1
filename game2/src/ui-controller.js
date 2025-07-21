// MultipleFiles/ui-controller.js
import { entity } from './entity.js';

export const ui_controller = (() => {

  class UIController extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._quests = {}; // المهام المعروضة في واجهة المستخدم
    }

    InitComponent() {
      this._iconBar = {
        stats: document.getElementById('icon-bar-stats'),
        inventory: document.getElementById('icon-bar-inventory'),
        quests: document.getElementById('icon-bar-quests'),
      };

      this._ui = {
        inventory: document.getElementById('inventory'),
        stats: document.getElementById('stats'),
        quests: document.getElementById('quest-journal'),
        questDetails: document.getElementById('quest-ui'), // إضافة عنصر تفاصيل المهمة
      };

      this._iconBar.inventory.onclick = (m) => { this._OnInventoryClicked(m); };
      this._iconBar.stats.onclick = (m) => { this._OnStatsClicked(m); };
      this._iconBar.quests.onclick = (m) => { this._OnQuestsClicked(m); };
      this._HideUI(); // إخفاء جميع واجهات المستخدم عند البداية
    }

    // إضافة/تحديث مهمة في دفتر المهام
    AddQuest(quest) {
      // إذا كانت المهمة موجودة، قم بتحديثها بدلاً من إضافتها مرة أخرى
      let questEntry = document.getElementById('quest-entry-' + quest.id);
      if (!questEntry) {
        questEntry = document.createElement('DIV');
        questEntry.className = 'quest-entry';
        questEntry.id = 'quest-entry-' + quest.id;
        questEntry.onclick = (evt) => {
          // عند النقر، اطلب من QuestComponent عرض التفاصيل
          this.FindEntity('player').GetComponent('QuestComponent')._OnQuestSelected(quest.id);
        };
        document.getElementById('quest-journal').appendChild(questEntry);
      }
      // تحديث نص المهمة ليعكس التقدم
      questEntry.innerText = quest.title;
      // يمكنك إضافة مؤشر للتقدم هنا إذا أردت، مثلاً:
      // questEntry.innerText = `${quest.title} (${quest.goals[0].current}/${quest.goals[0].count})`;

      this._quests[quest.id] = quest; // تخزين المهمة في قائمة المهام المعروضة
    }

    // إزالة مهمة من دفتر المهام (عند اكتمالها)
    RemoveQuest(questId) {
      const questEntry = document.getElementById('quest-entry-' + questId);
      if (questEntry) {
        questEntry.remove();
      }
      delete this._quests[questId];

      // إخفاء تفاصيل المهمة إذا كانت هي المهمة المحددة حاليًا
      const questComponent = this.FindEntity('player').GetComponent('QuestComponent');
      if (questComponent && questComponent._currentSelectedQuestId === questId) {
        this._ui.questDetails.style.visibility = 'hidden';
        questComponent._currentSelectedQuestId = null;
      }
    }

    _HideUI() {
      this._ui.inventory.style.visibility = 'hidden';
      this._ui.stats.style.visibility = 'hidden';
      this._ui.quests.style.visibility = 'hidden';
      this._ui.questDetails.style.visibility = 'hidden'; // إخفاء تفاصيل المهمة أيضًا
    }

    _OnQuestsClicked(msg) {
      const visibility = this._ui.quests.style.visibility;
      this._HideUI();
      this._ui.quests.style.visibility = (visibility ? '' : 'hidden');
      // إذا تم فتح دفتر المهام، أظهر تفاصيل المهمة المحددة حاليًا
      if (this._ui.quests.style.visibility === '') {
        const questComponent = this.FindEntity('player').GetComponent('QuestComponent');
        if (questComponent && questComponent._currentSelectedQuestId) {
          this._ui.questDetails.style.visibility = '';
        }
      }
    }

    _OnStatsClicked(msg) {
      const visibility = this._ui.stats.style.visibility;
      this._HideUI();
      this._ui.stats.style.visibility = (visibility ? '' : 'hidden');
    }

    _OnInventoryClicked(msg) {
      const visibility = this._ui.inventory.style.visibility;
      this._HideUI();
      this._ui.inventory.style.visibility = (visibility ? '' : 'hidden');
    }

    Update(timeInSeconds) {
      // يمكن إضافة منطق تحديث هنا إذا لزم الأمر
    }
  }

  return {
    UIController: UIController,
  };
})();
