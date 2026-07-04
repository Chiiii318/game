const NPC_DB = {
    "宋亚轩": { avatar: "img/syx.jpg", color: "#4a90d9" },
    "马嘉祺": { avatar: "img/mjq.jpg", color: "#6c5ce7" },
    "丁程鑫": { avatar: "img/dcx.jpg", color: "#ff7675" },
    "刘耀文": { avatar: "img/lyw.jpg", color: "#d63031" },
    "张真源": { avatar: "img/zzy.jpg", color: "#00b894" },
    "严浩翔": { avatar: "img/yhx.jpg", color: "#e17055" },
    "贺峻霖": { avatar: "img/hjl.jpg", color: "#0984e3" },
    "朱志鑫": { avatar: "img/zzx.jpg", color: "#fd79a8" },
    "default": { avatar: "", color: "#b2bec3" }
};

function getNpcAvatar(npcName) {
    if (NPC_DB[npcName] && NPC_DB[npcName].avatar) {
        return NPC_DB[npcName].avatar;
    }
    return null;
}

function getNpcColor(npcName) {
    if (NPC_DB[npcName] && NPC_DB[npcName].color) {
        return NPC_DB[npcName].color;
    }
    return NPC_DB["default"].color;
}
