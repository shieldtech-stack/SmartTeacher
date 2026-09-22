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

const KNOWLEDGE_TEMPLATES = [
  (t: string) => `Define ${t} and describe the main ideas and key terms connected to it.`,
  (t: string) => `Explain the rule or procedure used when working with ${t}, and when each step should be applied.`,
  (t: string) => `Identify everyday situations in which ${t} can be used, and state why learning it is useful there.`,
  (t: string) => `Describe typical mistakes made with ${t} and the checking strategies that prevent them.`,
  (t: string) => `Represent ${t} using examples, diagrams or symbols, and read them back correctly.`,
  (t: string) => `Compare and contrast two examples of ${t} to highlight what changes and what stays the same.`,
  (t: string) => `Recall the vocabulary of ${t} and use it accurately when explaining answers aloud.`,
  (t: string) => `Summarise what has been learned about ${t} and link it to the next idea in the strand.`,
];

const SCHEME_QUESTIONS = [
  (t: string) => `What do we understand by ${t}, and why is it important to learn it?`,
  (t: string) => `What are the key steps to follow when working with ${t}?`,
  (t: string) => `Where do we meet ${t} in real life, and how does it help us?`,
  (t: string) => `What common errors happen with ${t}, and how can we check our work?`,
  (t: string) => `How can we show ${t} using examples, symbols or diagrams?`,
  (t: string) => `How is ${t} similar to, and different from, a related idea we already know?`,
  (t: string) => `How do we explain ${t} in our own words using the correct vocabulary?`,
  (t: string) => `What would be a good next step after practising ${t}?`,
];

const SCHEME_ATTITUDES = [
  (t: string) => `Appreciate the value of ${t} in everyday problem-solving.`,
  (t: string) => `Demonstrate curiosity when exploring ${t} in real-life situations.`,
  (t: string) => `Show teamwork and respect for peers' ideas while working on ${t}.`,
  (t: string) => `Develop accuracy and care when performing tasks involving ${t}.`,
  (t: string) => `Cultivate a positive attitude toward practising ${t} regularly.`,
  (t: string) => `Value the application of ${t} in community and school contexts.`,
  (t: string) => `Show confidence when explaining ideas related to ${t} to others.`,
  (t: string) => `Take responsibility for completing learning tasks on ${t} on time.`,
];

const SCHEME_ASSESSMENTS = [
  "Oral questions during the lesson",
  "Observation checklists and practical work",
  "Written exercises and short quizzes",
  "Peer and self-assessment",
  "End-of-week revision and assessment",
];

const GROUP_MODES = ["individually", "in pairs", "in small groups", "as a whole class"];

function lowerFirst(s: string): string {
  return s.trim().replace(/^./, (c) => c.toLowerCase());
}

// Build exactly the suggested number of lesson rows for one subtopic. Each row
// follows the KSA framework (Knowledge / Skill / Attitude), honours the
// pedagogical progression, and varies content across lessons.
export function buildSubtopicRows(sub: Subtopic, strand: string): SchemeRow[] {
  const outcomes = sub.learningOutcomes;
  const experiences = sub.suggestedExperiences && sub.suggestedExperiences.length > 0
    ? sub.suggestedExperiences
    : [
        "Brainstorm the meaning of the concept using everyday examples",
        "Apply the concept to guided practice examples",
        "Use the concept to solve a real-life task and explain the method",
      ];

  const total = sub.lessonCount && sub.lessonCount > 0
    ? sub.lessonCount
    : Math.max(1, outcomes.length);

  const t = sub.title.toLowerCase();
  const rows: SchemeRow[] = [];
  for (let i = 0; i < total; i++) {
    const exp = lowerFirst(experiences[i % experiences.length]);
    const groupMode = GROUP_MODES[i % GROUP_MODES.length];

    rows.push({
      week: 1,
      lessonNumber: i + 1,
      strand,
      subtopic: sub.title,
      learningOutcomes: [
        `Knowledge: ${KNOWLEDGE_TEMPLATES[i % KNOWLEDGE_TEMPLATES.length](t)}`,
        `Skill: ${exp.charAt(0).toUpperCase()}${exp.slice(1)}`,
        `Attitude: ${SCHEME_ATTITUDES[i % SCHEME_ATTITUDES.length](t)}`,
      ],
      keyInquiryQuestions: [SCHEME_QUESTIONS[i % SCHEME_QUESTIONS.length](t)],
      learningActivities: [`Learners ${exp}, working ${groupMode}.`],
      resources: [...RESOURCES.slice(i % RESOURCES.length), ...RESOURCES.slice(0, i % RESOURCES.length)],
      assessment: [SCHEME_ASSESSMENTS[i % SCHEME_ASSESSMENTS.length]],
    });
  }
  return rows;
}

