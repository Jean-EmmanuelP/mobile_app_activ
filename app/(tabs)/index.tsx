import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { TabScrollView } from '@/components/TabScrollView';
import { Video } from 'expo-av';

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const submission = useSelector((state: RootState) => state.questionnaire.currentSubmission);
  const isCompleted = useSelector((state: RootState) => state.questionnaire.isCompleted);
  const secureKey = useSelector((state: RootState) => state.questionnaire.secureKey);

  // Function to mask secure code
  const maskSecureCode = (code: string | null | undefined): string => {
    if (!code || code.length < 8) {
      return 'Clé';
    }
    const first4 = code.substring(0, 4);
    const last4 = code.substring(code.length - 4);
    return `${first4}...${last4}`;
  };

  // Function to get greeting with name
  const getGreeting = (): string => {
    if (submission?.patient_info) {
      const { first_name, last_name } = submission.patient_info as any;
      if (first_name && last_name) {
        return `Bonjour ${first_name} ${last_name}!`;
      } else if (first_name) {
        return `Bonjour ${first_name}!`;
      } else if (last_name) {
        return `Bonjour ${last_name}!`;
      }
    }
    return 'Bonjour!';
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <TabScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>{getGreeting()}</Text>
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
                  {isCompleted ? 'Complété' : 'En cours'}
                </Text>
              </View>

              {secureKey && (
                <View>
                  <Text style={styles.codeLabel}>Code sécurisé:</Text>
                  <Text style={styles.codeValue}>{maskSecureCode(secureKey)}</Text>
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
              Partagez votre code sécurisé avec votre médecin pour qu&apos;il puisse accéder à vos réponses.
            </Text>
          </View>
        )}
        </TabScrollView>
    </ThemedView>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaProvider>
      <HomeScreenContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    marginTop: Dimensions.get('window').height * 0.03,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: 'NotoIkea',
    color: '#000000',
  },
  videoContainer: {
    height: 200,
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 15,
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(135, 206, 235, 0.3)',
  },
  card: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'NotoIkea',
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
    fontFamily: 'NotoIkea',
    marginRight: 10,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
  },
  statusCompleted: {
    color: 'green',
  },
  statusInProgress: {
    color: 'black',
  },
  codeContainer: {
    marginVertical: 15,
  },
  codeLabel: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    color: '#666',
    marginBottom: 5,
  },
  codeValue: {
    fontSize: 18,
    fontFamily: 'NotoIkea',
    color: '#4A90E2',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
  },
  noQuestionnaireText: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    color: '#666',
    lineHeight: 20,
  },
});