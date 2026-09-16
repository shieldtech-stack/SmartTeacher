# SmartTeacher App: Development Plan & Technical Work Orders

## Executive Summary
**SmartTeacher** is a Progressive Web Application (PWA) designed to streamline instructional preparation for educators. By combining Retrieval-Augmented Generation (RAG) over user-uploaded files (PDFs, DOCX, textbook scans) with live web search, SmartTeacher generates curriculum-aligned **Schemes of Work**, **Lesson Plans**, and **Lesson Notes**.

---

## 1. System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                    Teacher Device (Web Browser / PWA)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend Layer (Next.js 14 + PWA)                    │
│  - Strand / Subtopic Cascading Selector                               │
│  - Document Uploader (Textbooks, Syllabi, Notes)                       │
│  - Interactive Preview & Markdown Editor                              │
│  - PDF / DOCX Export Engine                                            │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│     Backend APIs (Next.js Server)    │ │   Supabase (PostgreSQL + Vector)  │
│ - Curriculum Hierarchy Manager       │ │ - User Profiles & Subscriptions│
│ - Document Ingestion & Chunking      │ │ - Curriculum Trees & Strands  │
│ - Export Engine (PDF / DOCX Generator)│ │ - Vector Embeddings (pgvector)│
└───────────────────┬──────────────────┘ └───────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      AI & Search Retrieval Engine                      │
│ - LangChain / LlamaIndex Pipeline                                      │
│ - Web Search API (Tavily / Brave Search API)                           │
│ - Context Synthesis (GPT-4o / Claude 3.5 Sonnet)                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Stack Specifications

| Layer | Recommended Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) + React | Server-side rendering, seamless API routes, optimal performance. |
| **Styling & UI** | Tailwind CSS + Shadcn UI | Accessible, modern, mobile-first responsive component layout. |
| **PWA Layer** | `@ducanh2912/next-pwa` | Enables offline support, service worker caching, app manifest. |
| **Database & Vector** | Supabase (PostgreSQL + `pgvector`) | Relational data + native vector similarity search for uploaded files. |
| **File Parser / OCR** | `pdf-parse`, `mammoth` (DOCX), Tesseract / Vision AI | Extracts text from uploaded files and images. |
| **RAG & Orchestration** | LangChain / LlamaIndex | Handles document chunking, embedding generation, and prompt flow. |
| **Web Search API** | Tavily API / Brave Search API | Fetches relevant real-time web context when user uploads are sparse. |
| **LLM Engine** | Claude 3.5 Sonnet / OpenAI GPT-4o | High accuracy in structured pedagogical output generation. |
| **Export Engines** | `docx` (Node) & `weasyprint` / `html2pdf` | Generates standardized, styled, print-ready document downloads. |

---

## 3. Database Schema Blueprint (PostgreSQL / Supabase)

