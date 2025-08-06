// merchant.js (محدث)
// ملف التاجر -- يضيف العناصر للمخزون عند الشراء، ويشرح مكان وضع الموارد (الصور/النماذج).

// === بيانات اللاعب (يمكنك نقل هذه الخواص إلى كائن اللاعب الموجود في مشروعك) ===
let player = {
  name: "Player",
  gold: 100,               // الذهب الحالي
  inventory: [],           // مصفوفة العناصر: كل عنصر { id, name, qty, data }
  // إضافة عنصر للمخزون (إن وجد نزيد الكمية)
  addItem(item) {
    const existing = this.inventory.find(i => i.id === item.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      // نضيف نسخة من العنصر لتجنب مشاركة مراجع
      this.inventory.push(Object.assign({}, item, { qty: item.qty || 1 }));
    }
    console.log(`✅ ${item.name} تم اضافته للمخزون. الآن لديك: ${this.inventory.map(i => `${i.name} x${i.qty}`).join(", ")}`);
  },
  hasGold(amount) {
    return this.gold >= amount;
  },
  spendGold(amount) {
    if (!this.hasGold(amount)) return false;
    this.gold -= amount;
    console.log(`💰 تم خصم ${amount} ذهب. المتبقي: ${this.gold} ذهب.`);
    return true;
  }
};

/*
ASSET PLACEMENT (تعليقات — ضع ملفات الموارد هنا):
ضع أيقونات أو صور العناصر في المسار التالي داخل مشروعك:
  /assets/items/sword.png    <-- أيقونة السيف (مقترح 64x64)
  /assets/items/axe.png      <-- أيقونة الفأس (مقترح 64x64)

إذا تريد موديلات ثلاثية الأبعاد بدل أيقونات:
  /assets/models/items/sword.gltf
  /assets/models/items/axe.gltf
عدل المسارات في merchant.inventory أدناه إذا استخدمت مسار مختلف.
*/

// === تعريف التاجر ومحتويته ===
let merchant = { 
  x: 5, 
  y: 0, 
  z: 5, 
  inventory: [
    // أمثلة للعناصر: أضفت سيف وفأس كمطلوب، وحافظت على العناصر الأصلية
    { id: "sword_wooden", name: "سيف خشبي", price: 30, type: "weapon", dmg: 5, icon: "resources\weapons\FBX/Sword_2" },
    { id: "axe_basic",    name: "فأس",       price: 20, type: "weapon", dmg: 8, icon: "resources\weapons\FBX/Axe_Small" },
    { id: "home_upgrade", name: "ترقية المنزل", price: 50, type: "upgrade" },
    { id: "health_potion", name: "جرعة صحة", price: 15, type: "potion" }
  ] 
};

// === رسم/إظهار موقع التاجر في الكونسول (أو في اللعبة) ===
function drawMerchant() {
    console.log(`🧑‍🌾 التاجر متواجد عند (${merchant.x}, ${merchant.z})`);
}

// === التفاعل مع التاجر: استمع لمرة واحدة للزر T لفتح المتجر ===
function interactWithMerchant() {
    console.log("💬 اضغط [T] لفتح متجر التاجر");
    // لمنع تسجيل أكثر من مستمع نتحقق أولاً إن لم يتم تسجيله من قبل
    if (!window._merchant_key_listener_added) {
      document.addEventListener("keydown", (e) => {
        // نتحقق من 't' و'T' معًا لتوافق لوحة مفاتيح مختلفة
        if (e.key && e.key.toLowerCase() === "t") {
          openShop();
        }
      });
      window._merchant_key_listener_added = true;
    }
}