export function renumberSchemeRows(rows: SchemeRow[], lessonsPerWeek: number): SchemeRow[] {
  const lpw = Math.max(1, lessonsPerWeek || 2);
  return rows.map((r, i) => ({ ...r, lessonNumber: i + 1, week: Math.floor(i / lpw) + 1 }));
}

export function buildSchemeTemplate(opts: {
  gradeLevel: string;
  subject: string;
  strand: string;
  term: string;
  year: number;
  durationWeeks: number;
  lessonsPerWeek?: number;
  subtopics: Subtopic[];
}): SchemeOfWork {
  const { subtopics } = opts;
  const weeks = Math.max(1, opts.durationWeeks);
  const lessonsPerWeek = Math.max(1, opts.lessonsPerWeek ?? 2);
  const maxTotalLessons = weeks * lessonsPerWeek;
  const rows: SchemeRow[] = [];

  for (const sub of subtopics) {
    for (const r of buildSubtopicRows(sub, opts.strand)) {
      if (rows.length >= maxTotalLessons) break;
      rows.push(r);
    }
  }

  const numbered = renumberSchemeRows(rows, lessonsPerWeek);
  const actualWeeks = numbered.length > 0 ? Math.max(...numbered.map(r => r.week)) : 1;

  return {
    id: generateId(),
    title: `Scheme of Work — ${opts.subject} (${opts.gradeLevel})`,
    gradeLevel: opts.gradeLevel,
    subject: opts.subject,
    strand: opts.strand,
    term: opts.term,
    year: opts.year,
    rows: numbered,
    durationWeeks: Math.max(1, actualWeeks),
    createdAt: Date.now(),
  };
}

// Derive 1-2 key inquiry questions from a learning outcome
function deriveKeyQuestions(outcome: string, subtopicTitle: string): string[] {
  const lower = outcome.toLowerCase();
  const questions: string[] = [];
  
  if (lower.includes("identify")) {
    questions.push(`What are the key features that help us identify ${subtopicTitle.toLowerCase()}?`);
  }
  if (lower.includes("describe") || lower.includes("explain")) {
    questions.push(`How would you explain the importance of ${subtopicTitle.toLowerCase()} in your own words?`);
  }
  if (lower.includes("appreciate") || lower.includes("value")) {
    questions.push(`Why is ${subtopicTitle.toLowerCase()} important in our daily lives?`);
  }
  if (lower.includes("demonstrate") || lower.includes("perform") || lower.includes("apply")) {
    questions.push(`How can we apply what we know about ${subtopicTitle.toLowerCase()} to solve a real problem?`);
  }
  if (lower.includes("classify") || lower.includes("categorize")) {
    questions.push(`What criteria would you use to group different types of ${subtopicTitle.toLowerCase()}?`);
  }
  
  // Fallback generic questions
  if (questions.length === 0) {
    questions.push(`What do we understand by ${subtopicTitle.toLowerCase()}?`);
    questions.push(`Where do we see ${subtopicTitle.toLowerCase()} in our daily lives?`);
  }
  
  return questions.slice(0, 2); // Max 2 questions per outcome
}

