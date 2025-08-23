import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
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
import type { Question, Answer, Submission, Section } from '@/lib/database.types';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface QuestionWithChildren extends Question {
  children?: QuestionWithChildren[];
}

interface SectionWithQuestions extends Section {
  questions: QuestionWithChildren[];
}

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

  // Fonction pour construire l'arbre de questions avec hiérarchie
  const buildQuestionTree = (questions: Question[], parentId: number | null = null): QuestionWithChildren[] => {
    return questions
      .filter(q => q.parent_id === parentId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(q => ({
        ...q,
        children: buildQuestionTree(questions, q.id)
      }));
  };

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
              { text: 'Copier', onPress: () => Clipboard.setString(newSubmission.secure_key!) },
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
      const sectionsWithQ: SectionWithQuestions[] = (sectionsData || []).map(section => {
        const sectionQuestions = (questionsData || []).filter(q => q.section_id === section.id);
        const tree = buildQuestionTree(sectionQuestions);
        console.log(`Section ${section.name}: ${tree.length} top-level questions`);
        tree.forEach(q => {
          console.log(`- Question ${q.id}: ${q.text} (${q.children?.length || 0} children)`);
        });
        return {
          ...section,
          questions: tree
        };
      });

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
        }, {
          onConflict: 'submission_id,question_id'
        });

      if (error) throw error;

      // Mettre à jour la submission pour rafraîchir updated_at
      await supabase
        .from('submissions')
        .update({ updated_at: new Date().toISOString() })
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
    // Si pas de condition ou pas de parent, toujours afficher
    if (!question.condition || !question.parent_id) {
      return true;
    }
    
    const condition = question.condition as any;
    const parentAnswer = answers[question.parent_id];
    
    // Log pour debug
    console.log(`Checking visibility for question ${question.id}:`, {
      parentId: question.parent_id,
      parentAnswer,
      condition,
      shouldShow: false
    });
    
    // Vérifier différents formats de condition
    if (condition.parent_value !== undefined) {
      // Format: {"parent_value": "oui"}
      return parentAnswer === condition.parent_value;
    } else if (condition.show_if !== undefined) {
      // Format: {"show_if": "value"}
      return parentAnswer === condition.show_if;
    } else if (typeof condition === 'string') {
      // Format direct: "oui"
      return parentAnswer === condition;
    }
    
    // Par défaut, afficher la question
    return true;
  };

  const renderQuestion = (question: QuestionWithChildren, level: number = 0): React.ReactNode => {
    if (!shouldShowQuestion(question)) return null;

    const answer = answers[question.id] || '';
    const notes = additionalNotes[question.id] || '';

    // Pour les questions de type "group", afficher uniquement le titre et les sous-questions
    if (question.type === 'group') {
      return (
        <View key={question.id}>
          <View style={[styles.groupContainer, { marginLeft: level * 20 }]}>
            <Text style={styles.groupTitle}>
              {question.text}
              {question.is_required && <Text style={styles.required}> *</Text>}
            </Text>
            {answer && (
              <View style={styles.groupStatus}>
                <Text style={styles.groupStatusText}>
                  Réponse du groupe: {answer === 'oui' ? '✓ Oui' : '✗ Non'}
                </Text>
              </View>
            )}
            {question.notes && (
              <Text style={styles.questionNotes}>{question.notes}</Text>
            )}
          </View>
          
          {/* Rendre les sous-questions du groupe */}
          {question.children && question.children.length > 0 && 
            question.children.map(child => renderQuestion(child, level + 1))
          }
        </View>
      );
    }

    return (
      <View key={question.id}>
        <View style={[styles.questionContainer, { marginLeft: level * 20 }]}>
          <Text style={[styles.questionText, level > 0 && styles.subQuestionText]}>
            {level > 0 && '→ '}
            {question.text}
            {question.is_required && <Text style={styles.required}> *</Text>}
          </Text>

          {question.type === 'yesno' && (
            <View style={styles.yesnoContainer}>
              <TouchableOpacity
                style={[
                  styles.yesnoButton,
                  answer === 'oui' && styles.yesnoButtonActive
                ]}
                onPress={() => handleAnswerChange(question.id, 'oui')}
              >
                <Text style={[
                  styles.yesnoText,
                  answer === 'oui' && styles.yesnoTextActive
                ]}>Oui</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.yesnoButton,
                  answer === 'non' && styles.yesnoButtonActive
                ]}
                onPress={() => handleAnswerChange(question.id, 'non')}
              >
                <Text style={[
                  styles.yesnoText,
                  answer === 'non' && styles.yesnoTextActive
                ]}>Non</Text>
              </TouchableOpacity>
            </View>
          )}

          {question.type === 'text' && (
            <TextInput
              style={styles.textInput}
              value={answer}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              placeholder="Votre réponse..."
              multiline
            />
          )}

          {question.type === 'number' && (
            <TextInput
              style={styles.textInput}
              value={answer}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              placeholder="Entrez un nombre..."
              keyboardType="numeric"
            />
          )}

          {question.type === 'select' && question.options && (() => {
            // Parser les options correctement
            let displayValue = 'Choisir une option...';
            if (answer) {
              const opts = question.options as any;
              if (Array.isArray(opts)) {
                displayValue = answer;
              } else if (opts.values && Array.isArray(opts.values)) {
                displayValue = answer;
              } else if (typeof opts === 'object') {
                displayValue = opts[answer] || answer;
              } else {
                displayValue = answer;
              }
            }
            
            return (
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => handlePresentModal(question.id)}
              >
                <Text style={[styles.selectInputText, !answer && styles.selectInputPlaceholder]}>
                  {displayValue}
                </Text>
                <Text style={styles.selectInputArrow}>▼</Text>
              </TouchableOpacity>
            );
          })()}

          {question.notes && (
            <Text style={styles.questionNotes}>{question.notes}</Text>
          )}

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={(text) => handleNotesChange(question.id, text)}
            placeholder="Notes additionnelles (optionnel)..."
            multiline
          />
        </View>

        {/* Rendre les sous-questions immédiatement après la question parente */}
        {question.children && question.children.length > 0 && 
          question.children.map(child => renderQuestion(child, level + 1))
        }
      </View>
    );
  };

  const checkRequiredQuestions = (questions: QuestionWithChildren[]): boolean => {
    console.log('Checking required questions:', questions.length, 'questions');
    console.log('Current answers:', answers);
    
    if (!questions || questions.length === 0) {
      console.log('No questions in this section');
      return true;
    }
    
    for (const question of questions) {
      if (shouldShowQuestion(question)) {
        console.log(`Checking question ${question.id}: "${question.text}", required: ${question.is_required}, answer: ${answers[question.id]}`);
        
        if (question.is_required && !answers[question.id]) {
          console.log(`Missing required answer for question ${question.id}`);
          return false;
        }
        
        if (question.children && question.children.length > 0) {
          if (!checkRequiredQuestions(question.children)) {
            return false;
          }
        }
      }
    }
    return true;
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
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      const newIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(newIndex);
      dispatch(setReduxSectionIndex(newIndex));
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

      // Mettre à jour le statut de la submission
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'submitted',
          submission_count: 1,
          updated_at: new Date().toISOString(),
        })
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
            <TouchableOpacity onPress={() => submission?.secure_key && Clipboard.setString(submission.secure_key)}>
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
          <TouchableOpacity onPress={() => Clipboard.setString(submission.secure_key!)}>
            <Text style={styles.secureKeyHeader}>Code: {submission.secure_key}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TabScrollView style={styles.scrollView}>
        {currentSection?.description && (
          <Text style={styles.sectionDescription}>{currentSection.description}</Text>
        )}
        
        {currentSection?.questions.map(question => renderQuestion(question, 0))}
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
              
              // Parser les options correctement selon le format
              let options: { key: string; value: string }[] = [];
              const opts = question.options as any;
              
              if (Array.isArray(opts)) {
                // Format direct: ["option1", "option2"]
                options = opts.map((opt: any) => ({ 
                  key: String(opt), 
                  value: String(opt) 
                }));
              } else if (opts && typeof opts === 'object') {
                if (opts.values && Array.isArray(opts.values)) {
                  // Format {"values": ["option1", "option2"]}
                  options = opts.values.map((opt: any) => ({ 
                    key: String(opt), 
                    value: String(opt) 
                  }));
                } else {
                  // Format {"key1": "value1", "key2": "value2"}
                  options = Object.entries(opts).map(([key, value]) => ({ 
                    key, 
                    value: String(value) 
                  }));
                }
              }
              
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