// ══════════════════════════════════════
// NPC 数据库 (专门管理头像、昵称等固定设定)
// ══════════════════════════════════════

const NPC_DB = {
    // === 时代少年团 ===
    "宋亚轩": {
        avatar: "img/syx.jpg",         // 填入你 img 文件夹里的文件名，比如 syx.jpg
        color: "#4a90d9"               // 如果没找到图片，默认显示的背景颜色
    },
    "马嘉祺": {
        avatar: "img/mjq.jpg",         
        color: "#6c5ce7"
    },
    "丁程鑫": {
        avatar: "img/dcx.jpg",         
        color: "#ff7675"
    },
    "刘耀文": {
        avatar: "img/lyw.jpg",
        color: "#d63031"
    },
    "张真源": {
        avatar: "img/zzy.jpg",
        color: "#00b894"
    },
    "严浩翔": {
        avatar: "img/yhx.jpg",
        color: "#e17055"
    },
    "贺峻霖": {
        avatar: "img/hjl.jpg",
        color: "#0984e3"
    },
    
    // === 三代 ===
    "朱志鑫": {
        avatar: "img/zzx.jpg",
        color: "#fd79a8"
    },
    // ... 其他人你可以自己随时往下加 ...

    // 默认兜底（如果 AI 生成了一个不在这名单上的人）
    "default": {
        avatar: "",
        color: "#b2bec3"
    }
};

// 专门用来获取头像的便捷函数，后面手机系统会用到它
function getNpcAvatar(npcName) {
    if (NPC_DB[npcName] && NPC_DB[npcName].avatar) {
        return NPC_DB[npcName].avatar;
    }
    return null; // 如果没图，返回 null，系统会自动用名字首字母代替
}

function getNpcColor(npcName) {
    if (NPC_DB[npcName] && NPC_DB[npcName].color) {
        return NPC_DB[npcName].color;
    }
    return NPC_DB["default"].color;
}