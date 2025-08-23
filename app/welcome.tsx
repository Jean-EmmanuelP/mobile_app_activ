import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function HomeScreen() {
  const router = useRouter();

  const handlePatientChoice = () => {
    router.push('/(tabs)');
  };

  const handleDoctorChoice = () => {
    router.push('/doctor-login');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Bienvenue sur Activ
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Choisissez votre profil pour continuer
        </ThemedText>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.patientButton]} 
          onPress={handlePatientChoice}
        >
          <Text style={styles.buttonText}>Je suis un patient</Text>
          <Text style={styles.buttonDescription}>
            Accéder au questionnaire de santé
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.doctorButton]} 
          onPress={handleDoctorChoice}
        >
          <Text style={styles.buttonText}>Je suis un médecin</Text>
          <Text style={styles.buttonDescription}>
            Se connecter à mon compte
          </Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientButton: {
    backgroundColor: '#4A90E2',
  },
  doctorButton: {
    backgroundColor: '#50C878',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
});