export function buildLessonPlanTemplate(opts: {
  gradeLevel: string;
  subject: string;
  durationMinutes: number;
  subtopic: Subtopic;
  strand: string;
  week?: number;
  lessonNumber?: number;
  term?: string;
  year?: number;
}): LessonPlan {
  const { subtopic } = opts;
  const experiences = subtopic.suggestedExperiences && subtopic.suggestedExperiences.length > 0
    ? subtopic.suggestedExperiences
    : [
        "Class discussion and brainstorming on the concept",
        "Guided problem solving / hands-on activity",
        "Group work followed by presentation of findings",
      ];

  const outcome = subtopic.learningOutcomes[0] || "";
  const experience = subtopic.suggestedExperiences?.[0] || experiences[0];

  // CBC lesson phases
  const phases = [
    { 
      section: "Introduction", 
      phase: "introduction" as const, 
      duration: 10, 
      desc: `Introduce "${subtopic.title}" using: ${experience || "questioning and discussion"}`
    },
    { 
      section: "Lesson Development - Step 1", 
      phase: "main" as const, 
      duration: 15, 
      desc: `Step 1 - Direct Instruction: Teacher explains and demonstrates key concepts for "${subtopic.title}"`
    },
    { 
      section: "Lesson Development - Step 2", 
      phase: "main" as const, 
      duration: 15, 
      desc: `Step 2 - Guided Practice: Learners practice ${subtopic.title.toLowerCase()} with teacher guidance`
    },
    { 
      section: "Lesson Development - Step 3", 
      phase: "main" as const, 
      duration: 10, 
      desc: `Step 3 - Independent Practice: Learners apply ${subtopic.title.toLowerCase()} independently`
    },
    { 
      section: "Conclusion", 
      phase: "conclusion" as const, 
      duration: 5, 
      desc: `Review key points of "${subtopic.title}", link to next lesson`
    },
];

  function makeActivities(): LessonActivity[] {
    return phases.map((p) => ({
      section: p.section,
      phase: p.phase,
      durationMinutes: p.duration,
      description: p.desc,
      teacherActivity: [
        "Introduce the concept and state learning objectives",
        "Demonstrate and model the skill/concept",
        "Guide learners through practice with feedback",
        "Facilitate independent work and monitor progress",
        "Summarize key points and assess understanding",
      ],
      learnerActivity: [
        "Listen, observe, and ask questions",
        "Participate in discussion and guided practice",
        "Work on tasks with teacher support",
        "Complete independent exercises",
        "Summarize key points and ask clarifying questions",
      ],
    }));
  }

  const activities = makeActivities();

  // Core competencies as checkbox items (CBC format)
  const coreCompetencies = subtopic.coreCompetencies && subtopic.coreCompetencies.length > 0
    ? subtopic.coreCompetencies
    : [
        "Communication and collaboration",
        "Critical thinking and problem solving",
        "Learning to learn",
      ];

  // Values
  const values = ["Respect", "Responsibility", "Integrity"];

  // PCIs
  const pcis = ["Citizenship", "Environmental awareness"];

  // Resources
  const resources = [
    "Approved course textbook",
    "Chalkboard / whiteboard and markers",
    "Printed worksheets / learner activity sheets",
    "Real objects / models / charts as applicable",
    "Digital devices (if available)",
  ];

  // Key inquiry questions derived from the single outcome
  const keyQuestions = deriveKeyQuestions(outcome, subtopic.title).slice(0, 2);

  // Extended activity
  const extendedActivity = `Practice exercise: Apply ${subtopic.title} to a real-life situation.`;

  // Teacher reflection
  const reflection = `Reflect on the effectiveness of the lesson on ${subtopic.title}. Were the learning outcomes achieved? What could be improved?`;

  return {
    id: generateId(),
    title: `Lesson Plan — ${subtopic.title}`,
    topic: subtopic.title,
    gradeLevel: opts.gradeLevel,
    subject: opts.subject,
    durationMinutes: opts.durationMinutes,
    objectives: [outcome],
    keyInquiryQuestions: keyQuestions,
    activities,
    assessmentMethods: ["Oral questioning", "Observation during tasks", "Written exercise / exit ticket"],
    differentiationNotes:
      "Provide additional support to struggling learners with simplified tasks and peer support; extend fast learners with advanced questions.",
    materials: [
      "Approved course textbook",
      "Chalkboard / whiteboard and markers",
      "Printed worksheets / learner activity sheets",
      "Real objects / models / charts as applicable",
      "Digital devices (if available)",
    ],
    coreCompetencies,
    values,
    pcis,
    resources,
    extendedActivity,
    reflection,
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