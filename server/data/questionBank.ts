import type { QuestionItem } from '../../shared/types.ts';
import { TOPIC_1_QUESTIONS } from './questions/topic1.ts';
import { TOPIC_2_QUESTIONS } from './questions/topic2.ts';
import { TOPIC_3_QUESTIONS } from './questions/topic3.ts';
import { TOPIC_4_QUESTIONS } from './questions/topic4.ts';
import { TOPIC_5_QUESTIONS } from './questions/topic5.ts';
import { TOPIC_6_QUESTIONS } from './questions/topic6.ts';
import { TOPIC_7_QUESTIONS } from './questions/topic7.ts';
import { TOPIC_8_QUESTIONS } from './questions/topic8.ts';
import { TOPIC_9_QUESTIONS } from './questions/topic9.ts';
import { TOPIC_10_QUESTIONS } from './questions/topic10.ts';
import { TOPIC_11_QUESTIONS } from './questions/topic11.ts';

export const DEFAULT_QUESTIONS: QuestionItem[] = [
  ...TOPIC_1_QUESTIONS,
  ...TOPIC_2_QUESTIONS,
  ...TOPIC_3_QUESTIONS,
  ...TOPIC_4_QUESTIONS,
  ...TOPIC_5_QUESTIONS,
  ...TOPIC_6_QUESTIONS,
  ...TOPIC_7_QUESTIONS,
  ...TOPIC_8_QUESTIONS,
  ...TOPIC_9_QUESTIONS,
  ...TOPIC_10_QUESTIONS,
  ...TOPIC_11_QUESTIONS
];
