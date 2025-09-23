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
          <Ionicons name="checkmark" size={40} color="white" />
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
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
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
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentQuestionIndex === 0 ? '#ccc' : '#667eea'}
          />
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
          <Ionicons
            name={currentQuestionIndex === totalQuestions - 1 ? 'checkmark' : 'chevron-forward'}
            size={24}
            color={!canProceed ? '#ccc' : 'white'}
          />
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
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 16,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  prevButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  nextButton: {
    backgroundColor: '#667eea',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  nextButtonText: {
    color: 'white',
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
    fontSize: 14,
    color: '#6c757d',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 12,
    textAlign: 'center',
  },
  completedDescription: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
});