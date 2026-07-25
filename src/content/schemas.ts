import { z } from "zod";

const ContentIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "内容标识只能使用小写字母、数字和连字符");

export const WordDefinitionSchema = z.object({
  id: ContentIdSchema,
  senseId: ContentIdSchema.default("primary"),
  word: z.string().min(1),
  partOfSpeech: z.enum(["noun", "verb", "adjective", "adverb"]),
  meaningZh: z.string().min(1),
  definitionEn: z.string().min(1).optional(),
  level: z.enum(["5.0", "5.5", "6.0", "6.5"]).default("5.5"),
  exampleEn: z.string().min(1),
  exampleZh: z.string().min(1),
  acceptedForms: z.array(z.string().min(1)).min(1),
  confusableIds: z.array(ContentIdSchema).min(1),
}).transform((word) => ({
  ...word,
  lexemeId: word.id,
  itemId: word.id + ":" + word.senseId,
}));

export const DialogueOptionSchema = z.object({
  id: ContentIdSchema,
  intentZh: z.string().min(1),
  targetWordId: ContentIdSchema,
  outcomeNodeId: ContentIdSchema,
  riskLevel: z.union([z.literal(0), z.literal(1)]),
});

export const DialogueEncounterSchema = z.object({
  id: ContentIdSchema,
  npcId: ContentIdSchema,
  npcNameZh: z.string().min(1),
  promptZh: z.string().min(1),
  spokenLineEn: z.string().min(1),
  options: z.array(DialogueOptionSchema).min(2),
  countdownSeconds: z.number().int().min(8).max(20),
  timeoutOptionId: ContentIdSchema,
  checkpointId: ContentIdSchema,
});

export const TrapDefinitionSchema = z.object({
  id: ContentIdSchema,
  type: z.enum([
    "spelling",
    "sound",
    "meaning",
    "part-of-speech",
    "collocation",
    "delayed-recall",
    "false-testimony",
  ]),
  promptZh: z.string().min(1),
  targetWordId: ContentIdSchema,
  distractorWordIds: z.array(ContentIdSchema).min(1),
  explanationZh: z.string().min(1),
  encounterId: ContentIdSchema,
});

export const ReadingArtifactSchema = z.object({
  id: ContentIdSchema,
  titleZh: z.string().min(1),
  bodyEn: z.string().min(20),
  questionZh: z.string().min(1),
  acceptedAnswerWordIds: z.array(ContentIdSchema).min(1),
  glossary: z
    .array(
      z.object({
        wordId: ContentIdSchema,
        noteZh: z.string().min(1),
      }),
    )
    .min(1),
});

export const ListeningArtifactSchema = z.object({
  id: ContentIdSchema,
  titleZh: z.string().min(1),
  audioSrc: z.string().startsWith("/audio/"),
  durationSeconds: z.number().min(30).max(90),
  speakerZh: z.string().min(1),
  environmentalSoundZh: z.string().min(1),
  transcriptEn: z.string().min(20),
  questionZh: z.string().min(1),
  acceptedAnswerWordIds: z.array(ContentIdSchema).min(1),
});

export const OutcomeDefinitionSchema = z.object({
  id: ContentIdSchema,
  textZh: z.string().min(1),
  nextEncounterId: ContentIdSchema.nullable(),
  advancesCaseClock: z.boolean(),
});

export const CheckpointDefinitionSchema = z.object({
  id: ContentIdSchema,
  titleZh: z.string().min(1),
  encounterId: ContentIdSchema,
});

export const ChapterDefinitionSchema = z.object({
  id: ContentIdSchema,
  order: z.number().int().min(1).max(7),
  titleZh: z.string().min(1),
  summaryZh: z.string().min(1),
  startEncounterId: ContentIdSchema,
  newWordIds: z.array(ContentIdSchema).min(5).max(7),
  reviewWordIds: z.array(ContentIdSchema).min(3).max(5),
  dialogues: z.array(DialogueEncounterSchema).min(2),
  outcomes: z.array(OutcomeDefinitionSchema).min(2),
  checkpoints: z.array(CheckpointDefinitionSchema).min(1),
  readingArtifact: ReadingArtifactSchema,
  listeningArtifact: ListeningArtifactSchema,
  traps: z.array(TrapDefinitionSchema).min(1),
  completionTextZh: z.string().min(1),
});

export const CasePackSchema = z.object({
  id: ContentIdSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  theme: z.enum(["court", "city"]),
  contentWarningsZh: z.array(z.string().min(1)),
  titleZh: z.string().min(1),
  summaryZh: z.string().min(1),
  toneZh: z.string().min(1),
  headquartersRewardZh: z.string().min(1),
  chapters: z.array(ChapterDefinitionSchema).length(7),
});
export type WordDefinitionInput = z.input<typeof WordDefinitionSchema>;

export type WordDefinition = z.infer<typeof WordDefinitionSchema>;
export type DialogueOption = z.infer<typeof DialogueOptionSchema>;
export type DialogueEncounter = z.infer<typeof DialogueEncounterSchema>;
export type TrapDefinition = z.infer<typeof TrapDefinitionSchema>;
export type ReadingArtifact = z.infer<typeof ReadingArtifactSchema>;
export type ListeningArtifact = z.infer<typeof ListeningArtifactSchema>;
export type OutcomeDefinition = z.infer<typeof OutcomeDefinitionSchema>;
export type CheckpointDefinition = z.infer<typeof CheckpointDefinitionSchema>;
export type ChapterDefinition = z.infer<typeof ChapterDefinitionSchema>;
export type CasePack = z.infer<typeof CasePackSchema>;
