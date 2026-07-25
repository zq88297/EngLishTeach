import {
  curriculumWordGroups,
  sharedCurriculum,
  wordById,
} from "./curriculum";
import {
  CasePackSchema,
  type CasePack,
  type ChapterDefinition,
  type WordDefinition,
} from "./schemas";

type ChapterSeed = {
  slug: string;
  titleZh: string;
  summaryZh: string;
  locationZh: string;
  npcNameZh: string;
  clueZh: string;
  environmentalSoundZh: string;
};

const courtSeeds: ChapterSeed[] = [
  {
    slug: "missing-seal",
    titleZh: "禁苑失印",
    summaryZh: "一枚只在夜间启用的铜印从封闭书库消失。",
    locationZh: "紫宸门档案廊",
    npcNameZh: "掌灯女官",
    clueZh: "沾有松烟墨的封条",
    environmentalSoundZh: "远处更鼓与纸页摩擦声",
  },
  {
    slug: "bitter-prescription",
    titleZh: "苦药留痕",
    summaryZh: "御医的药方与库房领药记录出现矛盾。",
    locationZh: "太医院药库",
    npcNameZh: "值夜医官",
    clueZh: "被改写剂量的处方",
    environmentalSoundZh: "药碾转动与铜壶沸水声",
  },
  {
    slug: "silent-cipher",
    titleZh: "无声密牒",
    summaryZh: "密牒上的符号指向一条已经封闭的宫道。",
    locationZh: "西偏殿密室",
    npcNameZh: "译书吏",
    clueZh: "缺少末行的密牒",
    environmentalSoundZh: "木窗震动与低声诵读",
  },
  {
    slug: "banquet-shadow",
    titleZh: "宴影双重",
    summaryZh: "宴会座次与两名证人的回忆无法同时成立。",
    locationZh: "含章殿宴厅",
    npcNameZh: "礼仪官",
    clueZh: "被调换的宾客名牌",
    environmentalSoundZh: "杯盏轻碰与帷幕摆动",
  },
  {
    slug: "reluctant-guard",
    titleZh: "守门人的迟疑",
    summaryZh: "一名守卫隐瞒了侧门在雨夜开启的时间。",
    locationZh: "北侧雨廊",
    npcNameZh: "羽林卫",
    clueZh: "沾着红泥的钥匙",
    environmentalSoundZh: "骤雨与铠甲轻响",
  },
  {
    slug: "edited-testimony",
    titleZh: "被剪短的证词",
    summaryZh: "录下的口供少了决定嫌疑人去向的七秒。",
    locationZh: "审录房",
    npcNameZh: "录事参军",
    clueZh: "断裂的蜡筒刻痕",
    environmentalSoundZh: "蜡筒转轴与庭院风声",
  },
  {
    slug: "dawn-verdict",
    titleZh: "黎明裁决",
    summaryZh: "所有证据在日出前汇合，你必须指出真正的操纵者。",
    locationZh: "承天门议事厅",
    npcNameZh: "首席审议官",
    clueZh: "完整的出入时间线",
    environmentalSoundZh: "晨钟与逐渐靠近的人群声",
  },
];

