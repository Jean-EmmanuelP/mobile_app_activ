import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Submission } from '@/lib/database.types';

interface QuestionnaireState {
  currentSubmission: Submission | null;
  isCompleted: boolean;
  secureKey: string | null;
  answers: Record<number, string>;
  additionalNotes: Record<number, string>;
  currentSectionIndex: number;
}

const initialState: QuestionnaireState = {
  currentSubmission: null,
  isCompleted: false,
  secureKey: null,
  answers: {},
  additionalNotes: {},
  currentSectionIndex: 0,
};

const questionnaireSlice = createSlice({
  name: 'questionnaire',
  initialState,
  reducers: {
    setSubmission: (state, action: PayloadAction<Submission>) => {
      state.currentSubmission = action.payload;
      state.secureKey = action.payload.secure_key;
    },
    setCompleted: (state, action: PayloadAction<boolean>) => {
      state.isCompleted = action.payload;
      if (state.currentSubmission) {
        state.currentSubmission.status = action.payload ? 'submitted' : 'draft';
      }
    },
    setAnswers: (state, action: PayloadAction<Record<number, string>>) => {
      state.answers = action.payload;
    },
    setAdditionalNotes: (state, action: PayloadAction<Record<number, string>>) => {
      state.additionalNotes = action.payload;
    },
    setCurrentSectionIndex: (state, action: PayloadAction<number>) => {
      state.currentSectionIndex = action.payload;
    },
    updateAnswer: (state, action: PayloadAction<{ questionId: number; value: string }>) => {
      state.answers[action.payload.questionId] = action.payload.value;
    },
    updateNote: (state, action: PayloadAction<{ questionId: number; note: string }>) => {
      state.additionalNotes[action.payload.questionId] = action.payload.note;
    },
    resetQuestionnaire: (state) => {
      state.currentSubmission = null;
      state.isCompleted = false;
      state.secureKey = null;
      state.answers = {};
      state.additionalNotes = {};
      state.currentSectionIndex = 0;
    },
  },
});

export const { 
  setSubmission, 
  setCompleted, 
  setAnswers,
  setAdditionalNotes,
  setCurrentSectionIndex,
  updateAnswer,
  updateNote,
  resetQuestionnaire 
} = questionnaireSlice.actions;
export default questionnaireSlice.reducer;