/**
 * js_game/db_knowledge.js
 * 前端 AI 知识库 (完整提取版)
 * 包含了所有的六大人格、所有时代的爱豆黑料、黑话梗库，按需精准抽取。
 */

window.LoreDB = {
    // 1. 基础系统规则 (每次请求必带)
    coreRule: `你现在不是GM。你是同时登录了几十个小号的饭圈活人。每一条评论都是一个独立人格在特定情绪下的即时反应。
【核心规则】：
1. 严禁使用"xx"、"某人"、"某艺人"等占位符，必须使用真实姓名或提供的代称。
2. ID必须模仿真实网友，切忌系统默认风格，可使用中英文、颜文字、抽象词（如：momo、退退退、脆脆慢）。
3. 必须混入以下至少4种人格，且人格间必须有冲突（比如护主、撕逼、拱火）：
   - 女友粉/梦女：叫老公，护夫，对线同担和CP粉。
   - 妈粉：叫宝宝，心疼，战力持久，爱骂公司。
   - CP粉(嗑药鸡)：找糖嗑，已造谣莫辜负，和唯粉互骂。
   - 黑粉/辱追：阴阳怪气，看他不爽但忍不住关注，抓着黑料往死里骂。
   - 乐子人/路人：纯看戏，拱火"打起来"，有时说真话最狠。
   - 数据批/事业粉：只关心数据、榜单，恨铁不成钢，催做数据。`,

    // 2. 各大平台专属画风 (已去除多余的点赞格式指令)
    platforms: {
        "weibo": "【微博画风】：戾气重，容易吵架。粉丝控评与黑粉对骂激烈。女友粉、妈粉、黑粉极多。多用拼音缩写（如xfxy, kswl）。",
        "douban": "【豆瓣画风】：阴阳怪气，爱扒皮，缺德路人和乐子人极多。爱用“主楼更新”、“放个瓜”、“内赞”。喜欢写长篇大论分析或抽象发言。",
        "douyin": "【抖音画风】：极其接地气，口语化，发疯。路人、颜粉多。常出现“啊啊啊老公”、“前面那个你别走”、“李飞你睡得着吗”。",
        "xhs": "【小红书画风】：精致干货，颜控。妈粉、事业粉和生活粉多。语气多为“救命！这也太好看了吧”、“绝美穿搭”，高频使用表情符号🌸✨🍓。",
        "bilibili": "【B站画风】：二次元、梗类、考古党多。粉丝与CP粉多。爱带“君”或“酱”后缀，弹幕文化浓厚。"
    },

    // 3. 所有艺人全量档案库 (含代称、嘲称与专属黑料)
    idols: {
        // ========== 二代 (时代少年团) ==========
        "马嘉祺": {
            generation: "二代(老炸/炸/🥚团)",
            aliases: "炸1、风、老1。嘲称：307、🎒",
            blackMaterial: "高考307分事件（数学25+英语44），常被用'2544307'数字梗嘲讽学霸人设翻车。"
        },
        "丁程鑫": {
            generation: "二代(老炸/炸/🥚团)",
            aliases: "炸2、年、老2、ddgg、嘀嘀咕咕",
            blackMaterial: "常被黑粉针对业务能力，嘲讽唱功争议、人气下滑。"
        },
        "宋亚轩": {
            generation: "二代(老炸/炸/🥚团)",
            aliases: "炸3、盆、老3、盆盆。嘲称：大头、大盆",
            blackMaterial: "被嘲唱歌气息虚、头大如盆、外形争议。"
        },
        "刘耀文": {
            generation: "二代(老炸/炸/🥚团)",
            aliases: "炸4、碗、老4。嘲称：牛、牛牛、要闻",
            blackMaterial: "被嘲脖子粗；曾有手机屏保韩国女团事件；粉丝爱吹'50亿票房实绩'实为小配角，常被用来反讽。"
        },
        "张真源": {
            generation: "二代(老炸/炸/🥚团)",
            aliases: "炸5、爱酱、老5。嘲称：小张张",
            blackMaterial: "长相争议、被嘲讽是表演型人格、戏多。"
        },
        "严浩翔": {
            generation: "二代(老炸/炸/🥚团)",
            aliases: "炸6、戏、老6。嘲称：梅k哥、臭锅、烟豪翔、好香、香锅",
            blackMaterial: "身材管理争议、打赏女主播事件（被称为研究金融）、商K事件、苏梅岛事件（苏梅岛的饭）、家庭争议。被嘲夜生活丰富。"
        },
        "贺峻霖": {
            generation: "二代(老炸/炸/🥚团)",
            aliases: "炸7、影、老7。嘲称：168",
            blackMaterial: "被嘲身高168争议、唱跳实力欠缺。"
        },

        // ========== 三代 (TOP登陆少年 / 厂牌) ==========
        "朱志鑫": {
            generation: "三代(登陆少年)",
            aliases: "ZZX、棍。嘲称：大朱哥、朱哥、诸葛、打诸葛",
            blackMaterial: "'展信佳'误认为人名(文盲事件)；私下找福利姬被粉丝登闲鱼发现(福利姬事件)。"
        },
        "苏新皓": {
            generation: "三代(登陆少年)",
            aliases: "SXH、铲。嘲称：铲爷",
            blackMaterial: "宿舍说脏话、竖中指，被嘲素质差、人设崩塌。"
        },
        "张泽禹": {
            generation: "三代(登陆少年)",
            aliases: "ZYZ、宝。嘲称：打饱嗝、大宝哥、芒果脸",
            blackMaterial: "恋足癖传闻；因脸型被调侃帝王相、芒果脸(与张极并称芒果TV)。"
        },
        "张极": {
            generation: "三代(登陆少年)",
            aliases: "ZJ。嘲称：大张坤、📺🐔、张坤、芒果脸",
            blackMaterial: "在《披哥》中欺负大龄嘉宾被指人品问题。"
        },
        "左航": {
            generation: "三代(登陆少年)",
            aliases: "ZH。嘲称：秃猴、猴",
            blackMaterial: "拿石头砸老奶奶事件、骑摩托撞人，被黑粉称为法制咖、暴力倾向。"
        },
        "张峻豪": {
            generation: "三代(登陆少年)",
            aliases: "ZJH、顺。嘲称：大鼻",
            blackMaterial: "网恋事件、私联粉丝、青春叛逆。"
        },
        "余宇涵": {
            generation: "三代(登陆少年)",
            aliases: "YYH、🐟。嘲称：捞鱼",
            blackMaterial: "辱女事件(玩师兄黑梗、嘴同事被爆)，事后发声明称被'异地登陆'，常被用'异地登陆'梗嘲讽。"
        },
        "张子墨": {
            generation: "三代(其余)",
            aliases: "ZZM。嘲称：了黑",
            blackMaterial: "歌曲抄袭事件，被嘲才华含水量高。"
        },
        "穆祉丞": {
            generation: "三代(其余)",
            aliases: "MZC。嘲称：木墩、墩子",
            blackMaterial: "被嘲五短身材；音乐节'橙粉色举起来其他颜色idont care'亲手发卖拆CP事件。"
        },

        // ========== 四代 (🎀) ==========
        "官俊臣": { generation: "四代(🎀)", aliases: "🏆", blackMaterial: "被嘲人气低、透明人体质(nbcs)。" },
        "张桂源": { generation: "四代(🎀)", aliases: "🐲、🐉。嘲称：蛙蛙、🐸", blackMaterial: "低情商，私联塌房rapper。" },
        "王橹杰": { generation: "四代(🎀)", aliases: "🐬、🎀1", blackMaterial: "被嘲爱看耽美小说、中二病、唱跳实力差。" },
        "张函瑞": { generation: "四代(🎀)", aliases: "🐱。嘲称：墩子、🐢", blackMaterial: "被嘲脖子前倾、身材比例差、爱翻白眼。" },
        "杨博文": { generation: "四代(🎀)", aliases: "🐑", blackMaterial: "被嘲自负、中庭过长(马脸)、爱爹味说教。" },
        "陈奕恒": { generation: "四代(🎀)", aliases: "老肘、🍖", blackMaterial: "被嘲发胖，13岁私联粉丝事件。" },
        "左奇函": { generation: "四代(🎀)", aliases: "🐹。嘲称：🐭", blackMaterial: "被嘲长相似鼠、身材如细狗。" },
        "陈浚铭": { generation: "四代(🎀)", aliases: "🐷", blackMaterial: "童言无忌事件多、顺直男口癖导致被指低情商。" },
        "陈思罕": { generation: "四代(🎀)", aliases: "☔️", blackMaterial: "人气低但强行越番、鼻孔外翻外形争议。" },
        "李煜东": { generation: "四代(🎀)", aliases: "❄️", blackMaterial: "颧骨外扩，被嘲唱跳四代倒数第一。" },
        "杨涵博": { generation: "四代(🎀)", aliases: "🍔", blackMaterial: "无特别重大黑料，但属四代矩阵内成员。" },
        "魏子宸": { generation: "四代(🎀)", aliases: "🍉", blackMaterial: "无特别重大黑料，但属四代矩阵内成员。" },
        "张奕然": { generation: "四代(🎀)", aliases: "🔥🐷", blackMaterial: "无特别重大黑料，但属四代矩阵内成员。" }
    },

    // 4. 饭圈/网络热梗与黑话大全 (动态提取)
    dictionary: {
        "热梗抽象": "这又是谁的一辈子、世界对我的霸凌从XX开始、正在天上失禁地看着我、宝子你继续、被资本做局了、没有XX的义务、神金、闹麻了、包的、那很有生活了",
        "缺德发泄": "抬走、这很难评、隔行如隔山、我祝他成功吧、粉丝吃点好的吧、溺爱、闭眼吹、岁月史书、裸奔",
        "饭圈黑话": "kswl、kyj、xfxy、yxh、毒唯、提纯、端水、虐粉、脂粉、越番、皇族、防爆、拔旗",
        "楼娱专属": "楼丝、上楼、下楼、李飞、sdfj/疯峻、草台班子、太子、吸血、倒吸"
    },

    /**
     * 👑 核心检索引擎 (前端 RAG)
     * 功能：根据传入的人物名单和平台，动态组装出极度精简但杀伤力拉满的 Prompt！
     * @param {Array} targetIdols - 比如 ['马嘉祺', '严浩翔']
     * @param {string} platform - 比如 'weibo'
     * @returns {string} 
     */
    retrieveContext: function(targetIdols, platform) {
        let contextParts = [this.coreRule];

        // 1. 注入平台氛围设定
        if (this.platforms[platform]) {
            contextParts.push(`\n${this.platforms[platform]}`);
        }

        // 2. 精准提取关联人物的黑料包 (严禁跨代混乱)
        if (targetIdols && targetIdols.length > 0) {
            let idolContext = "\n【当前出场艺人设定(必须转化为口语化吐槽，不可死板复读。非出场艺人不要提)】：";
            
            targetIdols.forEach(name => {
                const info = this.idols[name];
                if (info) {
                    idolContext += `\n- ${name} [${info.generation}]：代称/嘲称：${info.aliases}。黑料弹药：${info.blackMaterial}`;
                }
            });
            contextParts.push(idolContext);
            contextParts.push(`【铁律】：严禁跨代！二代评论区绝不可出现三/四代黑话或代称，反之亦然。`);
        }

        // 3. 注入丰富的语料库词汇
        contextParts.push(`\n【可用热梗词汇包(自然化用，单句最多用1个)】：\n抽象热梗：${this.dictionary["热梗抽象"]}\n缺德阴阳：${this.dictionary["缺德发泄"]}\n楼娱饭圈：${this.dictionary["饭圈黑话"]}，${this.dictionary["楼娱专属"]}`);

        return contextParts.join('\n');
    }
};