const citySeeds: ChapterSeed[] = [
  {
    slug: "midnight-call",
    titleZh: "零点来电",
    summaryZh: "失踪记者的号码在停用三天后再次拨出。",
    locationZh: "海港线末班站",
    npcNameZh: "夜班调度员",
    clueZh: "写着储物柜号码的车票",
    environmentalSoundZh: "电流杂音与远处列车制动声",
  },
  {
    slug: "toxic-rain",
    titleZh: "雨水样本",
    summaryZh: "高架桥下的粉末与匿名报告指向废弃实验室。",
    locationZh: "滨河高架桥",
    npcNameZh: "环境检验员",
    clueZh: "密封不完整的样本袋",
    environmentalSoundZh: "暴雨、轮胎积水声与警报蜂鸣",
  },
  {
    slug: "broken-signal",
    titleZh: "断续信号",
    summaryZh: "一段窄频广播不断重复同一组坐标。",
    locationZh: "旧通信塔",
    npcNameZh: "无线电爱好者",
    clueZh: "被截获的十六秒广播",
    environmentalSoundZh: "天线震颤与短波噪声",
  },
  {
    slug: "glass-banquet",
    titleZh: "玻璃宴会",
    summaryZh: "科技酒会上，一位证人的胸牌出现在两个楼层。",
    locationZh: "临港会展中心",
    npcNameZh: "活动经理",
    clueZh: "双重刷卡记录",
    environmentalSoundZh: "空调低鸣与电梯到达提示音",
  },
  {
    slug: "service-tunnel",
    titleZh: "维修隧道",
    summaryZh: "封闭隧道里的脚印说明有人提前转移了设备。",
    locationZh: "地铁维修层",
    npcNameZh: "线路工程师",
    clueZh: "缺失一页的巡检簿",
    environmentalSoundZh: "滴水、通风机与金属回声",
  },
  {
    slug: "false-broadcast",
    titleZh: "伪造直播",
    summaryZh: "直播中的城市钟声与画面时间相差十一分钟。",
    locationZh: "海湾媒体楼",
    npcNameZh: "音频编辑",
    clueZh: "保留原始时间码的母带",
    environmentalSoundZh: "服务器风扇与走廊广播",
  },
  {
    slug: "harbor-blackout",
    titleZh: "港区熄灯",
    summaryZh: "停电倒计时开始，最终信号即将在海底机房发出。",
    locationZh: "港区控制中心",
    npcNameZh: "应急指挥员",
    clueZh: "完整的基站切换记录",
    environmentalSoundZh: "备用发电机与低频警报",
  },
];

function contentId(...parts: Array<string | number>): string {
  return parts.join("-");
}

function selectConfusable(word: WordDefinition): string {
  return (
    word.confusableIds.find((wordId) => wordById.has(wordId)) ??
    word.confusableIds[0]
  );
}

function readingBody(
  seed: ChapterSeed,
  newWords: WordDefinition[],
): string {
  const words = newWords.map((word) => word.word);

  return [
    "At",
    seed.locationZh,
    "the investigator compared a written statement with the physical record.",
    "The first note described",
    words[0],
    "as the central clue, but a later entry used",
    words[1],
    "in a way that changed the timeline.",
    "A witness insisted that the room had remained locked.",
    "However, the marks beside the door suggested a different sequence.",
    "To reach a credible conclusion, the team had to",
    words[2],
    "each claim, identify what the document tried to",
    words[3],
    "and decide whether the final detail could",
    words[4],
    "the missing connection.",
    "The evidence was useful only when read in context rather than as an isolated word.",
  ].join(" ");
}

function listeningTranscript(
  seed: ChapterSeed,
  newWords: WordDefinition[],
): string {
  return [
    "I checked the record twice before calling you.",
    "The item connected to",
    newWords[0].word,
    "was present at the beginning of my shift, but the log later seemed to",
    newWords[1].word,
    "that fact.",
    "Please compare my statement with the timestamp.",
    "If they do not correspond, someone may be trying to",
    newWords[2].word,
    "what happened at",
    seed.locationZh + ".",
  ].join(" ");
}

