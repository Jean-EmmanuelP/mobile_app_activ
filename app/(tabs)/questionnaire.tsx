import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { TabScrollView } from '@/components/TabScrollView';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  setSubmission as setReduxSubmission,
  setCompleted,
  setAnswers as setReduxAnswers,
  setAdditionalNotes as setReduxNotes,
  setCurrentSectionIndex as setReduxSectionIndex,
  updateAnswer,
  updateNote
} from '@/store/questionnaireSlice';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import type { Answer, Submission } from '@/lib/database.types';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Question from '@/components/Question';
import StepByStepQuestionnaire from '@/components/StepByStepQuestionnaire';
import {
  QuestionWithChildren,
  SectionWithQuestions,
  buildQuestionnaireTree,
  evaluateCondition,
  parseSelectOptions,
  validateRequiredQuestions,
} from '@/lib/utils';

function QuestionnaireContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch();
  const reduxSubmission = useSelector((state: RootState) => state.questionnaire.currentSubmission);
  const reduxIsCompleted = useSelector((state: RootState) => state.questionnaire.isCompleted);
  const reduxAnswers = useSelector((state: RootState) => state.questionnaire.answers);
  const reduxNotes = useSelector((state: RootState) => state.questionnaire.additionalNotes);
  const reduxSectionIndex = useSelector((state: RootState) => state.questionnaire.currentSectionIndex);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sectionsWithQuestions, setSectionsWithQuestions] = useState<SectionWithQuestions[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(reduxSectionIndex);
  const [submission, setSubmission] = useState<Submission | null>(reduxSubmission);
  const [answers, setAnswers] = useState<Record<number, string>>(reduxAnswers);
  const [additionalNotes, setAdditionalNotes] = useState<Record<number, string>>(reduxNotes);
  const [isCompleted, setIsCompleted] = useState(reduxIsCompleted);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [useStepByStep, setUseStepByStep] = useState(true); // Toggle between modes
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);

  // Callbacks pour la modal
  const handleSheetChanges = useCallback((index: number) => {
    // Modal sheet index handler
  }, []);

  const handlePresentModal = useCallback((questionId: number) => {
    setSelectedQuestionId(questionId);
    bottomSheetModalRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  useEffect(() => {
    initializeQuestionnaire();
  }, []);


  const initializeQuestionnaire = async () => {
    try {
      setLoading(true);

      // Vérifier si une submission existe déjà dans Redux
      if (reduxSubmission && reduxSubmission.status !== 'submitted') {
        // Utiliser la submission existante
        setSubmission(reduxSubmission);
        
        // Récupérer les réponses existantes
        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('*')
          .eq('submission_id', reduxSubmission.id);
        
        if (existingAnswers) {
          const answersMap: Record<number, string> = {};
          const notesMap: Record<number, string> = {};
          existingAnswers.forEach(answer => {
            if (answer.question_id) {
              answersMap[answer.question_id] = answer.value;
              if (answer.additional_notes) {
                notesMap[answer.question_id] = answer.additional_notes;
              }
            }
          });
          setAnswers(answersMap);
          setAdditionalNotes(notesMap);
          dispatch(setReduxAnswers(answersMap));
          dispatch(setReduxNotes(notesMap));
        }
      } else if (!reduxSubmission) {
        // Créer une nouvelle submission draft avec secure_key
        const { data: newSubmission, error: submissionError } = await supabase
          .from('submissions')
          .insert({
            status: 'draft',
            submission_count: 0,
          })
          .select()
          .single();

        if (submissionError) throw submissionError;
        setSubmission(newSubmission);
        dispatch(setReduxSubmission(newSubmission));

        // Afficher la secure_key
        if (newSubmission.secure_key) {
          Alert.alert(
            'Code sécurisé généré',
            `Votre code sécurisé est: ${newSubmission.secure_key}\n\nGardez ce code, il vous permettra de reprendre le questionnaire ou de le partager avec votre médecin.`,
            [
              { text: 'Copier', onPress: () => Clipboard.setStringAsync(newSubmission.secure_key!) },
              { text: 'OK' }
            ]
          );
        }
      }

      // Récupérer les sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('order_index');

      if (sectionsError) throw sectionsError;

      // Récupérer toutes les questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .order('section_id')
        .order('order_index');

      if (questionsError) throw questionsError;

      // Organiser les questions par section et construire la hiérarchie
      let answersData: any[] = [];
      if (reduxSubmission) {
        const { data } = await supabase
          .from('answers')
          .select('*')
          .eq('submission_id', reduxSubmission.id);
        answersData = data || [];
      }
      
      const sectionsWithQ = buildQuestionnaireTree(
        sectionsData || [],
        questionsData || [],
        answersData
      );

      // Initialiser les valeurs par défaut pour les questions yesno/boolean
      const defaultAnswers: Record<number, string> = {};
      const currentAnswers = { ...answers };
      
      (questionsData || []).forEach((question: any) => {
        // Si la question est de type yesno/boolean et n'a pas de réponse existante
        if ((question.type === 'yesno' || question.type === 'boolean') && 
            !currentAnswers[question.id] && 
            !answersData.some(a => a.question_id === question.id)) {
          // Définir "non" comme valeur par défaut
          defaultAnswers[question.id] = 'non';
          currentAnswers[question.id] = 'non';
        }
      });
      
      // Mettre à jour les réponses avec les valeurs par défaut
      if (Object.keys(defaultAnswers).length > 0) {
        setAnswers(currentAnswers);
        dispatch(setReduxAnswers(currentAnswers));
        
        // Sauvegarder les valeurs par défaut dans la base de données si on a une submission
        const submissionId = submission?.id || reduxSubmission?.id;
        if (submissionId) {
          for (const [questionId, value] of Object.entries(defaultAnswers)) {
            try {
              await supabase
                .from('answers')
                .upsert({
                  submission_id: submissionId,
                  question_id: parseInt(questionId),
                  value: value,
                  additional_notes: null,
                } as any, {
                  onConflict: 'submission_id,question_id'
                });
            } catch (error) {
              // Error saving default value - silently continue
            }
          }
        }
      }

      setSectionsWithQuestions(sectionsWithQ);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      Alert.alert('Erreur', 'Impossible de charger le questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (questionId: number, value: string, notes?: string) => {
    if (!submission) return;

    try {
      const { error } = await supabase
        .from('answers')
        .upsert({
          submission_id: submission.id,
          question_id: questionId,
          value: value,
          additional_notes: notes || null,
        } as any, {
          onConflict: 'submission_id,question_id'
        });

      if (error) throw error;

      // Mettre à jour la submission pour rafraîchir updated_at
      await supabase
        .from('submissions')
        .update({ updated_at: new Date().toISOString() } as any)
        .eq('id', submission.id);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la réponse:', error);
    }
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    dispatch(updateAnswer({ questionId, value }));
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: value };
      
      // Si c'est une sous-question, vérifier si le parent est de type "group"
      const allQuestions = sectionsWithQuestions.flatMap(s => s.questions);
      const findQuestionById = (id: number, questions: QuestionWithChildren[]): QuestionWithChildren | null => {
        for (const q of questions) {
          if (q.id === id) return q;
          if (q.children) {
            const found = findQuestionById(id, q.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Nettoyer les réponses des questions qui deviennent invisibles
      const cleanupHiddenAnswers = (questions: QuestionWithChildren[]) => {
        questions.forEach(q => {
          // Si la question a des enfants, vérifier leur visibilité
          if (q.children) {
            q.children.forEach(child => {
              // Utiliser les nouvelles réponses pour évaluer les conditions
              const shouldShow = evaluateCondition(child.condition, newAnswers[child.parent_id!], newAnswers);
              if (!shouldShow && newAnswers[child.id]) {
                delete newAnswers[child.id];
                // Supprimer aussi de la base de données
                if (submission) {
                  supabase
                    .from('answers')
                    .delete()
                    .eq('submission_id', submission.id)
                    .eq('question_id', child.id)
                    .then(({ error }) => {
                      if (error) console.error('Error deleting hidden answer:', error);
                    });
                }
              }
              // Récursion pour les sous-enfants
              if (child.children) {
                cleanupHiddenAnswers(child.children);
              }
            });
          }
        });
      };
      
      // Nettoyer les réponses cachées
      cleanupHiddenAnswers(allQuestions);
      
      const currentQuestion = findQuestionById(questionId, allQuestions);
      if (currentQuestion?.parent_id) {
        const parentQuestion = findQuestionById(currentQuestion.parent_id, allQuestions);
        if (parentQuestion?.type === 'group' && parentQuestion.children) {
          // Calculer la valeur du groupe basée sur les sous-questions
          const childAnswers = parentQuestion.children.map(child => newAnswers[child.id]);
          const hasYes = childAnswers.some(a => a === 'oui');
          const allAnswered = parentQuestion.children.every(child => 
            !child.is_required || newAnswers[child.id]
          );
          
          if (allAnswered) {
            // Si au moins une sous-question est "oui", le groupe est "oui"
            newAnswers[parentQuestion.id] = hasYes ? 'oui' : 'non';
            saveAnswer(parentQuestion.id, newAnswers[parentQuestion.id], additionalNotes[parentQuestion.id]);
          }
        }
      }
      
      return newAnswers;
    });
    
    saveAnswer(questionId, value, additionalNotes[questionId]);
  };

  const handleNotesChange = (questionId: number, notes: string) => {
    dispatch(updateNote({ questionId, note: notes }));
    setAdditionalNotes(prev => ({ ...prev, [questionId]: notes }));
    if (answers[questionId]) {
      saveAnswer(questionId, answers[questionId], notes);
    }
  };

  // Vérifier si une sous-question doit être affichée selon la condition
  const shouldShowQuestion = (question: QuestionWithChildren): boolean => {
    // Toujours afficher les questions sans condition
    if (!question.condition) {
      return true;
    }
    
    // Si la question a une condition mais pas de parent_id, utiliser les réponses globales
    const parentValue = question.parent_id ? answers[question.parent_id] : undefined;
    return evaluateCondition(question.condition, parentValue, answers);
  };

  const renderQuestion = (question: QuestionWithChildren, level: number = 0): React.ReactNode => {
    const answer = answers[question.id] || '';
    const notes = additionalNotes[question.id] || '';

    // Check sub-questions visibility

    return (
      <Question
        key={question.id}
        question={question}
        value={answer}
        notes={notes}
        onAnswerChange={handleAnswerChange}
        onNotesChange={handleNotesChange}
        onOpenSelectModal={handlePresentModal}
        level={level}
        isEditable={true}
        shouldShowQuestion={shouldShowQuestion}
      >
        {question.children && question.children.length > 0 && (
          <View>
            {question.children.map((child, index) => {
              // Vérifier explicitement si la sous-question doit être affichée
              const shouldShow = shouldShowQuestion(child);

              if (!shouldShow) {
                return null;
              }
              return (
                <View key={child.id}>
                  {renderQuestion(child, level + 1)}
                </View>
              );
            })}
          </View>
        )}
      </Question>
    );
  };

  const checkRequiredQuestions = (questions: QuestionWithChildren[]): boolean => {
    const { isValid, missingQuestions } = validateRequiredQuestions(
      questions,
      answers,
      shouldShowQuestion
    );
    
    // Validation completed
    
    return isValid;
  };

  const handleNextSection = () => {
    const currentSection = sectionsWithQuestions[currentSectionIndex];
    
    if (currentSection && currentSection.questions && currentSection.questions.length > 0) {
      if (!checkRequiredQuestions(currentSection.questions)) {
        Alert.alert(
          'Questions requises',
          'Veuillez répondre à toutes les questions obligatoires avant de continuer.'
        );
        return;
      }
    }

    if (currentSectionIndex < sectionsWithQuestions.length - 1) {
      const newIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(newIndex);
      dispatch(setReduxSectionIndex(newIndex));
      
      // Scroll vers le haut de la page
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      }, 100);
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      const newIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(newIndex);
      dispatch(setReduxSectionIndex(newIndex));
      
      // Scroll vers le haut de la page
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      }, 100);
    }
  };

  const handleSubmit = async () => {
    const isLastSection = currentSectionIndex === sectionsWithQuestions.length - 1;
    
    if (!isLastSection) {
      handleNextSection();
      return;
    }
    if (!submission) return;

    const currentSection = sectionsWithQuestions[currentSectionIndex];
    
    if (!checkRequiredQuestions(currentSection.questions)) {
      Alert.alert(
        'Questions requises',
        'Veuillez répondre à toutes les questions obligatoires avant de continuer.'
      );
      return;
    }

    // Si c'est la dernière section, soumettre le questionnaire
    if (currentSectionIndex === sectionsWithQuestions.length - 1) {
      Alert.alert(
        'Finaliser le questionnaire',
        'Vous pourrez toujours revenir sur ce questionnaire pour le modifier par la suite, même en présence de votre médecin.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Finaliser', onPress: submitQuestionnaire }
        ]
      );
    } else {
      handleNextSection();
    }
  };

  const submitQuestionnaire = async () => {
    if (!submission) return;

    try {
      setSubmitting(true);

      // Construire le JSON final avec uniquement les questions visibles et répondues
      const finalAnswers: any = {};
      const allQuestions: QuestionWithChildren[] = [];
      
      // Collecter toutes les questions
      const collectQuestions = (questions: QuestionWithChildren[]) => {
        questions.forEach(q => {
          allQuestions.push(q);
          if (q.children) {
            collectQuestions(q.children);
          }
        });
      };
      
      sectionsWithQuestions.forEach(section => {
        collectQuestions(section.questions);
      });
      
      // Filtrer uniquement les questions visibles et avec réponse
      allQuestions.forEach(question => {
        // Vérifier si la question est visible
        if (shouldShowQuestion(question)) {
          // Vérifier si la question a une réponse
          const answer = answers[question.id];
          if (answer !== undefined && answer !== '' && answer !== null) {
            finalAnswers[question.id] = {
              question_id: question.id,
              question_text: question.text,
              question_type: question.type,
              answer: answer,
              section_id: question.section_id,
              parent_id: question.parent_id,
              is_required: question.is_required,
              additional_notes: additionalNotes[question.id] || null
            };
          }
        }
      });
      
      // Créer le JSON de soumission
      const submissionData = {
        submission_id: submission.id,
        secure_key: submission.secure_key,
        submitted_at: new Date().toISOString(),
        answers_count: Object.keys(finalAnswers).length,
        answers: finalAnswers
      };
      
      // Submission data prepared
      
      // LIGNE À DÉCOMMENTER POUR EMPÊCHER LA SOUMISSION RÉELLE
      // return; // Décommentez cette ligne pour tester sans soumettre
      
      // Mettre à jour le statut de la submission
      const currentCount = submission.submission_count || 0;
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'saved',
          submission_count: currentCount + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', submission.id);

      if (error) throw error;

      setIsCompleted(true);
      dispatch(setCompleted(true));
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      Alert.alert('Erreur', 'Impossible de soumettre le questionnaire');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Chargement du questionnaire...</ThemedText>
      </ThemedView>
    );
  }

  // Écran de fin avec rappel de la secure_key
  if (isCompleted) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + 20 }]}>
          <View style={styles.completedContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <ThemedText type="title" style={styles.completedTitle}>
            Questionnaire sauvegardé !
          </ThemedText>
          <ThemedText style={styles.completedDescription}>
            Votre questionnaire a été sauvegardé avec succès. Vous pouvez y revenir à tout moment pour le modifier, le compléter à nouveau ou mettre à jour vos réponses.
          </ThemedText>
          
          <View style={styles.secureKeyContainer}>
            <Text style={styles.secureKeyLabel}>Code de soumission pour votre médecin</Text>
            <TouchableOpacity onPress={() => submission?.secure_key && Clipboard.setStringAsync(submission.secure_key)}>
              <Text style={styles.secureKeyValue}>
                {submission?.secure_key ? submission.secure_key.substring(0, 4) : '****'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.secureKeyHint}>
              Transmettez ces 4 premiers chiffres à votre médecin
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.actionButton, styles.modifyButton]}
              onPress={() => {
                setIsCompleted(false);
                dispatch(setCompleted(false));
              }}
            >
              <Text style={styles.modifyButtonText}>Modifier le questionnaire</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.homeButton]}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ThemedView>
    );
  }

  const currentSection = sectionsWithQuestions[currentSectionIndex];
  const isLastSection = currentSectionIndex === sectionsWithQuestions.length - 1;

  // Step-by-step mode
  if (useStepByStep) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header with back arrow and toggle */}
        <View style={styles.headerWithBack}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="chevron-back" size={20} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setUseStepByStep(false)}
          >
            <Text style={styles.toggleButtonText}>Vue classique</Text>
          </TouchableOpacity>
        </View>

        <StepByStepQuestionnaire
          sections={sectionsWithQuestions.map(section => ({
            id: section.id,
            name: section.name,
            description: section.description,
            questions: section.questions,
          }))}
          answers={answers}
          additionalNotes={additionalNotes}
          onAnswerChange={handleAnswerChange}
          onNotesChange={handleNotesChange}
          onOpenSelectModal={handlePresentModal}
          onComplete={() => {
            Alert.alert(
              'Finaliser le questionnaire',
              'Vous pourrez toujours revenir sur ce questionnaire pour le modifier par la suite, même en présence de votre médecin.',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Finaliser', onPress: submitQuestionnaire }
              ]
            );
          }}
          isCompleted={isCompleted}
        />

        {/* Bottom Sheet Modal pour les selects */}
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.modalBackground}
          handleIndicatorStyle={styles.handleIndicator}
          handleStyle={styles.handleStyle}
        >
          {selectedQuestionId && (() => {
            // Chercher la question dans toutes les questions et sous-questions
            const findQuestion = (questions: QuestionWithChildren[]): QuestionWithChildren | undefined => {
              for (const q of questions) {
                if (q.id === selectedQuestionId) return q;
                if (q.children) {
                  const found = findQuestion(q.children);
                  if (found) return found;
                }
              }
              return undefined;
            };

            const question = findQuestion(currentSection?.questions || []);

            if (!question?.options) return null;

            const options = parseSelectOptions(question.options);

            return (
              <BottomSheetFlatList
                data={options}
                keyExtractor={(item) => String(item.key)}
                ListHeaderComponent={() => (
                  <Text style={styles.bottomSheetTitle}>Choisir une option</Text>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.bottomSheetOption,
                      answers[selectedQuestionId] === item.key && styles.bottomSheetOptionActive
                    ]}
                    onPress={() => {
                      handleAnswerChange(selectedQuestionId, String(item.key));
                      bottomSheetModalRef.current?.dismiss();
                      setSelectedQuestionId(null);
                    }}
                  >
                    <Text style={[
                      styles.bottomSheetOptionText,
                      answers[selectedQuestionId] === item.key && styles.bottomSheetOptionTextActive
                    ]}>
                      {String(item.value)}
                    </Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.bottomSheetContent}
              />
            );
          })()}
        </BottomSheetModal>
      </ThemedView>
    );
  }

  // Classic mode
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header with back arrow and toggle */}
        <View style={styles.headerWithBack}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="chevron-back" size={20} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setUseStepByStep(true)}
          >
            <Text style={styles.toggleButtonText}>Vue step-by-step</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentSectionIndex + 1) / sectionsWithQuestions.length) * 100}%` }
            ]}
          />
        </View>
        <ThemedText type="subtitle">
          {currentSection?.name || 'Questionnaire'}
        </ThemedText>
        {sectionsWithQuestions.length > 0 && (
          <Text style={styles.progress}>
            Section {currentSectionIndex + 1} sur {sectionsWithQuestions.length}
          </Text>
        )}
        {submission?.secure_key && (
          <TouchableOpacity onPress={() => Clipboard.setStringAsync(submission.secure_key!)}>
            <Text style={styles.secureKeyHeader}>Code: {submission.secure_key}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TabScrollView
        style={styles.scrollView}
        ref={scrollViewRef}
        showsVerticalScrollIndicator={true}
      >
        {currentSection?.description && (
          <Text style={styles.sectionDescription}>{currentSection.description}</Text>
        )}

        <View>
          {currentSection?.questions.map((question, index) => {
            return (
              <View key={question.id}>
                {renderQuestion(question, 0)}
              </View>
            );
          })}
        </View>
      </TabScrollView>

      {/* Bottom Sheet Modal pour les selects */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.modalBackground}
        handleIndicatorStyle={styles.handleIndicator}
        handleStyle={styles.handleStyle}
      >
        {selectedQuestionId && (() => {
          // Chercher la question dans toutes les questions et sous-questions
          const findQuestion = (questions: QuestionWithChildren[]): QuestionWithChildren | undefined => {
            for (const q of questions) {
              if (q.id === selectedQuestionId) return q;
              if (q.children) {
                const found = findQuestion(q.children);
                if (found) return found;
              }
            }
            return undefined;
          };
          
          const question = findQuestion(currentSection?.questions || []);
          
          if (!question?.options) return null;
          
          const options = parseSelectOptions(question.options);
          
          return (
            <BottomSheetFlatList
              data={options}
              keyExtractor={(item) => String(item.key)}
              ListHeaderComponent={() => (
                <Text style={styles.bottomSheetTitle}>Choisir une option</Text>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.bottomSheetOption,
                    answers[selectedQuestionId] === item.key && styles.bottomSheetOptionActive
                  ]}
                  onPress={() => {
                    handleAnswerChange(selectedQuestionId, String(item.key));
                    bottomSheetModalRef.current?.dismiss();
                    setSelectedQuestionId(null);
                  }}
                >
                  <Text style={[
                    styles.bottomSheetOptionText,
                    answers[selectedQuestionId] === item.key && styles.bottomSheetOptionTextActive
                  ]}>
                    {String(item.value)}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.bottomSheetContent}
            />
          );
        })()}
      </BottomSheetModal>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentSectionIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePreviousSection}
          disabled={currentSectionIndex === 0}
        >
          <Text style={styles.navButtonText}>Précédent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.navButtonTextPrimary}>
              {isLastSection ? 'Compléter' : 'Suivant'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d0d0d0',
    backgroundColor: '#ffffff',
  },
  progress: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 5,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  secureKeyHeader: {
    fontSize: 11,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 5,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: 'NotoIkea',
    color: '#666666',
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  questionContainer: {
    marginVertical: 15,
  },
  groupContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  groupTitle: {
    fontSize: 17,
    fontFamily: 'NotoIkea',
    marginBottom: 5,
    color: '#2c3e50',
  },
  groupStatus: {
    marginTop: 5,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  groupStatusText: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    color: '#4A90E2',
  },
  questionText: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    marginBottom: 10,
  },
  subQuestionText: {
    fontSize: 15,
    fontFamily: 'NotoIkea',
    fontStyle: 'italic',
  },
  questionNotes: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    opacity: 0.6,
    marginTop: 5,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  required: {
    color: '#ff0000',
  },
  yesnoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  yesnoButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  yesnoButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  yesnoText: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
  },
  yesnoTextActive: {
    color: 'white',
    fontFamily: 'NotoIkea',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    minHeight: 50,
    fontSize: 16,
    fontFamily: 'NotoIkea',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'white',
  },
  selectInputText: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    flex: 1,
  },
  selectInputPlaceholder: {
    color: '#999',
  },
  selectInputArrow: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    color: '#666',
    marginLeft: 10,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontFamily: 'NotoIkea',
    marginBottom: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  modalBackground: {
    backgroundColor: 'white',
  },
  handleIndicator: {
    backgroundColor: '#ccc',
  },
  handleStyle: {
    backgroundColor: 'white',
  },
  bottomSheetOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bottomSheetOptionActive: {
    backgroundColor: '#e8f4ff',
  },
  bottomSheetOptionText: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
  },
  bottomSheetOptionTextActive: {
    color: '#4A90E2',
    fontFamily: 'NotoIkea',
  },
  notesInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    minHeight: 40,
    fontSize: 14,
    fontFamily: 'NotoIkea',
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: Dimensions.get('window').height * 0.04,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  navButton: {
    flex: 1,
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  navButtonPrimary: {
    backgroundColor: '#000000',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#666666',
  },
  navButtonTextPrimary: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: 'white',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#50C878',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    color: 'white',
    fontSize: 40,
    fontFamily: 'NotoIkea',
  },
  completedTitle: {
    fontSize: 20,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000000',
  },
  completedDescription: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  secureKeyContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secureKeyLabel: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 8,
  },
  secureKeyValue: {
    fontSize: 18,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 2,
    marginBottom: 8,
  },
  secureKeyHint: {
    fontSize: 11,
    fontFamily: 'NotoIkea',
    color: '#999999',
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    marginTop: 20,
    gap: 15,
  },
  actionButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
  },
  modifyButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#000000',
  },
  modifyButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: '#000000',
  },
  homeButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
  headerWithBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d0d0d0',
  },
  backButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#f8f8f8',
  },
  toggleButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
});

export default function QuestionnaireScreen() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <QuestionnaireContent />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}