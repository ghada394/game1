// ** تعريف المتغيرات الأساسية **

let isDay = true; // حالة اليوم (True: يوم, False: ليل)
let timeCounter = 0; // عداد الوقت
const dayDuration = 60 * 10; // مدة اليوم بالثواني (مثلاً 10 دقائق)
const monsters = []; // مصفوفة لتخزين الوحوش

// ** تحديث الوقت و التبديل بين اليوم والليل **

function updateTime(deltaTime) {
  timeCounter += deltaTime; // إضافة الوقت المنقضي

  // التبديل بين اليوم والليل بناءً على المدة
  if (timeCounter >= dayDuration) {
    isDay = !isDay; // التبديل بين اليوم والليل
    timeCounter = 0; // إعادة تعيين عداد الوقت

    if (!isDay) {
      spawnNightMonsters(); // استدعاء الوحوش الليلية
    } else {
      clearMonsters(); // مسح الوحوش خلال النهار
    }
  }
}

// ** إنشاء الوحوش الليلية **

function spawnNightMonsters() {
  for (let i = 0; i < 5; i++) {
    // إنشاء وحش جديد بمواصفات عشوائية
    const monster = {
      id: `m${Date.now()}_${i}`, // معرف فريد لكل وحش
      x: Math.random() * 20 - 10, // موقع عشوائي بين -10 و 10
      y: 0, // الارتفاع
      z: Math.random() * 20 - 10, // موقع عشوائي بين -10 و 10
      hp: 50, // نقاط الصحة
    };

    monsters.push(monster); // إضافة الوحش إلى قائمة الوحوش
    console.log("Spawned monster:", monster); // طباعة تفاصيل الوحش
  }
}

// ** مسح الوحوش في النهار **

function clearMonsters() {
  monsters.length = 0; // مسح جميع الوحوش
  console.log("Monsters cleared for daytime"); // طباعة رسالة توضح أن الوحوش تم مسحها
}

// ** الحلقة الرئيسية للعبة **

function gameLoop(deltaTime) {
  updateTime(deltaTime); // تحديث الوقت في كل دورة من الحلقة
}
