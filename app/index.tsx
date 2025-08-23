import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function IndexRedirect() {
  const router = useRouter();
  const submission = useSelector((state: RootState) => state.questionnaire.currentSubmission);

  useEffect(() => {
    // Si une submission existe déjà, aller directement aux tabs
    // Sinon, aller à la page de bienvenue
    if (submission) {
      router.replace('/(tabs)');
    } else {
      router.replace('/welcome');
    }
  }, [submission]);

  return null;
}