// === عرض لائحة المتجر في الكونسول ===
function openShop() {
    console.log("📦 متجر التاجر:");
    merchant.inventory.forEach((item, i) => {
        // إذا كان هناك أيقونة، نعرض مسارها في الكونسول كدليل
        const iconNote = item.icon ? ` (icon: ${item.icon})` : "";
        console.log(`${i + 1}. ${item.name} - ${item.price} ذهب${iconNote}`);
    });
    console.log("اكتب رقم العنصر في الكود للشراء (مثلاً: buyItem(1))");
    console.log("أو استخدم buyItemById('sword_wooden') للشراء بحسب المعرّف.");
}

// === شراء حسب رقم القائمة (كما كان عندك) ===
function buyItem(index) {
    const item = merchant.inventory[index - 1];
    if (!item) {
        console.log("❌ هذا العنصر غير موجود.");
        return;
    }
    _processPurchase(item);
}

// === شراء بحسب المعرف (أسهل للنداء برمجياً) ===
function buyItemById(id) {
    const item = merchant.inventory.find(it => it.id === id);
    if (!item) {
        console.log("❌ هذا العنصر غير موجود (المعرف غير صحيح).");
        return;
    }
    _processPurchase(item);
}

// === دالة داخلية لمعالجة الشراء: خصم الذهب، إضافة للمخزون أو تنفيذ تأثير آخر ===
function _processPurchase(item) {
    if (!player) {
      console.log("❌ خطأ: كائن اللاعب غير معرف.");
      return;
    }

    if (!player.hasGold(item.price)) {
        console.log(`❌ ليس لديك ما يكفي من الذهب. السعر: ${item.price} ذهب. لديك: ${player.gold} ذهب.`);
        return;
    }

    // خصم الذهب
    const spent = player.spendGold(item.price);
    if (!spent) {
      console.log("❌ فشل في خصم الذهب.");
      return;
    }

    // سلوك حسب نوع العنصر
    if (item.type === "weapon") {
      // نضيف السلاح مباشرة للمخزون
      player.addItem({
        id: item.id,
        name: item.name,
        qty: 1,
        data: { dmg: item.dmg || 0, type: "weapon" }
      });
      console.log(`🗡️ حصلت على: ${item.name} (ضرر: ${item.dmg || "غير معرف"})`);
    } else if (item.type === "upgrade") {
      // تنفيذ الدالة الخاصة بالترقية (يمكنك تعريف upgradeHome في مكان آخر)
      if (typeof upgradeHome === "function") {
        upgradeHome();
        console.log(`🏠 تم شراء: ${item.name} وتنفيذ الترقية.`);
      } else {
        console.log(`⚠️ اشتريت ${item.name}، لكن الدالة upgradeHome() غير معرفة في المشروع.`);
      }
    } else if (item.type === "potion") {
      // جرعة: نضيفها للمخزون كعنصر قابل للاستهلاك
      player.addItem({
        id: item.id,
        name: item.name,
        qty: 1,
        data: { type: "consumable", effect: "heal" }
      });
      console.log("🍷 تم شراء جرعة صحة وأضيفت للمخزون.");
    } else {
      // سلوك افتراضي: ضف للمخزون
      player.addItem({
        id: item.id || item.name,
        name: item.name,
        qty: 1,
        data: item.data || {}
      });
      console.log(`✅ تم شراء ${item.name} وأضيف للمخزون.`);
    }
}

// === دوال إضافية مساعدة (مثال لخاصية الترقية إن رغبت) ===
function upgradeHome() {
  // هذه مجرد مثال؛ ضع هنا كود الترقية الخاص بك
  console.log("🔧 تم تفعيل ترقية المنزل (ضع كود الترقية الفعلي هنا).");
}

// === تنفيذ افتراضي: اظهار التاجر وتفعيل الاستماع (يمكنك إزالته عند دمج في مشروعك) ===
drawMerchant();
interactWithMerchant();

// === اختبارات سريعة (يمكنك تعليقها) ===
// openShop();           // لعرض المتجر فوراً في الكونسول
// buyItem(2);           // تجربة شراء العنصر رقم 2
// buyItemById("axe_basic"); // تجربة شراء الفأس عبر المعرّف
