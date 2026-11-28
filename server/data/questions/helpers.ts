import type { QuestionItem } from '../../../shared/types.ts';

export function mcq(
  topicId: number,
  index: number,
  subtopicCode: string,
  prompt: string,
  options: string[],
  correctAnswer: string,
  explanation: string
): QuestionItem {
  return {
    id: `t${topicId}-mcq-${index}`,
    topicId,
    type: 'mcq',
    subtopicCode,
    prompt,
    options,
    correctAnswer,
    explanation
  };
}

export function fb(
  topicId: number,
  index: number,
  subtopicCode: string,
  prompt: string,
  correctAnswer: string,
  acceptedAnswers: string[],
  explanation: string
): QuestionItem {
  return {
    id: `t${topicId}-fb-${index}`,
    topicId,
    type: 'fill_blank',
    subtopicCode,
    prompt,
    correctAnswer,
    acceptedAnswers: Array.from(new Set([correctAnswer, ...acceptedAnswers])),
    explanation
  };
}
