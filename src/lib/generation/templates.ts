import type {
  SchemeOfWork,
  SchemeRow,
  LessonPlan,
  LessonActivity,
  LessonNote,
  PracticeQuestion,
  Subtopic,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

const RESOURCES = [
  "Approved course textbook",
  "Chalkboard / whiteboard and markers",
  "Printed worksheets",
  "Real objects and learning charts",
  "Learner exercise books",
];

const KEY_QUESTIONS = [
  "What do you already know about this topic?",
  "Can you connect this idea with something from everyday life?",
  "What would happen if the conditions changed? Explain.",
];

const PHASES: { section: string; phase: LessonActivity["phase"]; durationMinutes: number; description: (title: string) => string }[] = [
  {
    section: "Hook / Introduction",
    phase: "introduction",
    durationMinutes: 5,
    description: (t) =>
      `Briefly awaken interest in "${t}" using a question, short story, object, or classroom demonstration, and state the lesson objectives.`,
  },
  {
    section: "Direct Instruction",
    phase: "main",
    durationMinutes: 15,
    description: (t) =>
      `Explain key concepts and definitions for "${t}" using clear worked examples and step-by-step methods on the board.`,
  },
  {
    section: "Guided Practice",
    phase: "main",
    durationMinutes: 10,
    description: (t) =>
      `Work through example problems together with the class, allowing learners to attempt similar tasks with teacher support for "${t}".`,
  },
  {
    section: "Independent Work",
    phase: "main",
    durationMinutes: 7,
    description: (t) =>
      `Learners complete individual practice tasks on "${t}" while the teacher circulates to support and assess progress.`,
  },
  {
    section: "Plenary / Closure",
    phase: "conclusion",
    durationMinutes: 3,
    description: (t) =>
      `Summarise the key learning points on "${t}", address common misconceptions, and preview the next lesson.`,
  },
];

const NOTECARDS = [
  {
    match: /fraction|decimal|integer|number|ratio|percent|percentage|money/i,
    body: "Understand that fractions, decimals and percentages are different ways of expressing parts of a whole, and that they can be converted into one another.",
    example:
      "Worked example: Convert the fraction 3/4 to a decimal and to a percentage.\n3/4 = 3 ÷ 4 = 0.75\n0.75 × 100 = 75%\nSo 3/4 = 0.75 = 75%.",
  },
  {
    match: /algebra|equation|expression|inequalit|variable|letter/i,
    body: "Algebra uses letters (variables) to stand for unknown numbers. Like terms can be collected to simplify an expression, and equations are solved by isolating the unknown.",
    example:
      "Worked example: Solve x + 5 = 12.\nSubtract 5 from both sides: x = 12 − 5.\nTherefore x = 7.",
  },
  {
    match: /area|perimeter|volume|length|angle|measure|geometry|shape|symmetry|triangle|quadrilateral|cuboid|capacity/i,
    body: "Measurement links mathematics to the physical world. Perimeter is the distance around a shape, area is the space inside a 2D shape, and volume is the space inside a 3D object.",
    example:
      "Worked example: Find the area of a rectangle 8 cm long and 5 cm wide.\nArea = length × width = 8 × 5 = 40 cm².",
  },
  {
    match: /cell|ecosystem|organism|plant|animal|reproduc|energy|electric|circuit|force|acid|base|mixture|solar|weather|climate|ecosystem/i,
    body: "In Integrated Science, living things are organised from cells to organisms and ecosystems. Matter, energy and forces interact constantly, and these ideas explain many natural phenomena.",
    example:
      "Worked example: In a simple food chain, grass → grasshopper → bird → hawk, energy from the Sun is captured by the grass and passed along the chain. Removing the bird would cause grasshoppers to multiply rapidly.",
  },
  {
    match: /motion|force|velocity|speed|acceleration|momentum|newton|work|power|energy transfer|electric|magnet|wave|sound|light/i,
    body: "Physics describes how and why things move and interact. Forces change motion, energy transforms between forms, and waves transfer energy without transferring matter.",
    example:
      "Worked example: A car covers 100 m in 10 s. Its average speed = distance ÷ time = 100 ÷ 10 = 10 m/s.",
  },
  {
    match: /comprehension|vocabulary|writing|paragraph|essay|read/i,
    body: "Strong reading and writing skills grow from vocabulary, comprehension strategies and plenty of practice with text structure.",
    example:
      "Worked example: A paragraph should begin with a topic sentence, be developed with supporting details, and end with a concluding thought that links back to the main idea.",
  },
];

const DEFAULT_NOTE = {
  body: "Learn the key terms below, study how the ideas are connected, and then test yourself using the practice questions.",
  example:
    "Worked example: Read the definition carefully, connect it with an example from your life, and then attempt the self-test questions at your own pace.",
};

export function buildSchemeTemplate(opts: {
  gradeLevel: string;
  subject: string;
  strand: string;
  term: string;
  year: number;
  durationWeeks: number;
  subtopics: Subtopic[];
}): SchemeOfWork {
  const { subtopics } = opts;
  const weeks = Math.max(1, opts.durationWeeks);
  const rows: SchemeRow[] = [];
  let lessonNumber = 1;
  const lessonsPerWeek = Math.max(1, Math.ceil(subtopics.length / weeks));

  subtopics.forEach((sub, i) => {
    const week = Math.floor(i / lessonsPerWeek) + 1;
    const lessonsThisSubtopic = 1;
    for (let l = 0; l < lessonsThisSubtopic; l++) {
      rows.push({
        week,
        lessonNumber: lessonNumber++,
        strand: opts.strand,
        subtopic: sub.title,
        learningOutcomes: sub.learningOutcomes,
        keyInquiryQuestions: [
          `What do we understand by ${sub.title.toLowerCase()}?`,
          "Where do we see this in our daily lives?",
          "What happens if we apply the idea incorrectly?",
        ],
        learningActivities: [
          "Class discussion and brainstorming on the concept",
          "Guided problem solving / hands-on activity",
          "Group work followed by presentation of findings",
        ],
        resources: RESOURCES.slice(0, 4),
        assessment: ["Oral questions during the lesson", "Written exercises", "Short quiz at the end of the week"],
      });
    }
  });

  return {
    id: generateId(),
    title: `Scheme of Work — ${opts.subject} (${opts.gradeLevel})`,
    gradeLevel: opts.gradeLevel,
    subject: opts.subject,
    strand: opts.strand,
    term: opts.term,
    year: opts.year,
    rows,
    durationWeeks: weeks,
    createdAt: Date.now(),
  };
}

export function buildLessonPlanTemplate(opts: {
  gradeLevel: string;
  subject: string;
  durationMinutes: number;
  subtopic: Subtopic;
  strand: string;
}): LessonPlan {
  const { subtopic } = opts;
  const activities: LessonActivity[] = PHASES.map((p) => ({
    section: p.section,
    phase: p.phase,
    durationMinutes: p.durationMinutes,
    description: p.description(subtopic.title),
    teacherActivity: [
      "Explain the concept clearly with examples",
      "Give feedback and correct misconceptions",
      "Manage learner activities and monitor progress",
    ],
    learnerActivity: [
      "Listen, take notes and ask questions",
      "Participate in discussions and group tasks",
      "Complete practice exercises independently",
    ],
  }));

  return {
    id: generateId(),
    title: `Lesson Plan — ${subtopic.title}`,
    topic: subtopic.title,
    gradeLevel: opts.gradeLevel,
    subject: opts.subject,
    durationMinutes: opts.durationMinutes,
    objectives: subtopic.learningOutcomes,
    keyInquiryQuestions: KEY_QUESTIONS.slice(0, 2),
    activities,
    assessmentMethods: ["Oral questioning", "Observation during tasks", "Exit ticket / short written task"],
    differentiationNotes:
      "Provide additional support to struggling learners with simplified tasks and peer support; extend fast learners with advanced questions.",
    materials: RESOURCES,
    createdAt: Date.now(),
  };
}

export function buildLessonNotesTemplate(opts: {
  gradeLevel: string;
  subject: string;
  subtopic: Subtopic;
}): LessonNote {
  const { subtopic } = opts;
  const match = NOTECARDS.find((c) => c.match.test(subtopic.title + " " + subtopic.learningOutcomes.join(" ")));
  const card = match || DEFAULT_NOTE;

  const keyTerms = subtopic.learningOutcomes.map((lo, i) => ({
    term: `Key idea ${i + 1}`,
    definition: lo.toLowerCase().endsWith(".") ? lo : lo + ".",
  }));

  const practiceQuestions: PracticeQuestion[] = [
    {
      question: `Define "${subtopic.title}" in your own words and give one example from daily life.`,
      answer: "A clear definition that connects the concept to a real-life example.",
    },
    {
      question: "Explain how the main ideas of this topic are connected to each other.",
      answer: "A paragraph linking the learning outcomes together.",
    },
    {
      question: "Solve / complete the practice task given by your teacher and check your work.",
      answer: "Attempted working, then comparison with the worked example.",
    },
  ];

  const markdown = [
    `# ${subtopic.title}`,
    ``,
    `> ${opts.gradeLevel} ${opts.subject} — ${subtopic.title}`,
    ``,
    `## What you need to know`,
    ``,
    card.body,
    ``,
    card.example,
    ``,
    `## Key Terms`,
    ``,
    ...keyTerms.map((k) => `- **${k.term}:** ${k.definition}`),
    ``,
    `## Summary`,
    ``,
    ...subtopic.learningOutcomes.map((lo) => `- ${lo}`),
    ``,
    `## Self-Test Questions`,
    ``,
    ...practiceQuestions.map((q, i) => `1. **${q.question}**`),
    ``,
    `*Generated with SmartTeacher — review and adapt to suit your learners.*`,
  ].join("\n");

  return {
    id: generateId(),
    title: `Lesson Notes — ${subtopic.title}`,
    topic: subtopic.title,
    gradeLevel: opts.gradeLevel,
    subject: opts.subject,
    markdown,
    keyTerms,
    practiceQuestions,
    createdAt: Date.now(),
  };
}

export function buildContextBlock(context: { chunks: { content: string }[]; webSnippets: { snippet: string }[] }): string {
  const parts: string[] = [];
  if (context.chunks.length > 0) {
    parts.push(`## Relevant text from the teacher's uploaded documents\n${context.chunks.slice(0, 4).map((c, i) => `[Document ${i + 1}]\n${c.content}`).join("\n\n")}`);
  }
  if (context.webSnippets.length > 0) {
    parts.push(`## Web search results\n${context.webSnippets.map((s) => s.snippet).join("\n\n")}`);
  }
  return parts.join("\n\n");
}