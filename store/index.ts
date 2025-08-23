import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import questionnaireReducer from './questionnaireSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['questionnaire'], // Only persist questionnaire state
};

const persistedQuestionnaireReducer = persistReducer(persistConfig, questionnaireReducer);

export const store = configureStore({
  reducer: {
    questionnaire: persistedQuestionnaireReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;