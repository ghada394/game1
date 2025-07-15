// المتغيرات العامة
let playerGold = 100;
let home = { level: 1, x: 0, y: 0, z: -5 };

// دالة رسم المنزل (Home)
function drawHome() {
    console.log(`🏠 Home at(${home.x},${home.z})-Level ${home.level}`);
}

// دالة ترقية المنزل
function upgradeHome() {
    const cost = home.level * 50;
    if (playerGold >= cost) {
        playerGold -= cost;
        home.level++;
        console.log(`✅ Home upgraded to level ${home.level}`);
    } else {
        console.log(`❌ Not enough gold. You need ${cost}`);
    }
}

// دالة التفاعل مع المنزل (Press E to upgrade)
function interactWithHome() {
    console.log(`💬 Press [E] to upgrade home (Level ${home.level})`);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'e') {
            upgradeHome();
        }
    });
}

// تنفيذ الوظائف
drawHome();
interactWithHome();
