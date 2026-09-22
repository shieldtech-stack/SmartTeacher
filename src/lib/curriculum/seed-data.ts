import type { Curriculum, Subject, Strand, Subtopic } from "@/lib/types";

export type SeedSubtopic = Subtopic;
export interface SeedStrand extends Strand {
  subtopics: SeedSubtopic[];
}
export interface SeedSubject extends Subject {
  strands: SeedStrand[];
}
export interface SeedCurriculum {
  curriculum: Curriculum;
  subjects: SeedSubject[];
}