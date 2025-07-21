
let playerGold = 100;
let merchant = { 
    x: 5, 
    y: 0, 
    z: 5, 
    inventory: [
        { name: "سيف خشبي", price: 30, type: "weapon", dmg: 5 },
        { name: "ترقية المنزل", price: 50, type: "upgrade" },
        { name: "جرعة صحة", price: 15, type: "potion" }
    ] 
};

function drawMerchant() {
    console.log(`🧑‍🌾 التاجر متواجد عند(${merchant.x}, ${merchant.z})`);
}

function interactWithMerchant() {
    console.log("💬 اضغط [T] لفتح متجر التاجر");
    document.addEventListener("keydown", (e) => {
        if (e.key === "t") {
            openShop();
        }
    });
}

function openShop() {
    console.log("📦 متجر التاجر:");
    merchant.inventory.forEach((item, i) => {
        console.log(`${i + 1}. ${item.name} - ${item.price} ذهب`);
    });
    console.log("اكتب رقم العنصر في الكود للشراء (مثلاً: buyItem(1))");
}


function buyItem(index) {
    const item = merchant.inventory[index - 1];
    if (!item) {
        console.log("❌ هذا العنصر غير موجود.");
        return;
    }
    
    if (playerGold >= item.price) {
        playerGold -= item.price; // خصم الذهب
        if (item.type === "weapon") {
            console.log(`🗡️ حصلت على: ${item.name} (ضرر: ${item.dmg})`);
        } else if (item.type === "upgrade") {
            upgradeHome(); // ترقية المنزل
        } else if (item.type === "potion") {
            console.log("🍷 شربت جرعة صحة");
        }
    } else {
        console.log(`❌ ليس لديك ما يكفي من الذهب. السعر: ${item.price} ذهب`);
    }
}

// تنفيذ الوظائف
drawMerchant();
interactWithMerchant();
