// MultipleFiles/quest-component.js
import { entity } from "./entity.js";

export const quest_component = (() => {

  // تعريف أنواع الأهداف للمهام
  const QUEST_GOAL_TYPE = {
    KILL_MONSTERS: 'kill_monsters',
    COLLECT_ITEMS: 'collect_items',
    INTERACT_NPC: 'interact_npc',
    REACH_LOCATION: 'reach_location',
    UPGRADE_HOME: 'upgrade_home', // هدف جديد لترقية المنزل
    COLLECT_GOLD: 'collect_gold', // هدف جديد لجمع الذهب
  };

  // تعريف المهام (يمكن نقلها إلى ملف JSON أو قاعدة بيانات لاحقًا)
  const QUESTS_DATA = {
    'tutorial_kill_ghosts': {
      id: 'tutorial_kill_ghosts',
      title: 'أولى خطوات المغامرة: صيد الأشباح',
      text: 'مرحبًا بك في هانيوود أيها المغامر! مهمتك الأولى هي إثبات شجاعتك. اذهب واقضِ على 5 أشباح في الغابة القريبة.',
      type: 'main', // نوع المهمة: رئيسية
      goals: [
        { type: QUEST_GOAL_TYPE.KILL_MONSTERS, target: 'Ghost', count: 5, current: 0 }
      ],
      rewards: { gold: 50, experience: 100, item: 'Sword' },
      nextQuest: 'tutorial_upgrade_home', // المهمة التالية في السلسلة
    },
    'tutorial_upgrade_home': {
      id: 'tutorial_upgrade_home',
      title: 'تحسين المأوى: ترقية المنزل',
      text: 'لقد أثبت شجاعتك! الآن حان الوقت لترقية منزلك ليكون أكثر أمانًا. تفاعل مع منزلك وقم بترقيته.',
      type: 'main',
      goals: [
        { type: QUEST_GOAL_TYPE.UPGRADE_HOME, targetLevel: 2, currentLevel: 1 }
      ],
      rewards: { gold: 75, experience: 150 },
      nextQuest: 'side_collect_gold',
    },
    'side_collect_gold': {
      id: 'side_collect_gold',
      title: 'ثروة الغابة: جمع الذهب',
      text: 'الغابة مليئة بالكنوز! اجمع 100 قطعة ذهبية لتبدأ في بناء ثروتك.',
      type: 'side', // نوع المهمة: جانبية
      goals: [
        { type: QUEST_GOAL_TYPE.COLLECT_GOLD, targetAmount: 100, currentAmount: 0 }
      ],
      rewards: { gold: 150, experience: 50 },
      nextQuest: null,
    },
    // ... يمكن إضافة المزيد من المهام هنا
  };

  class QuestComponent extends entity.Component {
    constructor() {
      super();
      this._activeQuests = {}; // المهام النشطة حاليًا
      this._completedQuests = {}; // المهام المكتملة
      this._currentSelectedQuestId = null; // المهمة المحددة في واجهة المستخدم

      // إخفاء واجهة المهام عند البداية
      const e = document.getElementById('quest-ui');
      if (e) e.style.visibility = 'hidden';
    }

    InitComponent() {
      this._RegisterHandler('input.picked', (m) => this._OnPicked(m)); // للتفاعل مع NPC أو كائنات المهام
      this._RegisterHandler('monster.killed', (m) => this._OnMonsterKilled(m)); // لتتبع قتل الوحوش
      this._RegisterHandler('home.upgraded', (m) => this._OnHomeUpgraded(m)); // لتتبع ترقية المنزل
      this._RegisterHandler('gold.collected', (m) => this._OnGoldCollected(m)); // لتتبع جمع الذهب

      // بدء المهمة الأولى عند تحميل اللعبة
      this.StartQuest('tutorial_kill_ghosts');
    }

    // بدء مهمة جديدة
    StartQuest(questId) {
      if (this._activeQuests[questId] || this._completedQuests[questId]) {
        console.log(`Quest ${questId} is already active or completed.`);
        return;
      }

      const questData = QUESTS_DATA[questId];
      if (!questData) {
        console.error(`Quest data for ${questId} not found.`);
        return;
      }

      // نسخ بيانات المهمة لتتبع التقدم
      const newQuest = JSON.parse(JSON.stringify(questData));
      this._activeQuests[questId] = newQuest;
      this._AddQuestToJournal(newQuest);
      console.log(`Quest Started: ${newQuest.title}`);
    }

    // إكمال مهمة
    CompleteQuest(questId) {
      const quest = this._activeQuests[questId];
      if (!quest) return;

      // التحقق من أن جميع الأهداف مكتملة
      const allGoalsCompleted = quest.goals.every(goal => {
        if (goal.type === QUEST_GOAL_TYPE.KILL_MONSTERS) {
          return goal.current >= goal.count;
        } else if (goal.type === QUEST_GOAL_TYPE.UPGRADE_HOME) {
          return goal.currentLevel >= goal.targetLevel;
        } else if (goal.type === QUEST_GOAL_TYPE.COLLECT_GOLD) {
          return goal.currentAmount >= goal.targetAmount;
        }
        // ... أهداف أخرى
        return false;
      });

      if (!allGoalsCompleted) {
        console.log(`Quest ${quest.title} is not yet complete.`);
        return;
      }

      console.log(`Quest Completed: ${quest.title}`);
      this._completedQuests[questId] = quest;
      delete this._activeQuests[questId];

      // إزالة المهمة من واجهة المستخدم
      const ui = this.FindEntity('ui').GetComponent('UIController');
      ui.RemoveQuest(questId);

      // منح المكافآت
      this._GrantRewards(quest.rewards);

      // بدء المهمة التالية إذا وجدت
      if (quest.nextQuest) {
        this.StartQuest(quest.nextQuest);
      }
    }

    _GrantRewards(rewards) {
      const player = this.FindEntity('player');
      if (!player) return;

      if (rewards.gold) {
        player.Broadcast({ topic: 'gold.add', value: rewards.gold });
        console.log(`Received ${rewards.gold} gold.`);
      }
      if (rewards.experience) {
        player.Broadcast({ topic: 'health.add-experience', value: rewards.experience });
        console.log(`Received ${rewards.experience} experience.`);
      }
      if (rewards.item) {
        player.Broadcast({ topic: 'inventory.add', value: rewards.item, added: false });
        console.log(`Received item: ${rewards.item}.`);
      }
    }

    // تحديث التقدم في المهام
    _UpdateQuestProgress(questId, goalType, value) {
      const quest = this._activeQuests[questId];
      if (!quest) return;

      let updated = false;
      for (const goal of quest.goals) {
        if (goal.type === goalType) {
          if (goalType === QUEST_GOAL_TYPE.KILL_MONSTERS) {
            if (goal.target === value) { // value هنا هو اسم الوحش المقتول
              goal.current = Math.min(goal.count, goal.current + 1);
              updated = true;
            }
          } else if (goalType === QUEST_GOAL_TYPE.UPGRADE_HOME) {
            goal.currentLevel = value; // value هنا هو مستوى المنزل الجديد
            updated = true;
          } else if (goalType === QUEST_GOAL_TYPE.COLLECT_GOLD) {
            goal.currentAmount = Math.min(goal.targetAmount, goal.currentAmount + value); // value هنا هو كمية الذهب المضافة
            updated = true;
          }
          // ... تحديثات لأهداف أخرى
        }
      }

      if (updated) {
        this._AddQuestToJournal(quest); // تحديث عرض المهمة في واجهة المستخدم
        this.CompleteQuest(questId); // محاولة إكمال المهمة بعد التحديث
      }
    }

    // معالجات الأحداث
    _OnPicked(msg) {
      // يمكن استخدام هذا لتفاعل مع NPC أو كائنات معينة لبدء/إكمال المهام
      // مثال: إذا كان الكائن الذي تم التفاعل معه هو NPC معين، ابدأ مهمة
      // if (msg.entityName === 'some_npc_name') {
      //   this.StartQuest('some_quest_id');
      // }
    }

    _OnMonsterKilled(msg) {
      // msg.monsterName يجب أن يحتوي على اسم الوحش المقتول
      for (const questId in this._activeQuests) {
        this._UpdateQuestProgress(questId, QUEST_GOAL_TYPE.KILL_MONSTERS, msg.monsterName);
      }
    }

    _OnHomeUpgraded(msg) {
      // msg.newLevel يجب أن يحتوي على مستوى المنزل الجديد
      for (const questId in this._activeQuests) {
        this._UpdateQuestProgress(questId, QUEST_GOAL_TYPE.UPGRADE_HOME, msg.newLevel);
      }
    }

    _OnGoldCollected(msg) {
      // msg.amount يجب أن يحتوي على كمية الذهب المضافة
      for (const questId in this._activeQuests) {
        this._UpdateQuestProgress(questId, QUEST_GOAL_TYPE.COLLECT_GOLD, msg.amount);
      }
    }

    // إضافة مهمة إلى واجهة المستخدم (الدفتر)
    _AddQuestToJournal(quest) {
      const ui = this.FindEntity('ui').GetComponent('UIController');
      ui.AddQuest(quest);
      this._OnQuestSelected(quest.id); // عرض تفاصيل المهمة المضافة/المحدثة
    }

    // عرض تفاصيل المهمة عند اختيارها
    _OnQuestSelected(id) {
      const quest = this._activeQuests[id] || this._completedQuests[id];
      if (!quest) return;

      this._currentSelectedQuestId = id;

      const uiElement = document.getElementById('quest-ui');
      if (uiElement) uiElement.style.visibility = '';

      const titleElement = document.getElementById('quest-text-title');
      if (titleElement) titleElement.innerText = quest.title;

      const textElement = document.getElementById('quest-text');
      if (textElement) {
        let fullText = quest.text + '\n\n**الأهداف:**\n';
        quest.goals.forEach(goal => {
          if (goal.type === QUEST_GOAL_TYPE.KILL_MONSTERS) {
            fullText += `- اقضِ على ${goal.target}: ${goal.current}/${goal.count}\n`;
          } else if (goal.type === QUEST_GOAL_TYPE.UPGRADE_HOME) {
            fullText += `- قم بترقية المنزل إلى المستوى ${goal.targetLevel}: المستوى الحالي ${goal.currentLevel}\n`;
          } else if (goal.type === QUEST_GOAL_TYPE.COLLECT_GOLD) {
            fullText += `- اجمع الذهب: ${goal.currentAmount}/${goal.targetAmount}\n`;
          }
          // ... عرض أهداف أخرى
        });
        textElement.innerText = fullText;
      }
    }
  }

  return {
    QuestComponent,
    QUEST_GOAL_TYPE, // تصدير أنواع الأهداف لاستخدامها في مكونات أخرى
  };
})();
