import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { createSubmissionWithPatientInfo } from '@/services/submissions';
import { setSubmission } from '@/store/questionnaireSlice';
import { ThemedView } from '@/components/ThemedView';

const schema = z.object({
  first_name: z.string().trim().min(2, 'Prénom trop court (minimum 2 caractères)').max(50, 'Prénom trop long'),
  last_name: z.string().trim().min(2, 'Nom trop court (minimum 2 caractères)').max(50, 'Nom trop long'),
});

type FormValues = z.infer<typeof schema>;

function PreIntakeScreenContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch();

  const { control, handleSubmit, formState: { isSubmitting, errors, isValid } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '' },
    mode: 'onChange',
  });

  const onSubmit = async ({ first_name, last_name }: FormValues) => {
    try {
      const newSubmission = await createSubmissionWithPatientInfo({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
      });

      dispatch(setSubmission(newSubmission));

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de créer la session. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Démarrer votre session</Text>
            <Text style={styles.subtitle}>
              Renseignez votre identité pour créer votre session sécurisée
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="first_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Prénom</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.first_name && styles.inputError
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Ex : Alice"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                  {errors.first_name && (
                    <Text style={styles.errorText}>{errors.first_name.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="last_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Nom</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.last_name && styles.inputError
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Ex : Durand"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                  {errors.last_name && (
                    <Text style={styles.errorText}>{errors.last_name.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isValid || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Commencer le questionnaire</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              En poursuivant, vous acceptez l'enregistrement de vos informations pour réaliser le questionnaire de santé.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

export default function PreIntakeScreen() {
  return (
    <SafeAreaProvider>
      <PreIntakeScreenContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'NotoIkea',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    color: '#666',
    textAlign: 'left',
    paddingLeft: 20,
    paddingRight: 20,
    lineHeight: 24,
  },
  form: {
    marginBottom: 40,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 16,
    fontSize: 16,
    fontFamily: 'NotoIkea',
    backgroundColor: 'white',
    color: '#2c3e50',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    fontFamily: 'NotoIkea',
    marginTop: 4,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: 'NotoIkea',
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});