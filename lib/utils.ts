import type { Question, Answer, Section } from './database.types';

export interface QuestionWithChildren extends Question {
  children?: QuestionWithChildren[];
  value?: string | null;
}

export interface SectionWithQuestions extends Section {
  questions: QuestionWithChildren[];
}

export function buildQuestionnaireTree(
  sections: Section[],
  questions: Question[],
  answers: Answer[] = []
): SectionWithQuestions[] {
  const answersMap = answers.reduce((acc, ans) => {
    if (ans.question_id) {
      acc[ans.question_id] = ans.value;
    }
    return acc;
  }, {} as Record<number, string>);

  return sections
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map(section => ({
      ...section,
      questions: buildQuestionTree(
        questions.filter(q => q.section_id === section.id),
        null,
        answersMap
      )
    }));
}

export function buildQuestionTree(
  questions: Question[],
  parentId: number | null = null,
  answersMap: Record<number, string> = {}
): QuestionWithChildren[] {
  const result = questions
    .filter(q => q.parent_id === parentId)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map(q => {
      const children = buildQuestionTree(questions, q.id, answersMap);
      console.log(`Question ${q.id} "${q.text.substring(0, 50)}..." has ${children.length} children`);
      return {
        ...q,
        value: answersMap[q.id] || null,
        children
      };
    });
  
  if (parentId === null && result.length > 0) {
    console.log(`Built tree with ${result.length} root questions`);
  }
  
  return result;
}

export function evaluateCondition(
  condition: any,
  parentValue: string | undefined | null,
  allAnswers?: Record<number, string>
): boolean {
  if (!condition) return true;
  
  // Support pour différents formats de condition
  if (typeof condition === 'object') {
    // Condition simple basée sur le parent
    if (condition.parent_value !== undefined) {
      // Support pour valeurs multiples
      if (Array.isArray(condition.parent_value)) {
        return condition.parent_value.includes(parentValue);
      }
      return parentValue === condition.parent_value;
    } 
    
    // Autres formats de conditions simples
    if (condition.show_if !== undefined) {
      return parentValue === condition.show_if;
    } else if (condition.equals !== undefined) {
      return parentValue === condition.equals;
    } else if (condition.in !== undefined && Array.isArray(condition.in)) {
      return condition.in.includes(parentValue);
    } else if (condition.not_equals !== undefined) {
      return parentValue !== condition.not_equals;
    } else if (condition.not_empty !== undefined && condition.not_empty) {
      return !!parentValue && parentValue.trim() !== '';
    } else if (condition.is_empty !== undefined && condition.is_empty) {
      return !parentValue || parentValue.trim() === '';
    }
    
    // Conditions avec comparaisons numériques
    if (condition.type === 'less_than' && condition.parent_id && allAnswers) {
      const value = parseFloat(allAnswers[condition.parent_id] || '0');
      return value < (condition.value || 0);
    }
    if (condition.type === 'greater_than' && condition.parent_id && allAnswers) {
      const value = parseFloat(allAnswers[condition.parent_id] || '0');
      return value > (condition.value || 0);
    }
    if (condition.type === 'equals' && condition.parent_id && allAnswers) {
      return allAnswers[condition.parent_id] === condition.value;
    }
    
    // Conditions combinées (AND/OR)
    if (condition.and && Array.isArray(condition.and)) {
      return condition.and.every((cond: any) => {
        // Pour les conditions AND, on passe allAnswers pour évaluer chaque condition
        if (cond.parent_id && allAnswers) {
          const condParentValue = allAnswers[cond.parent_id];
          return evaluateCondition(cond, condParentValue, allAnswers);
        }
        return evaluateCondition(cond, parentValue, allAnswers);
      });
    }
    if (condition.or && Array.isArray(condition.or)) {
      return condition.or.some((cond: any) => {
        if (cond.parent_id && allAnswers) {
          const condParentValue = allAnswers[cond.parent_id];
          return evaluateCondition(cond, condParentValue, allAnswers);
        }
        return evaluateCondition(cond, parentValue, allAnswers);
      });
    }
    
    // Condition "previous" (pour les questions qui dépendent de questions précédentes)
    if (condition.previous && allAnswers) {
      // Format: {"previous": "symptomes Non"}
      const [questionText, expectedValue] = condition.previous.split(' ');
      // On ne peut pas facilement mapper le texte à l'ID ici, 
      // donc on ignore pour l'instant
      return true;
    }
    
    // Condition basée sur une autre question (pas seulement le parent)
    if (condition.question_id && condition.value !== undefined && allAnswers) {
      return allAnswers[condition.question_id] === condition.value;
    }
  } else if (typeof condition === 'string') {
    // Format direct: "oui"
    return parentValue === condition;
  }

  return true;
}

export function parseSelectOptions(options: any): { key: string; value: string }[] {
  if (!options) return [];

  let parsedOptions: { key: string; value: string }[] = [];

  if (Array.isArray(options)) {
    // Format direct: ["option1", "option2"]
    parsedOptions = options.map((opt: any) => ({
      key: String(opt),
      value: String(opt)
    }));
  } else if (typeof options === 'object') {
    if (options.values && Array.isArray(options.values)) {
      // Format {"values": ["option1", "option2"]}
      parsedOptions = options.values.map((opt: any) => ({
        key: String(opt),
        value: String(opt)
      }));
    } else if (options.options && Array.isArray(options.options)) {
      // Format {"options": ["option1", "option2"]}
      parsedOptions = options.options.map((opt: any) => ({
        key: String(opt),
        value: String(opt)
      }));
    } else {
      // Format {"key1": "value1", "key2": "value2"}
      parsedOptions = Object.entries(options)
        .filter(([key]) => key !== 'values' && key !== 'options')
        .map(([key, value]) => ({
          key,
          value: String(value)
        }));
    }
  }

  return parsedOptions;
}

export function validateRequiredQuestions(
  questions: QuestionWithChildren[],
  answers: Record<number, string>,
  shouldShowQuestion: (question: QuestionWithChildren) => boolean
): { isValid: boolean; missingQuestions: QuestionWithChildren[] } {
  const missing: QuestionWithChildren[] = [];

  function checkQuestions(questionList: QuestionWithChildren[], parentPath: string = '') {
    for (const question of questionList) {
      if (shouldShowQuestion(question)) {
        const questionPath = parentPath ? `${parentPath} > ${question.text}` : question.text;
        
        // Vérifier si la question est requise et non répondue
        if (question.is_required && !answers[question.id] && 
            question.type !== 'group' && question.type !== 'message') {
          missing.push({
            ...question,
            text: questionPath // Inclure le chemin complet pour une meilleure UX
          });
        }
        
        // Pour les groupes, vérifier que au moins une sous-question est répondue si requis
        if (question.type === 'group' && question.is_required && question.children) {
          const hasAnyAnswer = question.children.some(child => 
            answers[child.id] && shouldShowQuestion(child)
          );
          if (!hasAnyAnswer) {
            missing.push({
              ...question,
              text: `${questionPath} (au moins une réponse requise)`
            });
          }
        }

        // Vérifier récursivement les sous-questions
        if (question.children && question.children.length > 0) {
          checkQuestions(question.children, questionPath);
        }
      }
    }
  }

  checkQuestions(questions);
  return { isValid: missing.length === 0, missingQuestions: missing };
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function parseDate(dateString: string): Date | null {
  try {
    // Support multiple formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    
    return null;
  } catch {
    return null;
  }
}