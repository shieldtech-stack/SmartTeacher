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