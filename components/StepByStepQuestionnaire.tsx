import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Question from './Question';
import { QuestionWithChildren, evaluateCondition } from '@/lib/utils';

interface StepByStepQuestionnaireProps {
  sections: Array<{
    id: number;
    name: string;
    description?: string;
    questions: QuestionWithChildren[];
  }>;
  answers: Record<number, string>;
  additionalNotes: Record<number, string>;
  onAnswerChange: (questionId: number, value: string) => void;
  onNotesChange: (questionId: number, notes: string) => void;
  onOpenSelectModal?: (questionId: number) => void;
  onComplete: () => void;
  isCompleted: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function StepByStepQuestionnaire({
  sections,
  answers,
  additionalNotes,
  onAnswerChange,
  onNotesChange,
  onOpenSelectModal,
  onComplete,
  isCompleted,
}: StepByStepQuestionnaireProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [allQuestions, setAllQuestions] = useState<(QuestionWithChildren & { sectionName: string })[]>([]);
  const [slideAnimation] = useState(new Animated.Value(0));
  const [fadeAnimation] = useState(new Animated.Value(1));

  // Flatten all questions from all sections with visibility logic
  useEffect(() => {
    const flattenQuestions = (
      questions: QuestionWithChildren[],
      sectionName: string,
      parentAnswers: Record<number, string> = {}
    ): (QuestionWithChildren & { sectionName: string })[] => {
      const result: (QuestionWithChildren & { sectionName: string })[] = [];

      for (const question of questions) {
        // Check if question should be shown
        const shouldShow = !question.condition ||
          evaluateCondition(question.condition,
            question.parent_id ? parentAnswers[question.parent_id] : undefined,
            { ...parentAnswers, ...answers }
          );

        if (shouldShow) {
          // For group questions, only add children, not the group itself
          if (question.type === 'group' && question.children && question.children.length > 0) {
            const childQuestions = flattenQuestions(
              question.children,
              sectionName,
              { ...parentAnswers, ...answers }
            );
            result.push(...childQuestions);
          } else {
            result.push({ ...question, sectionName });

            // Add children recursively if they should be shown
            if (question.children && question.children.length > 0) {
              const childQuestions = flattenQuestions(
                question.children,
                sectionName,
                { ...parentAnswers, ...answers }
              );
              result.push(...childQuestions);
            }
          }
        }
      }

      return result;
    };

    const flattened = sections.flatMap(section =>
      flattenQuestions(section.questions, section.name)
    );

    setAllQuestions(flattened);
  }, [sections, answers]);

  const currentQuestion = allQuestions[currentQuestionIndex];
  const totalQuestions = allQuestions.length;
  const progress = totalQuestions > 0 ? (currentQuestionIndex + 1) / totalQuestions : 0;

  const shouldShowQuestion = (question: QuestionWithChildren): boolean => {
    if (!question.condition) return true;

    const parentValue = question.parent_id ? answers[question.parent_id] : undefined;
    return evaluateCondition(question.condition, parentValue, answers);
  };

  const animateTransition = (direction: 'next' | 'prev') => {
    const slideDirection = direction === 'next' ? -screenWidth : screenWidth;

    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: slideDirection,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnimation.setValue(-slideDirection);
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goToNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      animateTransition('next');
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      animateTransition('prev');
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const isAnswered = (question: QuestionWithChildren): boolean => {
    const answer = answers[question.id];
    if (!answer && question.type !== 'yesno' && question.type !== 'boolean') {
      return false;
    }
    return answer !== undefined && answer !== '';
  };

  const canProceed = currentQuestion ?
    (!currentQuestion.is_required || isAnswered(currentQuestion)) :
    false;

  if (isCompleted || !currentQuestion) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.completedTitle}>Questionnaire terminé !</Text>
        <Text style={styles.completedDescription}>
          Toutes vos réponses ont été enregistrées avec succès.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: '#000000' }]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} sur {totalQuestions}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{currentQuestion.sectionName}</Text>
      </View>

      {/* Question Content */}
      <View style={styles.questionContent}>
        <View style={styles.questionCard}>
          <Animated.View
            style={[
              {
                opacity: fadeAnimation,
                transform: [{ translateX: slideAnimation }]
              }
            ]}
          >
            <Question
              question={currentQuestion}
              value={answers[currentQuestion.id] || ''}
              notes={additionalNotes[currentQuestion.id] || ''}
              onAnswerChange={onAnswerChange}
              onNotesChange={onNotesChange}
              onOpenSelectModal={onOpenSelectModal}
              level={0}
              isEditable={true}
              shouldShowQuestion={shouldShowQuestion}
              autoFocus={currentQuestion.type === 'text' || currentQuestion.type === 'textarea'}
              onSubmitEditing={goToNext}
            />
          </Animated.View>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.prevButton,
            currentQuestionIndex === 0 && styles.navButtonDisabled
          ]}
          onPress={goToPrevious}
          disabled={currentQuestionIndex === 0}
        >
          <Text style={[
            styles.navButtonText,
            currentQuestionIndex === 0 && styles.navButtonTextDisabled
          ]}>
            Précédent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            !canProceed && styles.navButtonDisabled
          ]}
          onPress={goToNext}
          disabled={!canProceed}
        >
          <Text style={[
            styles.navButtonText,
            styles.nextButtonText,
            !canProceed && styles.navButtonTextDisabled
          ]}>
            {currentQuestionIndex === totalQuestions - 1 ? 'Terminer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Skip button for optional questions */}
      {!currentQuestion.is_required && !isAnswered(currentQuestion) && (
        <TouchableOpacity style={styles.skipButton} onPress={goToNext}>
          <Text style={styles.skipButtonText}>Passer cette question</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#666666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  questionContent: {
    flex: 1,
    backgroundColor: 'white',
  },
  questionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 24,
  },
  navigation: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: Dimensions.get('window').height * 0.04,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#d0d0d0',
    backgroundColor: '#ffffff',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 50,
    gap: 6,
  },
  prevButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  nextButton: {
    backgroundColor: '#000000',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#666666',
  },
  nextButtonText: {
    color: 'white',
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
  navButtonTextDisabled: {
    color: '#ccc',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  skipButtonText: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#999999',
    textDecorationLine: 'underline',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
  completedTitle: {
    fontSize: 20,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
  },
  completedDescription: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});