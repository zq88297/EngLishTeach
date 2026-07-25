"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Headphones,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";

import { PhaserWorld } from "@/components/PhaserWorld";
import { casePackById, casePacks } from "@/content/cases";
import { wordById } from "@/content/curriculum";
import type { CasePack, DialogueOption } from "@/content/schemas";
import {
  enqueueLearningEvent,
  loadLocalProgress,
  saveCaseRuntime,
} from "@/data/localDatabase";
import {
  evaluateAnswer,
  LearningEventSchema,
  normalizeAnswer,
  type AttemptResult,
  type LearningEvent,
} from "@/domain/learning";
import { sendMagicLink } from "@/lib/supabase/browser";
import { syncPendingLearningEvents } from "@/lib/supabase/sync";
import {
  applyStoryChoice,
  completeStory,
  createStoryState,
  retryFromCheckpoint,
  type StoryState,
} from "@/domain/story";
import {
  emitGameEvent,
  type MoveDirection,
  type NavigationTarget,
} from "@/game/events";

type CaseId = "court" | "city";
type EvidenceView = "dialogue" | "reading" | "listening";

type CaseRuntime = {
  chapterIndex: number;
  completedChapterIds: string[];
  story: StoryState;
  chapterResolved: boolean;
};

type Feedback = {
  tone: "success" | "error" | "neutral";
  text: string;
};

function createRuntime(casePack: CasePack): CaseRuntime {
  const chapter = casePack.chapters[0];
  const checkpoint = chapter.checkpoints[0];

  return {
    chapterIndex: 0,
    completedChapterIds: [],
    story: createStoryState(
      casePack.id,
      chapter.id,
      chapter.startEncounterId,
      checkpoint.id,
    ),
    chapterResolved: false,
  };
}

function makeEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "event-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function nextStoryForChapter(casePack: CasePack, chapterIndex: number): StoryState {
  const chapter = casePack.chapters[chapterIndex];
  const checkpoint = chapter.checkpoints[0];

  return createStoryState(
    casePack.id,
    chapter.id,
    chapter.startEncounterId,
    checkpoint.id,
  );
}

function moveButtonProps(direction: MoveDirection) {
  const update = (active: boolean) =>
    emitGameEvent("move", { direction, active });

  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      update(true);
    },
    onPointerUp: () => update(false),
    onPointerCancel: () => update(false),
    onPointerLeave: () => update(false),
  };
}