```sql
-- 1. Users & Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    school_name TEXT,
    country_code VARCHAR(10) DEFAULT 'KE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Curriculum Hierarchies
CREATE TABLE curricula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g. "CBC Grade 7", "IGCSE Physics"
    country VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE strands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- e.g. "Numbers & Operations"
    description TEXT
);

CREATE TABLE subtopics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strand_id UUID REFERENCES strands(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- e.g. "Fractions & Decimals"
    learning_outcomes TEXT[] -- Standardized outcomes
);

-- 3. Uploaded Source Files (RAG Context)
CREATE TABLE user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES user_files(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536) -- OpenAI embedding size
);

-- 4. Generated Documents
CREATE TABLE schemes_of_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    subject TEXT NOT NULL,
    term TEXT,
    year INT,
    content JSONB NOT NULL, -- Structured table of weeks, lessons, activities
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES schemes_of_work(id) ON DELETE SET NULL,
    subtopic_id UUID REFERENCES subtopics(id),
    topic_title TEXT NOT NULL,
    duration_minutes INT DEFAULT 40,
    objectives TEXT[] NOT NULL,
    activities JSONB NOT NULL, -- Introduction, Main Body, Conclusion
    assessment_methods TEXT[],
    differentiation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lesson_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE SET NULL,
    topic_title TEXT NOT NULL,
    markdown_content TEXT NOT NULL,
    key_terms JSONB,
    practice_questions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Development Work Orders

### Work Order 1: Core PWA Setup & Curriculum Selector
- **Objective:** Build the Next.js shell with full PWA installation capabilities and cascading curriculum selector.
- **Tasks:**
  1. Initialize Next.js 14 project with TypeScript, Tailwind CSS, and Shadcn UI.
  2. Configure PWA manifest (`manifest.json`), icons, and Service Worker via `@ducanh2912/next-pwa`.
  3. Create responsive multi-step wizard UI:
     - Step 1: Select Grade/Level & Subject.
     - Step 2: Select Strand / Topic.
     - Step 3: Select Subtopics / Learning Outcomes.
  4. Build Supabase seed data for initial curricula, strands, and subtopics.
- **Deliverable:** Mobile-ready PWA wizard allowing teachers to select curriculum components offline or online.

---

### Work Order 2: Document Parsing & RAG Pipeline
- **Objective:** Enable teachers to upload custom textbooks or syllabi and query them alongside live web search.
- **Tasks:**
  1. Build file upload UI supporting `.pdf`, `.docx`, `.png`, and `.jpg`.
  2. Implement backend ingestion pipeline:
     - Extract text from PDFs and DOCX.
     - Apply OCR (Tesseract / Vision AI) for textbook page images.
     - Chunk text into 500-token segments with overlapping context.
     - Generate vector embeddings via OpenAI `text-embedding-3-small` and store in Supabase `document_chunks`.
  3. Integrate Tavily / Brave Search API for fallback context when uploaded content is sparse.
  4. Write hybrid retrieval module that fetches top $K$ relevant chunks combined with web search snippets.
- **Deliverable:** API endpoint that receives a target subtopic and returns relevant textbook/web context.

---

### Work Order 3: Generation Engines (Scheme, Plan & Notes)
- **Objective:** Construct LLM prompt templates and pipelines to generate standardized educational outputs.
- **Tasks:**
  1. **Scheme of Work Generator:**
     - Prompt model to generate a multi-week JSON table containing: *Week*, *Lesson #*, *Strand/Subtopic*, *Specific Learning Outcomes*, *Key Inquiry Questions*, *Learning Activities*, *Resources*, and *Assessment*.
  2. **Lesson Plan Generator:**
     - Input selected subtopic + scheme requirements.
     - Generate detailed step-by-step 40-minute plan: *Hook (5m)*, *Direct Instruction (15m)*, *Guided Practice (10m)*, *Independent Work (7m)*, *Plenary/Closure (3m)*.
  3. **Lesson Notes Generator:**
     - Synthesize accurate, clear, and age-appropriate student study notes with definitions, worked examples, summary bullet points, and self-test questions.
- **Deliverable:** Fully functional prompt orchestration pipeline returning valid JSON/Markdown structures.

---

### Work Order 4: Document Export Engine (PDF & DOCX)
- **Objective:** Enable one-click downloading and printing of generated content in styled Word and PDF formats.
- **Tasks:**
  1. **DOCX Export:**
     - Implement `docx` library code generator for Schemes of Work (styled tables) and Lesson Plans.
  2. **PDF & Print Engine:**
     - Create dedicated CSS print stylesheet (`@media print`) and layout templates for standard A4 paper.
     - Build HTML-to-PDF export pipeline utilizing `weasyprint` for server-side generation.
  3. Add UI download toolbar: "Export as PDF", "Export as Word (.docx)", "Print Directly".
- **Deliverable:** Export service generating downloadable, professionally formatted `.docx` and `.pdf` files.

---

### Work Order 5: Offline Sync & PWA Optimization
- **Objective:** Ensure teachers in low-connectivity environments can view, edit, and print saved documents.
- **Tasks:**
  1. Configure IndexedDB local caching for generated schemes, plans, and notes using `idb` or Dexie.js.
  2. Setup background service worker synchronization for pending drafts.
  3. Test offline usability across iOS Safari and Android Chrome PWA instances.
- **Deliverable:** Fully offline-capable application interface for accessing saved teacher files.

---

## 5. Timeline & Milestones Summary

```
Week 1-2 : [Work Order 1] Frontend PWA Shell & Curriculum DB
Week 3-4 : [Work Order 2] File Upload, Ingestion & RAG Pipeline
Week 5-6 : [Work Order 3] Scheme, Lesson Plan & Notes Generation Engines
Week 7-8 : [Work Order 4] PDF/DOCX Export & Print System
Week 9-10: [Work Order 5] Offline Sync, QA & Deployment
```
