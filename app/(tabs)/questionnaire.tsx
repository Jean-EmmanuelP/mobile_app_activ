import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Question from '@/components/Question';
import {
  QuestionWithChildren,
  SectionWithQuestions,
  buildQuestionnaireTree,
  evaluateCondition,
  parseSelectOptions,
  validateRequiredQuestions,
} from '@/lib/utils';

function QuestionnaireContent() {
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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);

  // Callbacks pour la modal
  const handleSheetChanges = useCallback((index: number) => {
    console.log('Modal sheet index:', index);
  }, []);

  const handlePresentModal = useCallback((questionId: number) => {
    console.log('Presenting modal for question:', questionId);
    setSelectedQuestionId(questionId);
    bottomSheetModalRef.current?.present();
  }, []);

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
              console.log('Error saving default value:', error);
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
    console.log(`Answer changed for question ${questionId}: ${value}`);
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
                console.log(`Removing answer for hidden question ${child.id}: "${child.text}"`);
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

    // Debug pour vérifier les sous-questions
    if (question.children && question.children.length > 0) {
      console.log(`Question ${question.id} "${question.text}" has ${question.children.length} children:`);
      question.children.forEach(child => {
        console.log(`  - Child ${child.id}: "${child.text}" (visible: ${shouldShowQuestion(child)})`);
      });
    }

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
              console.log(`Child ${index + 1}/${question.children?.length || 0} of Q${question.id}: Q${child.id} "${child.text.substring(0, 30)}..." - visible: ${shouldShow}`);
              
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
    
    if (!isValid && missingQuestions.length > 0) {
      console.log('=== QUESTIONS REQUISES MANQUANTES ===');
      missingQuestions.forEach(q => {
        console.log(`- Question ${q.id}: "${q.text}"`);
        console.log(`  Type: ${q.type}, Parent: ${q.parent_id}, Visible: ${shouldShowQuestion(q)}`);
        console.log(`  Réponse actuelle: ${answers[q.id] || 'AUCUNE'}`);
      });
      console.log('======================================');
    }
    
    return isValid;
  };

  const handleNextSection = () => {
    const currentSection = sectionsWithQuestions[currentSectionIndex];
    console.log('Current section:', currentSection?.name, 'index:', currentSectionIndex);
    console.log('Total sections:', sectionsWithQuestions.length);
    
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
      console.log('Moving to next section:', currentSectionIndex + 1);
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
        'Confirmer la soumission',
        'Êtes-vous sûr de vouloir soumettre le questionnaire ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Soumettre', onPress: submitQuestionnaire }
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
      
      // Afficher le JSON dans la console
      console.log('=== JSON DE SOUMISSION ===');
      console.log(JSON.stringify(submissionData, null, 2));
      console.log('=========================');
      
      // Afficher aussi un résumé
      console.log('=== RÉSUMÉ ===');
      console.log(`Nombre total de réponses: ${Object.keys(finalAnswers).length}`);
      console.log(`Questions visibles répondues:`);
      Object.values(finalAnswers).forEach((item: any) => {
        console.log(`  - Q${item.question_id} (${item.question_type}): "${item.answer}"`);
      });
      console.log('===============');
      
      // LIGNE À DÉCOMMENTER POUR EMPÊCHER LA SOUMISSION RÉELLE
      return; // Décommentez cette ligne pour tester sans soumettre
      
      // Mettre à jour le statut de la submission
      const currentCount = submission.submission_count || 0;
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'submitted',
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
      <ThemedView style={styles.container}>
        <View style={styles.completedContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <ThemedText type="title" style={styles.completedTitle}>
            Questionnaire complété !
          </ThemedText>
          <ThemedText style={styles.completedDescription}>
            Votre questionnaire a été soumis avec succès.
          </ThemedText>
          
          <View style={styles.secureKeyContainer}>
            <Text style={styles.secureKeyLabel}>Votre code sécurisé</Text>
            <TouchableOpacity onPress={() => submission?.secure_key && Clipboard.setStringAsync(submission.secure_key)}>
              <Text style={styles.secureKeyValue}>{submission?.secure_key}</Text>
            </TouchableOpacity>
            <Text style={styles.secureKeyHint}>
              Communiquez ce code à votre médecin pour qu'il puisse accéder à vos réponses
            </Text>
          </View>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const currentSection = sectionsWithQuestions[currentSectionIndex];
  const isLastSection = currentSectionIndex === sectionsWithQuestions.length - 1;

  return (
    <ThemedView style={styles.container}>
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
            console.log(`Rendering top-level question ${index + 1}/${currentSection.questions.length}: ${question.text}`);
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
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Choisir une option</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
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
              
              return options.map(({ key, value }) => (
                <TouchableOpacity
                  key={String(key)}
                  style={[
                    styles.bottomSheetOption,
                    answers[selectedQuestionId] === key && styles.bottomSheetOptionActive
                  ]}
                  onPress={() => {
                    handleAnswerChange(selectedQuestionId, String(key));
                    bottomSheetModalRef.current?.dismiss();
                    setSelectedQuestionId(null);
                  }}
                >
                  <Text style={[
                    styles.bottomSheetOptionText,
                    answers[selectedQuestionId] === key && styles.bottomSheetOptionTextActive
                  ]}>
                    {String(value)}
                  </Text>
                </TouchableOpacity>
              ));
            })()}
          </ScrollView>
        </BottomSheetView>
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
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progress: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 5,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  secureKeyHeader: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 5,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 15,
    marginBottom: 10,
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
    fontWeight: '600',
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
    fontWeight: '500',
    color: '#4A90E2',
  },
  questionText: {
    fontSize: 16,
    marginBottom: 10,
  },
  subQuestionText: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  questionNotes: {
    fontSize: 12,
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
  },
  yesnoTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    minHeight: 50,
    fontSize: 16,
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
    flex: 1,
  },
  selectInputPlaceholder: {
    color: '#999',
  },
  selectInputArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  },
  bottomSheetOptionTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  notesInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    minHeight: 40,
    fontSize: 14,
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#4A90E2',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: 'bold',
  },
  completedTitle: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  completedDescription: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
  },
  secureKeyContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  secureKeyLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 10,
  },
  secureKeyValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    letterSpacing: 1,
    marginBottom: 10,
  },
  secureKeyHint: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
  },
  homeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function QuestionnaireScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QuestionnaireContent />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}