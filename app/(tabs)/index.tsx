import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { TabScrollView } from '@/components/TabScrollView';

export default function HomeScreen() {
  const router = useRouter();
  const submission = useSelector((state: RootState) => state.questionnaire.currentSubmission);
  const isCompleted = useSelector((state: RootState) => state.questionnaire.isCompleted);
  const secureKey = useSelector((state: RootState) => state.questionnaire.secureKey);

  return (
    <ThemedView style={styles.container}>
      <TabScrollView>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Tableau de bord
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Bienvenue sur votre espace santé
          </ThemedText>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>État du questionnaire</Text>
          
          {submission ? (
            <View>
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Statut:</Text>
                <Text style={[
                  styles.statusValue,
                  isCompleted ? styles.statusCompleted : styles.statusInProgress
                ]}>
                  {isCompleted ? '✓ Complété' : '⏳ En cours'}
                </Text>
              </View>

              {secureKey && (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>Code sécurisé:</Text>
                  <Text style={styles.codeValue}>{secureKey}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('/(tabs)/questionnaire')}
              >
                <Text style={styles.buttonText}>
                  {isCompleted ? 'Voir mon questionnaire' : 'Continuer le questionnaire'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.noQuestionnaireText}>
                Aucun questionnaire en cours
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('/(tabs)/questionnaire')}
              >
                <Text style={styles.buttonText}>
                  Commencer le questionnaire
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isCompleted && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prochaines étapes</Text>
            <Text style={styles.infoText}>
              Votre questionnaire a été soumis avec succès. 
              Partagez votre code sécurisé avec votre médecin pour qu'il puisse accéder à vos réponses.
            </Text>
          </View>
        )}
      </TabScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCompleted: {
    color: '#50C878',
  },
  statusInProgress: {
    color: '#FFA500',
  },
  codeContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noQuestionnaireText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});