export function InvestigationApp() {
  const [activeCaseId, setActiveCaseId] = useState<CaseId>("court");
  const [runtimeByCase, setRuntimeByCase] = useState<
    Record<CaseId, CaseRuntime>
  >(() => ({
    court: createRuntime(casePackById.get("court") as CasePack),
    city: createRuntime(casePackById.get("city") as CasePack),
  }));
  const [view, setView] = useState<EvidenceView>("dialogue");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [learningEvents, setLearningEvents] = useState<LearningEvent[]>([]);
  const [localStateReady, setLocalStateReady] = useState(false);
  const [proximity, setProximity] = useState<NavigationTarget | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [extendedTimer, setExtendedTimer] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [reducedScare, setReducedScare] = useState(false);
  const [visibilityPaused, setVisibilityPaused] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  const activeCase = casePackById.get(activeCaseId) as CasePack;
  const runtime = runtimeByCase[activeCaseId];
  const chapter = activeCase.chapters[runtime.chapterIndex];
  const dialogue =
    chapter.dialogues.find(
      (encounter) => encounter.id === runtime.story.currentEncounterId,
    ) ?? chapter.dialogues[0];
  const timerMaximum = extendedTimer ? 20 : dialogue.countdownSeconds;
  const [secondsRemaining, setSecondsRemaining] = useState(timerMaximum);
  const timeoutHandledRef = useRef(false);

  const resetPromptState = useCallback((nextTimerMaximum: number) => {
    timeoutHandledRef.current = false;
    setSecondsRemaining(nextTimerMaximum);
    setFeedback(null);
    setAnswer("");
    setAudioUnavailable(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadLocalProgress()
      .then(({ runtimes, learningEvents: storedEvents }) => {
        if (cancelled) return;

        setRuntimeByCase((current) => {
          const next = { ...current };

          for (const stored of runtimes) {
            next[stored.caseId] = {
              chapterIndex: stored.chapterIndex,
              completedChapterIds: stored.completedChapterIds,
              story: stored.story,
              chapterResolved: stored.chapterResolved,
            };
          }

          return next;
        });

        const restored = runtimes.find((item) => item.caseId === "court");
        if (restored) {
          const restoredCase = casePackById.get("court") as CasePack;
          const restoredChapter = restoredCase.chapters[restored.chapterIndex];
          const restoredDialogue =
            restoredChapter.dialogues.find(
              (item) => item.id === restored.story.currentEncounterId,
            ) ?? restoredChapter.dialogues[0];
          timeoutHandledRef.current = false;
          setSecondsRemaining(restoredDialogue.countdownSeconds);
        }

        setLearningEvents(storedEvents);
      })
      .catch(() => {
        if (!cancelled) {
          setFeedback({
            tone: "neutral",
            text: "本地进度暂时无法读取，本次会话仍可继续。",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLocalStateReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!localStateReady) return;

    for (const caseId of ["court", "city"] as const) {
      const current = runtimeByCase[caseId];
      void saveCaseRuntime({ caseId, ...current });
    }
  }, [localStateReady, runtimeByCase]);

  useEffect(() => {
    const sync = () => {
      void syncPendingLearningEvents();
    };

    window.addEventListener("online", sync);
    const intervalId = window.setInterval(sync, 60_000);
    sync();

    return () => {
      window.removeEventListener("online", sync);
      window.clearInterval(intervalId);
    };
  }, []);

  const masteryCount = useMemo(
    () =>
      new Set(
        learningEvents
          .filter((event) => event.result === "knowledge_correct")
          .map((event) => event.itemId),
      ).size,
    [learningEvents],
  );

  const updateRuntime = useCallback(
    (updater: (current: CaseRuntime) => CaseRuntime) => {
      setRuntimeByCase((current) => ({
        ...current,
        [activeCaseId]: updater(current[activeCaseId]),
      }));
    },
    [activeCaseId],
  );

  const appendLearningEvent = useCallback(
    (
      result: AttemptResult,
      option: DialogueOption,
      submittedAnswer: string | null,
    ) => {
      const word = wordById.get(option.targetWordId);

      if (!word) {
        return;
      }

      const event = LearningEventSchema.parse({
        eventId: makeEventId(),
        itemId: word.itemId,
        caseId: activeCase.id,
        chapterId: chapter.id,
        encounterId: dialogue.id,
        contentVersion: activeCase.version,
        occurredAt: new Date().toISOString(),
        result,
        responseMs: Math.max(
          0,
          (timerMaximum - secondsRemaining) * 1_000,
        ),
        usedHint: false,
        answerNormalized:
          submittedAnswer === null ? null : normalizeAnswer(submittedAnswer),
        confusedWithItemId: null,
      });

      setLearningEvents((current) => [...current, event]);
      void enqueueLearningEvent(event).catch(() => {
        setFeedback({
          tone: "error",
          text: "学习记录未能写入本地队列，请保留当前页面后重试。",
        });
      });
    },
    [
      activeCase.id,
      activeCase.version,
      chapter.id,
      dialogue.id,
      secondsRemaining,
      timerMaximum,
    ],
  );

  const resolveOption = useCallback(
    (option: DialogueOption, source: "choice" | "timeout") => {
      const outcome = chapter.outcomes.find(
        (candidate) => candidate.id === option.outcomeNodeId,
      );

      if (!outcome) {
        setFeedback({ tone: "error", text: "剧情结果缺失，本次操作未保存。" });
        return;
      }

      const nextDialogue = outcome.nextEncounterId
        ? chapter.dialogues.find(
            (candidate) => candidate.id === outcome.nextEncounterId,
          )
        : undefined;

      appendLearningEvent(
        source === "timeout" ? "timeout" : "knowledge_correct",
        option,
        source === "timeout" ? null : answer,
      );

      updateRuntime((current) => {
        const story = applyStoryChoice(current.story, {
          outcomeId: outcome.id,
          nextEncounterId:
            outcome.nextEncounterId ?? current.story.currentEncounterId,
          riskLevel: option.riskLevel,
          source,
        });

        return {
          ...current,
          story,
          chapterResolved:
            outcome.nextEncounterId === null && story.status !== "failed",
        };
      });

      if (nextDialogue) {
        resetPromptState(extendedTimer ? 20 : nextDialogue.countdownSeconds);
      } else {
        setAnswer("");
      }

      setFeedback({
        tone: option.riskLevel === 0 ? "success" : "neutral",
        text: outcome.textZh,
      });
    },
    [
      answer,
      appendLearningEvent,
      chapter.dialogues,
      chapter.outcomes,
      extendedTimer,
      resetPromptState,
      updateRuntime,
    ],
  );

  const handleTimeout = useCallback(() => {
    const timeoutOption = dialogue.options.find(
      (option) => option.id === dialogue.timeoutOptionId,
    );

    if (timeoutOption) {
      resolveOption(timeoutOption, "timeout");
    }
  }, [dialogue.options, dialogue.timeoutOptionId, resolveOption]);

  useEffect(() => {
    const handleVisibility = () =>
      setVisibilityPaused(document.visibilityState !== "visible");
    const handleBlur = () => setVisibilityPaused(true);
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        setVisibilityPaused(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const timerPaused =
    !localStateReady ||
    !timerEnabled ||
    visibilityPaused ||
    runtime.story.status !== "active" ||
    runtime.chapterResolved;

  useEffect(() => {
    if (timerPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [dialogue.id, timerPaused]);

  useEffect(() => {
    if (
      secondsRemaining !== 0 ||
      timeoutHandledRef.current ||
      timerPaused
    ) {
      return;
    }

    timeoutHandledRef.current = true;
    handleTimeout();
  }, [handleTimeout, secondsRemaining, timerPaused]);

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const matchedOption = dialogue.options.find((option) => {
      const word = wordById.get(option.targetWordId);
      return word
        ? evaluateAnswer(answer, word.acceptedForms).correct
        : false;
    });

    if (matchedOption) {
      resolveOption(matchedOption, "choice");
      return;
    }

    const normalized = normalizeAnswer(answer);
    const likelyOptions = dialogue.options.filter((option) => {
      const word = wordById.get(option.targetWordId);
      return (
        normalized.length > 0 &&
        word?.word.toLowerCase().startsWith(normalized.slice(0, 1))
      );
    });

    if (likelyOptions.length === 1) {
      appendLearningEvent(
        "knowledge_incorrect",
        likelyOptions[0],
        answer,
      );
    }

    setFeedback({
      tone: "error",
      text:
        likelyOptions.length === 1
          ? "拼写与目标义项不匹配。本次已记录为知识错误，可继续作答。"
          : "无法确定你选择的目标义项，本次不计入掌握度。",
    });
  };

  const startNextChapter = () => {
    if (runtime.chapterIndex < activeCase.chapters.length - 1) {
      const nextChapter = activeCase.chapters[runtime.chapterIndex + 1];
      resetPromptState(
        extendedTimer ? 20 : nextChapter.dialogues[0].countdownSeconds,
      );
    } else {
      setFeedback(null);
    }

    updateRuntime((current) => {
      const completedChapterIds = current.completedChapterIds.includes(
        chapter.id,
      )
        ? current.completedChapterIds
        : [...current.completedChapterIds, chapter.id];

      if (current.chapterIndex >= activeCase.chapters.length - 1) {
        return {
          ...current,
          completedChapterIds,
          story: completeStory(current.story),
          chapterResolved: true,
        };
      }

      const chapterIndex = current.chapterIndex + 1;
      return {
        chapterIndex,
        completedChapterIds,
        story: nextStoryForChapter(activeCase, chapterIndex),
        chapterResolved: false,
      };
    });
    setView("dialogue");
  };

  const retryChapter = () => {
    updateRuntime((current) => ({
      ...current,
      story: retryFromCheckpoint(current.story),
      chapterResolved: false,
    }));
    resetPromptState(timerMaximum);
    setFeedback({
      tone: "neutral",
      text: "已回到检查点。学习记录保留，题目语境已重置。",
    });
  };

  const navigateTo = (target: NavigationTarget) => {
    emitGameEvent("navigate", { target });
    setProximity(target);

    if (target === "npc") setView("dialogue");
    if (target === "evidence") setView("reading");
    if (target === "exit" && runtime.chapterResolved) startNextChapter();
  };

  const requestMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthPending(true);
    const result = await sendMagicLink(email);
    setAuthMessage(result.message);
    setAuthPending(false);

    if (result.ok) {
      void syncPendingLearningEvents();
    }
  };

  const actionTargetLabel: Record<NavigationTarget, string> = {
    npc: "问询",
    evidence: "调查证物",
    exit: runtime.chapterResolved ? "前往下一章" : "出口未解锁",
  };

  const isLastChapter =
    runtime.chapterIndex === activeCase.chapters.length - 1;
  const isCaseComplete =
    isLastChapter &&
    runtime.chapterResolved &&
    runtime.completedChapterIds.includes(chapter.id);

  return (
    <main
      className={"investigation-app theme-" + activeCase.theme}
      data-reduced-scare={reducedScare}
    >
      <header className="app-header">
        <div className="brand-lockup" aria-label="EnglishTech 调查总部">
          <span className="brand-mark">ET</span>
          <span>
            <strong>ENGLISHTECH</strong>
            <small>调查总部 / CASE CONTROL</small>
          </span>
        </div>

        <div className="case-switcher" aria-label="案件选择">
          {casePacks.map((casePack) => (
            <button
              key={casePack.id}
              type="button"
              className={casePack.id === activeCaseId ? "is-active" : ""}
              onClick={() => {
                const caseId = casePack.id as CaseId;
                const targetRuntime = runtimeByCase[caseId];
                const targetChapter = casePack.chapters[targetRuntime.chapterIndex];
                const targetDialogue =
                  targetChapter.dialogues.find(
                    (item) => item.id === targetRuntime.story.currentEncounterId,
                  ) ?? targetChapter.dialogues[0];

                setActiveCaseId(caseId);
                setView("dialogue");
                resetPromptState(
                  extendedTimer ? 20 : targetDialogue.countdownSeconds,
                );
              }}
            >
              {casePack.titleZh}
            </button>
          ))}
        </div>

        <div className="header-status">
          <span>
            <ShieldCheck aria-hidden="true" />
            本地调查员
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="打开设置"
            title="设置"
            onClick={() => setSettingsOpen((current) => !current)}
          >
            <Settings aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="world-stage" aria-label="调查现场">
        <PhaserWorld
          theme={activeCase.theme}
          onProximityChange={setProximity}
        />

        <aside className="mission-rail" aria-label="案件进度">
          <div className="rail-heading">
            <span>CASE {activeCaseId === "court" ? "01" : "02"}</span>
            <h1>{activeCase.titleZh}</h1>
            <p>{chapter.titleZh}</p>
          </div>

          <ol className="chapter-track">
            {activeCase.chapters.map((item, index) => {
              const completed = runtime.completedChapterIds.includes(item.id);
              const current = index === runtime.chapterIndex;
              const locked =
                index > runtime.completedChapterIds.length && !current;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={locked || (!completed && !current)}
                    className={current ? "is-current" : ""}
                    aria-current={current ? "step" : undefined}
                    onClick={() => {
                      if (!completed || current) return;
                      setRuntimeByCase((all) => ({
                        ...all,
                        [activeCaseId]: {
                          ...all[activeCaseId],
                          chapterIndex: index,
                          story: nextStoryForChapter(activeCase, index),
                          chapterResolved: false,
                        },
                      }));
                      resetPromptState(
                        extendedTimer ? 20 : item.dialogues[0].countdownSeconds,
                      );
                    }}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.titleZh}</strong>
                    {completed ? (
                      <Check aria-label="已完成" />
                    ) : locked ? (
                      <LockKeyhole aria-label="未解锁" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="case-metrics">
            <span>
              <Clock3 aria-hidden="true" />
              时钟 {runtime.story.caseClock}/3
            </span>
            <span>
              <Search aria-hidden="true" />
              掌握 {masteryCount}
            </span>
          </div>
        </aside>

        <nav className="accessible-locations" aria-label="地点快速导航">
          <span>地点</span>
          <button type="button" onClick={() => navigateTo("npc")}>
            <MapPin aria-hidden="true" />
            {dialogue.npcNameZh}
          </button>
          <button type="button" onClick={() => navigateTo("evidence")}>
            <BookOpen aria-hidden="true" />
            证物台
          </button>
          <button type="button" onClick={() => navigateTo("exit")}>
            <ArrowRight aria-hidden="true" />
            出口
          </button>
        </nav>

        <div className="touch-controls" aria-label="移动控制">
          <div className="d-pad">
            <button
              type="button"
              className="move-up"
              aria-label="向上移动"
              title="向上"
              {...moveButtonProps("up")}
            >
              <ChevronUp aria-hidden="true" />
            </button>
            <button
              type="button"
              className="move-left"
              aria-label="向左移动"
              title="向左"
              {...moveButtonProps("left")}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="move-right"
              aria-label="向右移动"
              title="向右"
              {...moveButtonProps("right")}
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              type="button"
              className="move-down"
              aria-label="向下移动"
              title="向下"
              {...moveButtonProps("down")}
            >
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            className="investigate-button"
            disabled={!proximity || proximity === "exit"}
            onClick={() => {
              if (proximity) navigateTo(proximity);
              emitGameEvent("investigate", undefined);
            }}
          >
            <Search aria-hidden="true" />
            {proximity ? actionTargetLabel[proximity] : "调查"}
          </button>
        </div>

        <section className="evidence-console" aria-label="调查任务">
          <div className="console-tabs" role="tablist" aria-label="任务视图">
            <button
              type="button"
              role="tab"
              aria-selected={view === "dialogue"}
              onClick={() => setView("dialogue")}
            >
              <MessageSquare aria-hidden="true" />
              问询
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "reading"}
              onClick={() => setView("reading")}
            >
              <BookOpen aria-hidden="true" />
              证物
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "listening"}
              onClick={() => setView("listening")}
            >
              <Headphones aria-hidden="true" />
              录音
            </button>
          </div>

          {view === "dialogue" && (
            <div className="dialogue-view" role="tabpanel">
              <div className="speaker-line">
                <span>{dialogue.npcNameZh}</span>
                <p lang="en">{dialogue.spokenLineEn}</p>
              </div>

              <p className="task-prompt">{dialogue.promptZh}</p>

              <ul className="intent-options" aria-label="可用中文意图">
                {dialogue.options.map((option) => {
                  const word = wordById.get(option.targetWordId);
                  return (
                    <li key={option.id}>
                      <span>{option.riskLevel === 0 ? "A" : "B"}</span>
                      <strong>{option.intentZh}</strong>
                      <small lang="en">{word?.partOfSpeech}</small>
                    </li>
                  );
                })}
              </ul>

              <form onSubmit={submitAnswer} className="answer-form">
                <label htmlFor="answer-input">英文回应</label>
                <div>
                  <input
                    id="answer-input"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={
                      runtime.story.status !== "active" ||
                      runtime.chapterResolved
                    }
                  />
                  <button
                    type="submit"
                    disabled={
                      answer.trim().length === 0 ||
                      runtime.story.status !== "active" ||
                      runtime.chapterResolved
                    }
                  >
                    <ArrowRight aria-hidden="true" />
                    提交
                  </button>
                </div>
              </form>

              <div className="timer-line" aria-live="polite">
                {timerEnabled ? (
                  <>
                    {timerPaused ? (
                      <Pause aria-hidden="true" />
                    ) : (
                      <Clock3 aria-hidden="true" />
                    )}
                    <span>{visibilityPaused ? "已失焦暂停" : secondsRemaining + " 秒"}</span>
                    <span
                      className="timer-track"
                      aria-hidden="true"
                    >
                      <i
                        style={{
                          width:
                            (secondsRemaining / timerMaximum) * 100 + "%",
                        }}
                      />
                    </span>
                  </>
                ) : (
                  <>
                    <Pause aria-hidden="true" />
                    <span>不限时</span>
                  </>
                )}
              </div>
            </div>
          )}

          {view === "reading" && (
            <article className="artifact-view" role="tabpanel">
              <span className="artifact-code">READING / EVIDENCE</span>
              <h2>{chapter.readingArtifact.titleZh}</h2>
              <p lang="en">{chapter.readingArtifact.bodyEn}</p>
              <dl>
                {chapter.readingArtifact.glossary.map((entry) => (
                  <div key={entry.wordId}>
                    <dt lang="en">{wordById.get(entry.wordId)?.word}</dt>
                    <dd>{entry.noteZh}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )}

          {view === "listening" && (
            <div className="artifact-view listening-view" role="tabpanel">
              <span className="artifact-code">AUDIO / WITNESS LOG</span>
              <h2>{chapter.listeningArtifact.titleZh}</h2>
              <p className="sound-caption">
                <Volume2 aria-hidden="true" />
                {chapter.listeningArtifact.environmentalSoundZh}
              </p>
              <audio
                controls
                preload="metadata"
                src={chapter.listeningArtifact.audioSrc}
                onError={() => setAudioUnavailable(true)}
              />
              {audioUnavailable && (
                <p className="inline-error">音频不可用，已切换文字记录。</p>
              )}
              {captionsEnabled && (
                <blockquote lang="en">
                  {chapter.listeningArtifact.transcriptEn}
                </blockquote>
              )}
            </div>
          )}

          {feedback && (
            <div
              className={"feedback-line is-" + feedback.tone}
              role="status"
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                className="icon-button"
                aria-label="关闭反馈"
                title="关闭"
                onClick={() => setFeedback(null)}
              >
                <Check aria-hidden="true" />
              </button>
            </div>
          )}
        </section>

        {runtime.story.status === "failed" && (
          <div className="case-outcome" role="dialog" aria-modal="true">
            <span>CASE CLOCK / 03</span>
            <h2>线索链断裂</h2>
            <p>案件回到最近检查点；学习掌握记录不会回滚。</p>
            <button type="button" onClick={retryChapter}>
              <RotateCcw aria-hidden="true" />
              检查点重试
            </button>
          </div>
        )}

        {runtime.chapterResolved && runtime.story.status !== "failed" && (
          <div className="chapter-resolution" role="status">
            <span>{isLastChapter ? "CASE REVIEW" : "CHAPTER CLEARED"}</span>
            <h2>{chapter.completionTextZh}</h2>
            <button type="button" onClick={startNextChapter}>
              {isLastChapter ? (
                <ShieldCheck aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {isLastChapter ? "归档案件" : "进入下一章"}
            </button>
          </div>
        )}

        {isCaseComplete && (
          <div className="case-complete-mark">
            <ShieldCheck aria-hidden="true" />
            案件已归档
          </div>
        )}
      </section>

      {settingsOpen && (
        <aside className="settings-panel" aria-label="体验设置">
          <div>
            <h2>体验设置</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="关闭设置"
              title="关闭"
              onClick={() => setSettingsOpen(false)}
            >
              <Check aria-hidden="true" />
            </button>
          </div>
          <form className="auth-form" onSubmit={requestMagicLink}>
            <label htmlFor="account-email">邮箱同步</label>
            <div>
              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              <button type="submit" disabled={authPending}>
                {authPending ? "发送中" : "发送登录链接"}
              </button>
            </div>
            {authMessage && <p role="status">{authMessage}</p>}
          </form>
          <label>
            <input
              type="checkbox"
              checked={timerEnabled}
              onChange={(event) => setTimerEnabled(event.target.checked)}
            />
            <span>启用倒计时</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={extendedTimer}
              onChange={(event) => {
                const enabled = event.target.checked;
                setExtendedTimer(enabled);
                timeoutHandledRef.current = false;
                setSecondsRemaining(
                  enabled ? 20 : dialogue.countdownSeconds,
                );
              }}
            />
            <span>延长至 20 秒</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={captionsEnabled}
              onChange={(event) => setCaptionsEnabled(event.target.checked)}
            />
            <span>显示完整字幕</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={reducedScare}
              onChange={(event) => setReducedScare(event.target.checked)}
            />
            <span>减少惊吓</span>
          </label>
          <p>
            {timerEnabled ? (
              <>
                <Play aria-hidden="true" />
                剧情计时已启用
              </>
            ) : (
              <>
                <Pause aria-hidden="true" />
                倒计时不会影响掌握度
              </>
            )}
          </p>
        </aside>
      )}
    </main>
  );
}

