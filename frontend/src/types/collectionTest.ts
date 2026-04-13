export type TestQuestion = {
  id: string; // card id (the correct card)
  question: string; // frontText to display
  options: string[]; // 4 shuffled rearText values (1 correct + 3 wrong)
  correctAnswer: string; // correct rearText
};

export type CollectionTestData = {
  collectionId: string;
  questions: TestQuestion[];
};

export type CollectionTestSessionResponse = {
  questions: TestQuestion[];
  testSessionId: string;
  answeredCardIds: string[];
};

export type SubmitAnswerResponse = {
  correctCount: number;
  totalCount: number;
};