function buildChapter(
  caseId: string,
  seed: ChapterSeed,
  index: number,
): ChapterDefinition {
  const order = index + 1;
  const chapterId = contentId(caseId, "chapter", order);
  const briefingId = contentId(chapterId, "briefing");
  const evidenceId = contentId(chapterId, "evidence");
  const checkpointId = contentId(chapterId, "checkpoint");
  const newWordIds = curriculumWordGroups[index];
  const reviewWordIds = curriculumWordGroups[(index + 6) % 7].slice(0, 3);
  const newWords = newWordIds.map((wordId) => {
    const word = wordById.get(wordId);

    if (!word) {
      throw new Error("Missing curriculum word: " + wordId);
    }

    return word;
  });
  const briefingSafeOutcomeId = contentId(briefingId, "safe");
  const briefingRiskOutcomeId = contentId(briefingId, "risk");
  const evidenceSafeOutcomeId = contentId(evidenceId, "safe");
  const evidenceRiskOutcomeId = contentId(evidenceId, "risk");

  return {
    id: chapterId,
    order,
    titleZh: seed.titleZh,
    summaryZh: seed.summaryZh,
    startEncounterId: briefingId,
    newWordIds,
    reviewWordIds,
    dialogues: [
      {
        id: briefingId,
        npcId: contentId(caseId, seed.slug, "npc"),
        npcNameZh: seed.npcNameZh,
        promptZh:
          "对方给出两种处理方向。输入对应英文，决定如何核实" +
          seed.clueZh +
          "。",
        spokenLineEn:
          "The detail may " +
          newWords[0].word +
          " what the first witness tried to " +
          newWords[1].word +
          ".",
        options: [
          {
            id: contentId(briefingId, "option", "safe"),
            intentZh: newWords[0].meaningZh,
            targetWordId: newWords[0].id,
            outcomeNodeId: briefingSafeOutcomeId,
            riskLevel: 0,
          },
          {
            id: contentId(briefingId, "option", "risk"),
            intentZh: newWords[1].meaningZh,
            targetWordId: newWords[1].id,
            outcomeNodeId: briefingRiskOutcomeId,
            riskLevel: 1,
          },
        ],
        countdownSeconds: 15,
        timeoutOptionId: contentId(briefingId, "option", "risk"),
        checkpointId,
      },
      {
        id: evidenceId,
        npcId: contentId(caseId, seed.slug, "analyst"),
        npcNameZh: "总部分析员",
        promptZh: "结合证物语境，输入最符合下一步调查动作的英文。",
        spokenLineEn:
          "We should " +
          newWords[2].word +
          " the source before we " +
          newWords[3].word +
          " the result.",
        options: [
          {
            id: contentId(evidenceId, "option", "safe"),
            intentZh: newWords[2].meaningZh,
            targetWordId: newWords[2].id,
            outcomeNodeId: evidenceSafeOutcomeId,
            riskLevel: 0,
          },
          {
            id: contentId(evidenceId, "option", "risk"),
            intentZh: newWords[3].meaningZh,
            targetWordId: newWords[3].id,
            outcomeNodeId: evidenceRiskOutcomeId,
            riskLevel: 1,
          },
        ],
        countdownSeconds: 15,
        timeoutOptionId: contentId(evidenceId, "option", "risk"),
        checkpointId,
      },
    ],
    outcomes: [
      {
        id: briefingSafeOutcomeId,
        textZh: "你保留了证据链，案件时钟没有推进。",
        nextEncounterId: evidenceId,
        advancesCaseClock: false,
      },
      {
        id: briefingRiskOutcomeId,
        textZh: "仓促判断惊动了相关人员，案件时钟推进一格。",
        nextEncounterId: evidenceId,
        advancesCaseClock: true,
      },
      {
        id: evidenceSafeOutcomeId,
        textZh: "证物与证词完成交叉核验，本章线索成立。",
        nextEncounterId: null,
        advancesCaseClock: false,
      },
      {
        id: evidenceRiskOutcomeId,
        textZh: "错误方向消耗了调查窗口，但你获得了可解释的订正。",
        nextEncounterId: null,
        advancesCaseClock: true,
      },
    ],
    checkpoints: [
      {
        id: checkpointId,
        titleZh: "进入" + seed.locationZh,
        encounterId: briefingId,
      },
    ],
    readingArtifact: {
      id: contentId(chapterId, "reading"),
      titleZh: seed.clueZh,
      bodyEn: readingBody(seed, newWords),
      questionZh: "哪一个目标词最能概括需要确认的核心线索？",
      acceptedAnswerWordIds: [newWords[0].id],
      glossary: newWords.slice(0, 3).map((word) => ({
        wordId: word.id,
        noteZh: word.meaningZh,
      })),
    },
    listeningArtifact: {
      id: contentId(chapterId, "listening"),
      titleZh: seed.npcNameZh + "的口述记录",
      audioSrc: "/audio/" + caseId + "/chapter-" + order + ".mp3",
      durationSeconds: 45,
      speakerZh: seed.npcNameZh,
      environmentalSoundZh: seed.environmentalSoundZh,
      transcriptEn: listeningTranscript(seed, newWords),
      questionZh: "说话者要求调查员优先核对什么？",
      acceptedAnswerWordIds: [newWords[1].id],
    },
    traps: [
      {
        id: contentId(chapterId, "trap"),
        type: index % 2 === 0 ? "meaning" : "collocation",
        promptZh: "选择在当前语境中不会混淆调查方向的目标词。",
        targetWordId: newWords[2].id,
        distractorWordIds: [selectConfusable(newWords[2])],
        explanationZh:
          newWords[2].word +
          " 在本章表示“" +
          newWords[2].meaningZh +
          "”，不能与近义或近形词互换。",
        encounterId: evidenceId,
      },
    ],
    completionTextZh:
      "证物已归档：" + seed.clueZh + "。下一章将检验这条线索是否可信。",
  };
}

