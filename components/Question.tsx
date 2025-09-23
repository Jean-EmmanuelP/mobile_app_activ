import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Checkbox, RadioButton } from 'react-native-paper';
import type { QuestionWithChildren } from '@/lib/utils';
import { formatDate, parseDate } from '@/lib/utils';

interface QuestionProps {
  question: QuestionWithChildren;
  value: string;
  notes: string;
  onAnswerChange: (questionId: number, value: string) => void;
  onNotesChange: (questionId: number, notes: string) => void;
  onOpenSelectModal?: (questionId: number) => void;
  level?: number;
  isEditable?: boolean;
  shouldShowQuestion: (question: QuestionWithChildren) => boolean;
  children?: React.ReactNode;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}

export default function Question({
  question,
  value,
  notes,
  onAnswerChange,
  onNotesChange,
  onOpenSelectModal,
  level = 0,
  isEditable = true,
  shouldShowQuestion,
  children: childQuestions,
  autoFocus = false,
  onSubmitEditing,
}: QuestionProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // Pour les questions yesno/boolean, utiliser 'non' comme valeur par défaut
  const actualValue = (question.type === 'yesno' || question.type === 'boolean') && !value ? 'non' : value;

  // Auto-focus text inputs when autoFocus is true
  useEffect(() => {
    if (autoFocus && (question.type === 'text' || question.type === 'textarea') && textInputRef.current) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 300); // Small delay to ensure smooth transition

      return () => clearTimeout(timer);
    }
  }, [autoFocus, question.type]);

  if (!shouldShowQuestion(question)) return null;

  // Message type - just display text
  if (question.type === 'message') {
    return (
      <View style={[styles.messageContainer, { marginLeft: level * 20 }]}>
        <Text style={styles.messageText}>
          {question.text
            .replace(/⚠️|⚠|warning|triangle|🔶|⚡|\(\s*$|^\s*\(|\s*\(\s*$/g, '')
            .trim()}
        </Text>
        {question.notes && (
          <Text style={styles.messageNotes}>{question.notes}</Text>
        )}
      </View>
    );
  }

  // Group type - container for sub-questions
  if (question.type === 'group') {
    return (
      <View key={question.id} style={{ marginBottom: 10 }}>
        <View style={[styles.groupContainer, { marginLeft: level * 20 }]}>
          <Text style={styles.groupTitle}>
            {question.text
              .replace(/⚠️|⚠|warning|triangle|🔶|⚡|\(\s*$|^\s*\(|\s*\(\s*$/g, '')
              .trim()}
            {question.is_required && <Text style={styles.required}> *</Text>}
          </Text>
          {actualValue && (
            <View style={styles.groupStatus}>
              <Text style={styles.groupStatusText}>
                Réponse du groupe: {actualValue === 'oui' ? '✓ Oui' : '✗ Non'}
              </Text>
            </View>
          )}
          {question.notes && (
            <Text style={styles.questionNotes}>{question.notes}</Text>
          )}
        </View>
        {/* Sous-questions du groupe */}
        <View style={{ marginTop: 10 }}>
          {childQuestions}
        </View>
      </View>
    );
  }

  // Regular question types
  return (
    <View key={question.id} style={{ marginBottom: level === 0 ? 20 : 10 }}>
      <View style={[styles.questionContainer, { marginLeft: level * 20 }]}>
        <View style={{ marginBottom: 10 }}>
          {level > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={[styles.subQuestionText, { marginRight: 5 }]}>
                {Array(level).fill(null).map((_, i) => i === level - 1 ? '└─' : '  ').join('')}
              </Text>
              <Text style={[styles.questionText, styles.subQuestionText, { flex: 1 }]}>
                {question.text
                  .replace(/⚠️|⚠|warning|triangle|🔶|⚡|\(\s*$|^\s*\(|\s*\(\s*$/g, '')
                  .trim()}
                {question.is_required && <Text style={styles.required}> *</Text>}
              </Text>
            </View>
          ) : (
            <Text style={styles.questionText}>
              {question.text
                .replace(/⚠️|⚠|warning|triangle|🔶|⚡|\(\s*$|^\s*\(|\s*\(\s*$/g, '')
                .trim()}
              {question.is_required && <Text style={styles.required}> *</Text>}
            </Text>
          )}
        </View>

        {!isEditable ? (
          <Text style={styles.readOnlyValue}>{actualValue || 'Non répondu'}</Text>
        ) : (
          <>
            {/* Boolean/YesNo type */}
            {(question.type === 'yesno' || question.type === 'boolean') && (
              <View style={styles.yesnoContainer}>
                <TouchableOpacity
                  style={[
                    styles.yesnoButton,
                    styles.yesnoButtonNo,
                    actualValue === 'non' && styles.yesnoButtonNoActive
                  ]}
                  onPress={() => onAnswerChange(question.id, 'non')}
                >
                  <Text style={[
                    styles.yesnoText,
                    styles.yesnoTextNo,
                    actualValue === 'non' && styles.yesnoTextNoActive
                  ]}>✗ Non</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.yesnoButton,
                    styles.yesnoButtonYes,
                    actualValue === 'oui' && styles.yesnoButtonYesActive
                  ]}
                  onPress={() => onAnswerChange(question.id, 'oui')}
                >
                  <Text style={[
                    styles.yesnoText,
                    styles.yesnoTextYes,
                    actualValue === 'oui' && styles.yesnoTextYesActive
                  ]}>✓ Oui</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Text type */}
            {question.type === 'text' && (
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                value={actualValue}
                onChangeText={(text) => onAnswerChange(question.id, text)}
                placeholder="Votre réponse..."
                returnKeyType="next"
                onSubmitEditing={onSubmitEditing}
                blurOnSubmit={false}
              />
            )}

            {/* Textarea type */}
            {question.type === 'textarea' && (
              <TextInput
                ref={textInputRef}
                style={[styles.textInput, styles.textareaInput]}
                value={actualValue}
                onChangeText={(text) => onAnswerChange(question.id, text)}
                placeholder="Votre réponse détaillée..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="next"
                onSubmitEditing={onSubmitEditing}
                blurOnSubmit={false}
              />
            )}

            {/* Number type */}
            {question.type === 'number' && (
              <View>
                <TextInput
                  style={styles.textInput}
                  value={actualValue}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal point
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    
                    // Vérifier les limites si définies
                    if (question.range && cleaned !== '') {
                      const range = question.range as any;
                      const numValue = parseFloat(cleaned);
                      
                      if (!isNaN(numValue)) {
                        if (range.min !== undefined && numValue < range.min) {
                          // Ne pas afficher d'alerte, juste empêcher la saisie
                          return;
                        }
                        if (range.max !== undefined && numValue > range.max) {
                          // Ne pas afficher d'alerte, juste empêcher la saisie
                          return;
                        }
                      }
                    }
                    
                    onAnswerChange(question.id, cleaned);
                  }}
                  placeholder={(() => {
                    const range = question.range as any;
                    if (range && (range.min !== undefined || range.max !== undefined)) {
                      if (range.min !== undefined && range.max !== undefined) {
                        return `Entrez un nombre entre ${range.min} et ${range.max}...`;
                      } else if (range.min !== undefined) {
                        return `Entrez un nombre ≥ ${range.min}...`;
                      } else if (range.max !== undefined) {
                        return `Entrez un nombre ≤ ${range.max}...`;
                      }
                    }
                    return "Entrez un nombre...";
                  })()}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                />
                {question.range && (
                  <Text style={styles.rangeHint}>
                    {(() => {
                      const range = question.range as any;
                      if (range.min !== undefined && range.max !== undefined) {
                        return `Valeur entre ${range.min} et ${range.max}`;
                      } else if (range.min !== undefined) {
                        return `Valeur minimale: ${range.min}`;
                      } else if (range.max !== undefined) {
                        return `Valeur maximale: ${range.max}`;
                      }
                      return '';
                    })()}
                  </Text>
                )}
              </View>
            )}

            {/* Date type */}
            {question.type === 'date' && (
              <View>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={actualValue ? styles.dateText : styles.datePlaceholder}>
                    {actualValue ? formatDate(actualValue) : 'Sélectionner une date...'}
                  </Text>
                  <Text style={styles.dateIcon}>📅</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={actualValue ? parseDate(actualValue) || new Date() : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate && event.type === 'set') {
                        onAnswerChange(question.id, selectedDate.toISOString());
                        if (Platform.OS !== 'ios') {
                          setShowDatePicker(false);
                        }
                      }
                    }}
                  />
                )}
              </View>
            )}

            {/* Select type */}
            {question.type === 'select' && question.options && (
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => onOpenSelectModal?.(question.id)}
              >
                <Text style={[styles.selectInputText, !actualValue && styles.selectInputPlaceholder]}>
                  {actualValue || 'Choisir une option...'}
                </Text>
                <Text style={styles.selectInputArrow}>▼</Text>
              </TouchableOpacity>
            )}

            {/* Radio type */}
            {question.type === 'radio' && question.options && (
              <RadioButton.Group onValueChange={(val) => onAnswerChange(question.id, val)} value={actualValue}>
                <View style={styles.radioContainer}>
                  {(() => {
                    const opts = question.options as any;
                    let options: string[] = [];
                    
                    if (Array.isArray(opts)) {
                      options = opts;
                    } else if (opts.values && Array.isArray(opts.values)) {
                      options = opts.values;
                    } else if (opts.options && Array.isArray(opts.options)) {
                      options = opts.options;
                    }
                    
                    return options.map((opt: string) => (
                      <View key={opt} style={styles.radioItem}>
                        <RadioButton value={opt} />
                        <Text style={styles.radioLabel}>{opt}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </RadioButton.Group>
            )}

            {/* Checkboxes type */}
            {question.type === 'checkboxes' && question.options && (
              <View style={styles.checkboxContainer}>
                {(() => {
                  const opts = question.options as any;
                  let options: string[] = [];
                  
                  if (Array.isArray(opts)) {
                    options = opts;
                  } else if (opts.values && Array.isArray(opts.values)) {
                    options = opts.values;
                  } else if (opts.options && Array.isArray(opts.options)) {
                    options = opts.options;
                  }
                  
                  let selectedValues: string[] = [];
                  try {
                    selectedValues = actualValue ? JSON.parse(actualValue) : [];
                  } catch {
                    selectedValues = [];
                  }
                  
                  return options.map((opt: string) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.checkboxItem}
                      onPress={() => {
                        const newValues = selectedValues.includes(opt)
                          ? selectedValues.filter(v => v !== opt)
                          : [...selectedValues, opt];
                        onAnswerChange(question.id, JSON.stringify(newValues));
                      }}
                    >
                      <Checkbox
                        status={selectedValues.includes(opt) ? 'checked' : 'unchecked'}
                      />
                      <Text style={styles.checkboxLabel}>{opt}</Text>
                    </TouchableOpacity>
                  ));
                })()}
              </View>
            )}
          </>
        )}

        {question.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.questionNotes}>
              {question.notes
                .replace(/\*(\?tab=[^)]+\))?/g, '')
                .replace(/⚠️|⚠|warning|triangle|🔶|⚡|\(\s*$|^\s*\(/g, '')
                .trim()}
            </Text>
          </View>
        )}

        {isEditable &&
         question.type !== 'message' &&
         question.type !== 'group' &&
         question.type !== 'text' &&
         question.type !== 'textarea' &&
         !(question.type === 'number' && question.range) && (
          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesLabel}>💭 Notes additionnelles</Text>
              <Text style={styles.notesOptional}>(optionnel)</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={(text) => onNotesChange(question.id, text)}
              placeholder="Ajoutez vos commentaires ou précisions..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}
      </View>

      {/* Rendu des sous-questions */}
      {childQuestions && (
        <View style={{ marginTop: 10 }}>
          {childQuestions}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  questionContainer: {
    marginVertical: 10,
    paddingLeft: 5,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
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
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    color: '#2c3e50',
    lineHeight: 30,
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
  messageContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#e8f4ff',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1e88e5',
  },
  messageText: {
    fontSize: 18,
    color: '#1565c0',
    lineHeight: 26,
    fontWeight: '500',
  },
  messageNotes: {
    fontSize: 13,
    color: '#0d47a1',
    marginTop: 5,
    fontStyle: 'italic',
  },
  questionText: {
    fontSize: 20,
    marginBottom: 15,
    color: '#333',
    fontWeight: '600',
    lineHeight: 28,
  },
  subQuestionText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#555',
    fontWeight: '500',
    lineHeight: 26,
  },
  notesContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  notesOptional: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  questionNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  required: {
    color: '#ff0000',
  },
  readOnlyValue: {
    fontSize: 15,
    color: '#666',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    marginHorizontal: 10,
    color: '#666',
  },
  yesnoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  yesnoButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yesnoButtonNo: {
    borderColor: '#ff4757',
    backgroundColor: '#fff5f5',
  },
  yesnoButtonNoActive: {
    backgroundColor: '#ff4757',
    borderColor: '#ff4757',
    shadowColor: '#ff4757',
    shadowOpacity: 0.3,
  },
  yesnoButtonYes: {
    borderColor: '#2ed573',
    backgroundColor: '#f0fff4',
  },
  yesnoButtonYesActive: {
    backgroundColor: '#2ed573',
    borderColor: '#2ed573',
    shadowColor: '#2ed573',
    shadowOpacity: 0.3,
  },
  yesnoText: {
    fontSize: 18,
    fontWeight: '600',
  },
  yesnoTextNo: {
    color: '#ff4757',
  },
  yesnoTextNoActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  yesnoTextYes: {
    color: '#2ed573',
  },
  yesnoTextYesActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    backgroundColor: 'white',
    fontWeight: '500',
  },
  textareaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'white',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  dateIcon: {
    fontSize: 20,
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
    fontSize: 18,
    flex: 1,
    color: '#333',
    fontWeight: '500',
  },
  selectInputPlaceholder: {
    color: '#999',
  },
  selectInputArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  radioContainer: {
    marginTop: 5,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  radioLabel: {
    fontSize: 18,
    marginLeft: 8,
    color: '#333',
    fontWeight: '500',
  },
  checkboxContainer: {
    marginTop: 5,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  checkboxLabel: {
    fontSize: 18,
    marginLeft: 8,
    color: '#333',
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    color: '#495057',
    fontFamily: 'Inter_400Regular',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rangeHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
});