import type { Curriculum, Subject, Strand, Subtopic } from "@/lib/types";

export interface SeedStrand extends Strand {
  subtopics: Subtopic[];
}
export interface SeedSubject extends Subject {
  strands: SeedStrand[];
}
export interface SeedCurriculum {
  curriculum: Curriculum;
  subjects: SeedSubject[];
}

export const SEED_CURRICULA: SeedCurriculum[] = [
  {
    curriculum: {
      id: "cbc-g7",
      name: "CBC Grade 7 (Junior Secondary)",
      gradeLevel: "Grade 7",
      country: "Kenya",
      description: "Kenya Competency-Based Curriculum, Junior Secondary, Grade 7.",
    },
    subjects: [
      {
        id: "g7-mathematics",
        curriculumId: "cbc-g7",
        name: "Mathematics",
        description: "Numbers, algebra, geometry, measurement and data handling.",
        strands: [
          {
            id: "g7-math-numbers",
            subjectId: "g7-mathematics",
            title: "Numbers & Operations",
            description: "Fractions, decimals, integers, ratios and proportions.",
            subtopics: [
              {
                id: "g7-math-fractions",
                strandId: "g7-math-numbers",
                title: "Fractions (Operations)",
                learningOutcomes: [
                  "Add, subtract, multiply and divide fractions using the correct order of operations",
                  "Convert between mixed numbers and improper fractions",
                  "Apply fraction operations to solve real-life problems",
                ],
              },
              {
                id: "g7-math-decimals",
                strandId: "g7-math-numbers",
                title: "Decimals",
                learningOutcomes: [
                  "Perform operations with decimals to three decimal places",
                  "Round decimals to a given degree of accuracy",
                  "Solve problems involving money and measurements using decimals",
                ],
              },
              {
                id: "g7-math-integers",
                strandId: "g7-math-numbers",
                title: "Integers",
                learningOutcomes: [
                  "Represent integers on a number line",
                  "Add and subtract integers correctly",
                  "Apply integers to represent real-life situations such as temperature and debt",
                ],
              },
              {
                id: "g7-math-ratios",
                strandId: "g7-math-numbers",
                title: "Ratios, Rates & Proportions",
                learningOutcomes: [
                  "Express quantities as ratios in their simplest form",
                  "Find rates such as speed and density",
                  "Solve problems involving direct proportion",
                ],
              },
            ],
          },
          {
            id: "g7-math-algebra",
            subjectId: "g7-mathematics",
            title: "Algebra",
            description: "Expressions, linear equations and inequalities.",
            subtopics: [
              {
                id: "g7-math-algexpr",
                strandId: "g7-math-algebra",
                title: "Algebraic Expressions",
                learningOutcomes: [
                  "Simplify algebraic expressions by collecting like terms",
                  "Evaluate expressions by substituting given values",
                  "Multiply and divide simple algebraic terms",
                ],
              },
              {
                id: "g7-math-lineareq",
                strandId: "g7-math-algebra",
                title: "Linear Equations",
                learningOutcomes: [
                  "Solve linear equations in one unknown",
                  "Form equations from word problems",
                  "Verify solutions by substitution",
                ],
              },
              {
                id: "g7-math-ineq",
                strandId: "g7-math-algebra",
                title: "Inequalities",
                learningOutcomes: [
                  "Represent inequalities on a number line",
                  "Solve simple linear inequalities",
                  "Interpret inequality statements in real-life contexts",
                ],
              },
            ],
          },
          {
            id: "g7-math-measurement",
            subjectId: "g7-mathematics",
            title: "Measurement",
            description: "Length, area, volume and angles.",
            subtopics: [
              {
                id: "g7-math-length",
                strandId: "g7-math-measurement",
                title: "Length, Mass & Capacity",
                learningOutcomes: [
                  "Convert between metric units of length, mass and capacity",
                  "Estimate and measure length, mass and capacity accurately",
                  "Solve problems involving perimeter of composite shapes",
                ],
              },
              {
                id: "g7-math-area",
                strandId: "g7-math-measurement",
                title: "Perimeter & Area",
                learningOutcomes: [
                  "Calculate the area of rectangles, triangles and parallelograms",
                  "Find the perimeter and area of composite figures",
                  "Apply area formulae to real-life contexts such as flooring and farming",
                ],
              },
              {
                id: "g7-math-volume",
                strandId: "g7-math-measurement",
                title: "Volume & Capacity",
                learningOutcomes: [
                  "Determine the volume of cubes and cuboids",
                  "Relate volume to capacity in litres",
                  "Solve problems involving volume of containers",
                ],
              },
              {
                id: "g7-math-angles",
                strandId: "g7-math-measurement",
                title: "Angles",
                learningOutcomes: [
                  "Measure and draw angles using a protractor",
                  "Identify angles on a straight line and at a point",
                  "Apply angle facts to solve problems",
                ],
              },
            ],
          },
          {
            id: "g7-math-geometry",
            subjectId: "g7-mathematics",
            title: "Geometry",
            description: "Plane figures, constructions and symmetry.",
            subtopics: [
              {
                id: "g7-math-planefig",
                strandId: "g7-math-geometry",
                title: "Common Plane Figures",
                learningOutcomes: [
                  "Identify properties of triangles, quadrilaterals and circles",
                  "Classify triangles by sides and angles",
                  "State and apply sum of angles in a triangle",
                ],
              },
              {
                id: "g7-math-construction",
                strandId: "g7-math-geometry",
                title: "Construction of Lines & Angles",
                learningOutcomes: [
                  "Construct perpendicular and parallel lines using a ruler and set square",
                  "Bisect angles and line segments",
                  "Construct common angles such as 60° and 90°",
                ],
              },
              {
                id: "g7-math-symmetry",
                strandId: "g7-math-geometry",
                title: "Symmetry",
                learningOutcomes: [
                  "Identify lines of symmetry in plane figures",
                  "Complete figures given a line of symmetry",
                  "Recognise rotational symmetry of common shapes",
                ],
              },
            ],
          },
          {
            id: "g7-math-data",
            subjectId: "g7-mathematics",
            title: "Data Handling",
            description: "Collecting, representing and interpreting data.",
            subtopics: [
              {
                id: "g7-math-datarep",
                strandId: "g7-math-data",
                title: "Data Collection & Representation",
                learningOutcomes: [
                  "Collect data using tally charts and questionnaires",
                  "Represent data using bar graphs and line graphs",
                  "Interpret information from graphs and tables",
                ],
              },
              {
                id: "g7-math-central",
                strandId: "g7-math-data",
                title: "Measures of Central Tendency",
                learningOutcomes: [
                  "Calculate the mean, median and mode of a data set",
                  "Choose the most suitable average for a given situation",
                  "Interpret central tendency measures in context",
                ],
              },
              {
                id: "g7-math-probability",
                strandId: "g7-math-data",
                title: "Probability",
                learningOutcomes: [
                  "Classify events as certain, likely, unlikely or impossible",
                  "Determine the probability of simple events",
                  "Express probability as a fraction, decimal or percentage",
                ],
              },
            ],
          },
          {
            id: "g7-math-timemoney",
            subjectId: "g7-mathematics",
            title: "Time & Money",
            description: "Time calculations and financial literacy.",
            subtopics: [
              {
                id: "g7-math-timecalc",
                strandId: "g7-math-timemoney",
                title: "Time Calculations",
                learningOutcomes: [
                  "Convert units of time between seconds, minutes and hours",
                  "Calculate duration of events in 12 and 24 hour time",
                  "Read and interpret timetables",
                ],
              },
              {
                id: "g7-math-money",
                strandId: "g7-math-timemoney",
                title: "Money & Shopping",
                learningOutcomes: [
                  "Calculate total costs, change and discounts",
                  "Determine profit and loss",
                  "Interpret simple financial records such as budgets",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "g7-integrated-science",
        curriculumId: "cbc-g7",
        name: "Integrated Science",
        description: "Biology, chemistry and physics built around real life contexts.",
        strands: [
          {
            id: "g7-sci-living",
            subjectId: "g7-integrated-science",
            title: "Living Things & Their Environment",
            description: "Cells, ecology and reproduction.",
            subtopics: [
              {
                id: "g7-sci-cells",
                strandId: "g7-sci-living",
                title: "Plant & Animal Cells",
                learningOutcomes: [
                  "Identify the main parts of plant and animal cells",
                  "Distinguish between plant and animal cells",
                  "Use a microscope to observe cells",
                ],
              },
              {
                id: "g7-sci-ecosystems",
                strandId: "g7-sci-living",
                title: "Ecosystems & Food Chains",
                learningOutcomes: [
                  "Define ecosystem and its components",
                  "Construct simple food chains and food webs",
                  "Describe how energy flows through ecosystems",
                ],
              },
              {
                id: "g7-sci-reproduction",
                strandId: "g7-sci-living",
                title: "Reproduction in Plants",
                learningOutcomes: [
                  "Identify the parts of a flower",
                  "Explain pollination, fertilisation and seed dispersal",
                  "Describe the life cycle of a flowering plant",
                ],
              },
            ],
          },
          {
            id: "g7-sci-matter",
            subjectId: "g7-integrated-science",
            title: "Matter & Materials",
            description: "States of matter, mixtures and acids and bases.",
            subtopics: [
              {
                id: "g7-sci-states",
                strandId: "g7-sci-matter",
                title: "States of Matter & Changes",
                learningOutcomes: [
                  "Describe the three states of matter in terms of particle arrangement",
                  "Explain melting, boiling, evaporation and condensation",
                  "Apply particle theory to everyday phenomena",
                ],
              },
              {
                id: "g7-sci-mixtures",
                strandId: "g7-sci-matter",
                title: "Mixtures & Solutions",
                learningOutcomes: [
                  "Distinguish between pure substances and mixtures",
                  "Separate mixtures using filtration, evaporation and distillation",
                  "Explain factors that affect solubility",
                ],
              },
              {
                id: "g7-sci-acids",
                strandId: "g7-sci-matter",
                title: "Acids, Bases & Indicators",
                learningOutcomes: [
                  "Identify common acids and bases",
                  "Use indicators to classify solutions",
                  "Describe neutralisation and its applications",
                ],
              },
            ],
          },
          {
            id: "g7-sci-energy",
            subjectId: "g7-integrated-science",
            title: "Energy & Forces",
            description: "Energy transformations, electricity and forces.",
            subtopics: [
              {
                id: "g7-sci-energforms",
                strandId: "g7-sci-energy",
                title: "Forms & Transformation of Energy",
                learningOutcomes: [
                  "Identify different forms of energy",
                  "Describe energy transformations using flow diagrams",
                  "Discuss renewable and non-renewable energy sources",
                ],
              },
              {
                id: "g7-sci-circuits",
                strandId: "g7-sci-energy",
                title: "Electricity & Circuits",
                learningOutcomes: [
                  "Construct simple series and parallel circuits",
                  "Explain current, voltage and resistance basics",
                  "Observe safety practices when handling electricity",
                ],
              },
              {
                id: "g7-sci-forces",
                strandId: "g7-sci-energy",
                title: "Forces & their Effects",
                learningOutcomes: [
                  "Identify different types of forces",
                  "Describe the effects of forces on the motion of objects",
                  "Explain friction and its everyday applications",
                ],
              },
            ],
          },
          {
            id: "g7-sci-earth",
            subjectId: "g7-integrated-science",
            title: "Earth & Space Science",
            description: "Solar system, weather and earth resources.",
            subtopics: [
              {
                id: "g7-sci-solar",
                strandId: "g7-sci-earth",
                title: "The Solar System",
                learningOutcomes: [
                  "Describe the structure of the solar system",
                  "Explain the causes of day and night and seasons",
                  "Discuss the importance of space exploration",
                ],
              },
              {
                id: "g7-sci-weather",
                strandId: "g7-sci-earth",
                title: "Weather & Climate",
                learningOutcomes: [
                  "Measure weather elements using appropriate instruments",
                  "Distinguish between weather and climate",
                  "Describe the local effects of climate change",
                ],
              },
              {
                id: "g7-sci-resources",
                strandId: "g7-sci-earth",
                title: "Earth's Resources & Conservation",
                learningOutcomes: [
                  "Classify earth resources as renewable or non-renewable",
                  "Explain the importance of water and soil conservation",
                  "Practice responsible use of natural resources",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "g7-english",
        curriculumId: "cbc-g7",
        name: "English",
        description: "Listening, speaking, reading and writing in English.",
        strands: [
          {
            id: "g7-eng-reading",
            subjectId: "g7-english",
            title: "Reading & Comprehension",
            description: "Reading fluency and comprehension of texts.",
            subtopics: [
              {
                id: "g7-eng-comprehension",
                strandId: "g7-eng-reading",
                title: "Comprehension Strategies",
                learningOutcomes: [
                  "Infer meaning from context in written texts",
                  "Identify main ideas and supporting details",
                  "Summarise passages in one's own words",
                ],
              },
              {
                id: "g7-eng-vocab",
                strandId: "g7-eng-reading",
                title: "Vocabulary Development",
                learningOutcomes: [
                  "Use synonyms and antonyms accurately",
                  "Interpret figurative language",
                  "Apply new vocabulary in writing and speech",
                ],
              },
            ],
          },
          {
            id: "g7-eng-writing",
            subjectId: "g7-english",
            title: "Writing",
            description: "Paragraphing, essays and creative writing.",
            subtopics: [
              {
                id: "g7-eng-paragraphs",
                strandId: "g7-eng-writing",
                title: "Paragraph Construction",
                learningOutcomes: [
                  "Write well-structured paragraphs with topic sentences",
                  "Develop ideas logically with supporting detail",
                  "Use cohesive devices to link ideas",
                ],
              },
              {
                id: "g7-eng-essays",
                strandId: "g7-eng-writing",
                title: "Essay Writing",
                learningOutcomes: [
                  "Plan essays using outlines",
                  "Write narrative and descriptive essays",
                  "Revise and edit written work for clarity",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "g7-kiswahili",
        curriculumId: "cbc-g7",
        name: "Kiswahili",
        description: "Lugha, fasihi na utamaduni katika Kiswahili.",
        strands: [
          {
            id: "g7-swa-insha",
            subjectId: "g7-kiswahili",
            title: "Insha na Utungaji",
            description: "Utungaji wa insha na maandishi.",
            subtopics: [
              {
                id: "g7-swa-insha-narr",
                strandId: "g7-swa-insha",
                title: "Insha Simulizi",
                learningOutcomes: [
                  "Kuandika insha simulizi yenye mpangilio sahihi",
                  "Kutumia msamiati mbalimbali katika uandishi",
                  "Kuhariri insha zilizoandikwa",
                ],
              },
            ],
          },
          {
            id: "g7-swa-ufahamu",
            subjectId: "g7-kiswahili",
            title: "Ufahamu na Kuelewa",
            description: "Kusoma na kuelewa maandishi.",
            subtopics: [
              {
                id: "g7-swa-ufahamu-text",
                strandId: "g7-swa-ufahamu",
                title: "Ufahamu wa Kimaandishi",
                learningOutcomes: [
                  "Kujibu maswali kulingana na maandishi",
                  "Kueleza maana ya maneno katika muktadha",
                  "Kubainisha dhamira ya mwandishi",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    curriculum: {
      id: "cbc-g8",
      name: "CBC Grade 8 (Junior Secondary)",
      gradeLevel: "Grade 8",
      country: "Kenya",
      description: "Kenya Competency-Based Curriculum, Junior Secondary, Grade 8.",
    },
    subjects: [
      {
        id: "g8-mathematics",
        curriculumId: "cbc-g8",
        name: "Mathematics",
        description: "Advanced number work, algebra and measurement.",
        strands: [
          {
            id: "g8-math-numbers",
            subjectId: "g8-mathematics",
            title: "Numbers & Operations",
            description: "Powers, factors and percentages.",
            subtopics: [
              {
                id: "g8-math-factors",
                strandId: "g8-math-numbers",
                title: "Factors, Multiples & Powers",
                learningOutcomes: [
                  "Find the LCM and GCD of sets of numbers",
                  "Evaluate powers and square roots",
                  "Express numbers in index form",
                ],
              },
              {
                id: "g8-math-percentages",
                strandId: "g8-math-numbers",
                title: "Percentages & Money",
                learningOutcomes: [
                  "Calculate percentage increase and decrease",
                  "Determine interest and hire purchase costs",
                  "Solve problems involving taxation",
                ],
              },
            ],
          },
          {
            id: "g8-math-algebra",
            subjectId: "g8-mathematics",
            title: "Algebra",
            description: "Linear expressions and equations of two variables.",
            subtopics: [
              {
                id: "g8-math-linexp",
                strandId: "g8-math-algebra",
                title: "Linear Expressions & Equations",
                learningOutcomes: [
                  "Simplify and expand linear expressions",
                  "Solve equations involving brackets",
                  "Form and solve equations from word problems",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "g8-integrated-science",
        curriculumId: "cbc-g8",
        name: "Integrated Science",
        description: "Integrated science at junior secondary level.",
        strands: [
          {
            id: "g8-sci-body",
            subjectId: "g8-integrated-science",
            title: "The Human Body",
            description: "Body systems and health.",
            subtopics: [
              {
                id: "g8-sci-organ",
                strandId: "g8-sci-body",
                title: "Organ Systems",
                learningOutcomes: [
                  "Describe the functions of major organ systems",
                  "Explain the interaction of body systems",
                  "Practice habits that promote healthy living",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    curriculum: {
      id: "igcse-physics",
      name: "IGCSE Physics (Cambridge)",
      gradeLevel: "International GCSE",
      country: "United Kingdom",
      description: "Cambridge IGCSE Physics 0625 syllabus.",
    },
    subjects: [
      {
        id: "igcse-physics-subject",
        curriculumId: "igcse-physics",
        name: "Physics",
        description: "Physics 0625 syllabus.",
        strands: [
          {
            id: "igcse-physics-motion",
            subjectId: "igcse-physics-subject",
            title: "Motion & Forces",
            description: "Kinematics and dynamics.",
            subtopics: [
              {
                id: "igcse-physics-kinematics",
                strandId: "igcse-physics-motion",
                title: "Kinematics",
                learningOutcomes: [
                  "Distinguish between distance, displacement, speed and velocity",
                  "Plot and interpret distance-time and speed-time graphs",
                  "Calculate average speed and acceleration",
                ],
              },
              {
                id: "igcse-physics-newton",
                strandId: "igcse-physics-motion",
                title: "Forces & Newton's Laws",
                learningOutcomes: [
                  "Describe the effect of balanced and unbalanced forces",
                  "State and apply Newton's laws of motion",
                  "Explain the role of friction and air resistance",
                ],
              },
            ],
          },
          {
            id: "igcse-physics-energy",
            subjectId: "igcse-physics-subject",
            title: "Energy Transfers",
            description: "Energy, work and power.",
            subtopics: [
              {
                id: "igcse-physics-energycon",
                strandId: "igcse-physics-energy",
                title: "Energy, Work & Power",
                learningOutcomes: [
                  "Calculate kinetic and potential energy",
                  "Compute work done and power",
                  "Evaluate energy efficiency of devices",
                ],
              },
            ],
          },
          {
            id: "igcse-physics-electricity",
            subjectId: "igcse-physics-subject",
            title: "Electricity & Magnetism",
            description: "Circuits, magnetism and electromagnetism.",
            subtopics: [
              {
                id: "igcse-physics-circuits",
                strandId: "igcse-physics-electricity",
                title: "Electric Circuits",
                learningOutcomes: [
                  "Draw and interpret circuit diagrams",
                  "Apply Ohm's law to solve circuit problems",
                  "Calculate electrical power and energy usage",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function flattenSubtopics(): Subtopic[] {
  const out: Subtopic[] = [];
  for (const c of SEED_CURRICULA) {
    for (const s of c.subjects) {
      for (const st of s.strands) out.push(...st.subtopics);
    }
  }
  return out;
}