function buildCase(
  id: "court" | "city",
  seeds: ChapterSeed[],
): CasePack {
  const theme = id;
  const isCourt = id === "court";

  return CasePackSchema.parse({
    id,
    version: "1.0.0",
    theme,
    contentWarningsZh: isCourt
      ? ["权力胁迫", "囚禁暗示"]
      : ["轻度跳吓", "追逐", "停电"],
    titleZh: isCourt ? "丹阙疑云" : "零点回声",
    summaryZh: isCourt
      ? "在七次调查中追查失印、药方与被改写的宫廷时间线。"
      : "沿着末班车、短波信号与港区停电追踪失踪记者。",
    toneZh: isCourt ? "漆红、玉色与黄铜冷光" : "海港蓝、钠灯黄与警示红",
    headquartersRewardZh: isCourt
      ? "解锁总部东侧证物廊"
      : "解锁总部地下通信室",
    chapters: seeds.map((seed, index) => buildChapter(id, seed, index)),
  });
}

export const casePacks = [
  buildCase("court", courtSeeds),
  buildCase("city", citySeeds),
] as const;

export const casePackById = new Map(
  casePacks.map((casePack) => [casePack.id, casePack]),
);

export function validateContentReferences(): string[] {
  const issues: string[] = [];
  const curriculumIds = new Set(sharedCurriculum.map((word) => word.id));

  for (const word of sharedCurriculum) {
    if (!word.acceptedForms.map((form) => form.toLowerCase()).includes(word.word.toLowerCase())) {
      issues.push("Primary form missing for " + word.id);
    }

    if (!word.confusableIds.some((wordId) => curriculumIds.has(wordId))) {
      issues.push("No published confusable for " + word.id);
    }
  }

  for (const casePack of casePacks) {
    const seenNewWords = new Set<string>();

    for (const chapter of casePack.chapters) {
      const dialogueIds = new Set(chapter.dialogues.map((dialogue) => dialogue.id));
      const outcomeIds = new Set(chapter.outcomes.map((outcome) => outcome.id));

      for (const wordId of [...chapter.newWordIds, ...chapter.reviewWordIds]) {
        if (!curriculumIds.has(wordId)) {
          issues.push("Unknown word " + wordId + " in " + chapter.id);
        }
      }

      for (const wordId of chapter.newWordIds) {
        if (seenNewWords.has(wordId)) {
          issues.push("Repeated new word " + wordId + " in " + casePack.id);
        }
        seenNewWords.add(wordId);
      }

      if (!dialogueIds.has(chapter.startEncounterId)) {
        issues.push("Unknown start encounter in " + chapter.id);
      }

      for (const dialogue of chapter.dialogues) {
        const optionIds = new Set(dialogue.options.map((option) => option.id));

        if (!optionIds.has(dialogue.timeoutOptionId)) {
          issues.push("Unknown timeout option in " + dialogue.id);
        }

        for (const option of dialogue.options) {
          if (!curriculumIds.has(option.targetWordId)) {
            issues.push("Unknown dialogue word in " + option.id);
          }
          if (!outcomeIds.has(option.outcomeNodeId)) {
            issues.push("Unknown outcome in " + option.id);
          }
        }
      }

      for (const outcome of chapter.outcomes) {
        if (
          outcome.nextEncounterId !== null &&
          !dialogueIds.has(outcome.nextEncounterId)
        ) {
          issues.push("Unknown next encounter in " + outcome.id);
        }
      }

      for (const trap of chapter.traps) {
        const target = wordById.get(trap.targetWordId);

        for (const distractorId of trap.distractorWordIds) {
          if (!curriculumIds.has(distractorId)) {
            issues.push("Unknown trap distractor in " + trap.id);
          }
          if (target && !target.confusableIds.includes(distractorId)) {
            issues.push("Unauthored trap distractor in " + trap.id);
          }
        }
      }

      const readingWordCount = chapter.readingArtifact.bodyEn.split(/\s+/).length;
      if (readingWordCount < 80 || readingWordCount > 180) {
        issues.push("Reading length out of range in " + chapter.id);
      }
    }
  }

  return issues;
}

