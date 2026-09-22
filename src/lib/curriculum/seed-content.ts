import type { SeedCurriculum } from "./seed-data";

/**
 * Curated starter curriculum library.
 *
 * This gives teachers meaningful topic data immediately (no import needed) so
 * the offline template and AI prompts both produce realistic output. Content is
 * CBC-aligned, Grade 8 Mathematics. Expand with more subjects/grades over time.
 */
export const CURATED_CURRICULA: SeedCurriculum[] = [
  {
    curriculum: {
      id: "seed-cbc-g8-math",
      name: "CBC Grade 8 Mathematics (starter library)",
      gradeLevel: "Grade 8",
      country: "Kenya",
      description:
        "Curated Grade 8 Mathematics strands and subtopics with learning outcomes and suggested experiences. Expand it or add your own via the importer.",
    },
    subjects: [
      {
        id: "seed-cbc-g8-math-subject",
        curriculumId: "seed-cbc-g8-math",
        name: "Mathematics",
        description: "Numbers, Algebra, Measurement, Geometry, Data & Probability, and Ratio & Proportion.",
        strands: [
          {
            id: "seed-cbc-g8-math-num",
            subjectId: "seed-cbc-g8-math-subject",
            title: "Numbers & Operations",
            description: "Integers, fractions, decimals, percentages, squares, square roots and standard form.",
            subtopics: [
              {
                id: "seed-cbc-g8-math-num-int",
                strandId: "seed-cbc-g8-math-num",
                title: "Integers",
                lessonCount: 6,
                learningOutcomes: [
                  "Recognise and order positive and negative integers in real-life contexts",
                  "Perform addition and subtraction of integers",
                  "Apply integers in solving real-life word problems",
                ],
                suggestedExperiences: [
                  "Order and compare integers using a number line in pairs",
                  "Play a temperature and altitude integer game in groups",
                  "Solve real-life word problems involving positive and negative numbers",
                ],
              },
              {
                id: "seed-cbc-g8-math-num-fdp",
                strandId: "seed-cbc-g8-math-num",
                title: "Fractions, Decimals and Percentages",
                lessonCount: 8,
                learningOutcomes: [
                  "Convert between fractions, decimals and percentages",
                  "Order and compare fractions, decimals and percentages",
                  "Apply fractions, decimals and percentages in financial contexts",
                ],
                suggestedExperiences: [
                  "Convert values using a fraction-to-decimal-to-percentage chart",
                  "Play a matching game linking equivalent forms",
                  "Plan a school fundraiser budget using percentages",
                ],
              },
              {
                id: "seed-cbc-g8-math-num-sq",
                strandId: "seed-cbc-g8-math-num",
                title: "Squares, Square Roots and Standard Form",
                lessonCount: 5,
                learningOutcomes: [
                  "Determine squares and square roots of whole numbers",
                  "Express very large and very small numbers in standard form",
                  "Use standard form in scientific contexts",
                ],
                suggestedExperiences: [
                  "Discover square roots by building area models",
                  "Express distances and microscope measurements in standard form",
                  "Research and present examples of standard form in science",
                ],
              },
            ],
          },
          {
            id: "seed-cbc-g8-math-alg",
            subjectId: "seed-cbc-g8-math-subject",
            title: "Algebra",
            description: "Algebraic expressions, linear equations and inequalities.",
            subtopics: [
              {
                id: "seed-cbc-g8-math-alg-expr",
                strandId: "seed-cbc-g8-math-alg",
                title: "Algebraic Expressions",
                lessonCount: 6,
                learningOutcomes: [
                  "Identify variables, coefficients and like terms in algebraic expressions",
                  "Simplify algebraic expressions by collecting like terms",
                  "Substitute values into algebraic expressions",
                ],
                suggestedExperiences: [
                  "Use algebra tiles to model collecting like terms",
                  "Simplify expressions in a relay race",
                  "Substitute values to evaluate expressions in real-life contexts",
                ],
              },
              {
                id: "seed-cbc-g8-math-alg-eq",
                strandId: "seed-cbc-g8-math-alg",
                title: "Linear Equations",
                lessonCount: 5,
                learningOutcomes: [
                  "Solve simple linear equations in one unknown",
                  "Form equations from word problems",
                  "Solve real-life problems using linear equations",
                ],
                suggestedExperiences: [
                  "Solve equations using the balance method",
                  "Form and solve equations from word problems in groups",
                  "Present different methods of solving a linear equation",
                ],
              },
              {
                id: "seed-cbc-g8-math-alg-ineq",
                strandId: "seed-cbc-g8-math-alg",
                title: "Inequalities",
                lessonCount: 4,
                learningOutcomes: [
                  "Represent inequalities on a number line",
                  "Solve simple linear inequalities",
                  "Interpret inequality solutions in real-life contexts",
                ],
                suggestedExperiences: [
                  "Graph inequalities on a number line",
                  "Solve inequalities and verify the answers with a number line",
                  "Explore real-life constraints expressed as inequalities",
                ],
              },
            ],
          },
          {
            id: "seed-cbc-g8-math-mea",
            subjectId: "seed-cbc-g8-math-subject",
            title: "Measurement",
            description: "Units of measurement, area, perimeter, volume and surface area.",
            subtopics: [
              {
                id: "seed-cbc-g8-math-mea-units",
                strandId: "seed-cbc-g8-math-mea",
                title: "Units of Measurement",
                lessonCount: 4,
                learningOutcomes: [
                  "Convert units of length, mass and capacity",
                  "Apply unit conversions in daily life",
                  "Estimate measurements using appropriate units",
                ],
                suggestedExperiences: [
                  "Measure and convert units of classroom objects",
                  "Convert units while following a recipe",
                  "Estimate and verify lengths, masses and volumes",
                ],
              },
              {
                id: "seed-cbc-g8-math-mea-area",
                strandId: "seed-cbc-g8-math-mea",
                title: "Area and Perimeter",
                lessonCount: 5,
                learningOutcomes: [
                  "Find the perimeter and area of rectangles and composite shapes",
                  "Apply area and perimeter in design contexts",
                  "Relate perimeter and area when solving problems",
                ],
                suggestedExperiences: [
                  "Measure the classroom and calculate its floor area",
                  "Design a school garden plot using area and perimeter",
                  "Solve puzzles involving perimeter and area",
                ],
              },
              {
                id: "seed-cbc-g8-math-mea-vol",
                strandId: "seed-cbc-g8-math-mea",
                title: "Volume and Surface Area",
                lessonCount: 5,
                learningOutcomes: [
                  "Find the volume of cubes, cuboids and cylinders",
                  "Find the surface area of cubes and cuboids",
                  "Apply volume in real-life packing contexts",
                ],
                suggestedExperiences: [
                  "Build cuboids with unit cubes and count their volume",
                  "Measure boxes and compute volume and surface area",
                  "Solve packing problems using volume",
                ],
              },
            ],
          },
          {
            id: "seed-cbc-g8-math-geo",
            subjectId: "seed-cbc-g8-math-subject",
            title: "Geometry",
            description: "Angles, constructions, scale drawings and transformations.",
            subtopics: [
              {
                id: "seed-cbc-g8-math-geo-angles",
                strandId: "seed-cbc-g8-math-geo",
                title: "Angles",
                lessonCount: 5,
                learningOutcomes: [
                  "Identify and measure angles using a protractor",
                  "Calculate unknown angles in triangles and quadrilaterals",
                  "Apply angle properties when constructing shapes",
                ],
                suggestedExperiences: [
                  "Measure angles around the classroom using protractors",
                  "Discover that the angles of a triangle sum to 180 degrees",
                  "Construct triangles and quadrilaterals using given angle measures",
                ],
              },
              {
                id: "seed-cbc-g8-math-geo-scale",
                strandId: "seed-cbc-g8-math-geo",
                title: "Constructions and Scale Drawings",
                lessonCount: 4,
                learningOutcomes: [
                  "Construct line segments, circles and angles accurately",
                  "Interpret and make scale drawings",
                  "Use scale drawings in real-life planning",
                ],
                suggestedExperiences: [
                  "Practise geometric constructions using a ruler and a pair of compasses",
                  "Draw a scale plan of the classroom",
                  "Interpret a map or floor plan using its scale",
                ],
              },
              {
                id: "seed-cbc-g8-math-geo-transform",
                strandId: "seed-cbc-g8-math-geo",
                title: "Transformations",
                lessonCount: 6,
                learningOutcomes: [
                  "Identify reflections, rotations and translations",
                  "Perform reflections, rotations and translations on shapes",
                  "Describe transformations using coordinates",
                ],
                suggestedExperiences: [
                  "Explore transformations on a grid or geoboard",
                  "Create patterns using reflections and rotations",
                  "Describe the movement of shapes on coordinate grids",
                ],
              },
            ],
          },
          {
            id: "seed-cbc-g8-math-data",
            subjectId: "seed-cbc-g8-math-subject",
            title: "Data & Probability",
            description: "Data collection and representation, measures of central tendency and probability.",
            subtopics: [
              {
                id: "seed-cbc-g8-math-data-rep",
                strandId: "seed-cbc-g8-math-data",
                title: "Data Collection and Representation",
                lessonCount: 5,
                learningOutcomes: [
                  "Collect and record data systematically",
                  "Represent data using tables, bar graphs and pie charts",
                  "Interpret data representations",
                ],
                suggestedExperiences: [
                  "Conduct a class survey and record the results",
                  "Draw bar graphs and pie charts of survey data",
                  "Interpret graphs and charts presented in the media",
                ],
              },
              {
                id: "seed-cbc-g8-math-data-centre",
                strandId: "seed-cbc-g8-math-data",
                title: "Measures of Central Tendency",
                lessonCount: 4,
                learningOutcomes: [
                  "Find the mean, median and mode of a data set",
                  "Use measures of central tendency in everyday contexts",
                  "Compare data sets using the mean",
                ],
                suggestedExperiences: [
                  "Compute the mean, median and mode of class test scores",
                  "Analyse weekly spending using the mean",
                  "Compare two data sets using measures of central tendency",
                ],
              },
              {
                id: "seed-cbc-g8-math-data-prob",
                strandId: "seed-cbc-g8-math-data",
                title: "Probability",
                lessonCount: 5,
                learningOutcomes: [
                  "Describe probability as a measure of chance",
                  "Determine the probability of simple events",
                  "Interpret probabilities in daily activities",
                ],
                suggestedExperiences: [
                  "Conduct a coin-toss experiment and record outcomes",
                  "Compute the probability of outcomes in simple games",
                  "Discuss probability statements in weather and sport",
                ],
              },
            ],
          },
          {
            id: "seed-cbc-g8-math-rat",
            subjectId: "seed-cbc-g8-math-subject",
            title: "Ratio, Rate & Proportion",
            description: "Ratio and proportion, rates and speed, and percentages in real life.",
            subtopics: [
              {
                id: "seed-cbc-g8-math-rat-ratio",
                strandId: "seed-cbc-g8-math-rat",
                title: "Ratio and Proportion",
                lessonCount: 5,
                learningOutcomes: [
                  "Express ratios in simplest form",
                  "Share quantities in a given ratio",
                  "Apply ratio and proportion in practical tasks",
                ],
                suggestedExperiences: [
                  "Simplify ratios using equivalent ratios",
                  "Share amounts in a given ratio in groups",
                  "Mix quantities such as juice or paint using ratios",
                ],
              },
              {
                id: "seed-cbc-g8-math-rat-rate",
                strandId: "seed-cbc-g8-math-rat",
                title: "Rates and Speed",
                lessonCount: 4,
                learningOutcomes: [
                  "Calculate rates including speed as distance over time",
                  "Convert between units of speed",
                  "Solve problems involving rates in daily life",
                ],
                suggestedExperiences: [
                  "Measure walking speed over a known distance",
                  "Convert speeds between kilometres per hour and metres per second",
                  "Plan travel time given speed and distance",
                ],
              },
              {
                id: "seed-cbc-g8-math-rat-pct",
                strandId: "seed-cbc-g8-math-rat",
                title: "Percentages in Real Life",
                lessonCount: 4,
                learningOutcomes: [
                  "Express quantities and comparisons as percentages",
                  "Calculate percentages of amounts such as discounts, profit and VAT",
                  "Apply percentages in financial decisions",
                ],
                suggestedExperiences: [
                  "Compute discounts on prices in a shop scenario",
                  "Calculate profit and loss on sales",
                  "Interpret percentage data in sales and news reports",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];