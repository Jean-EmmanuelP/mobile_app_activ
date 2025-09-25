import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsModal() {
  const insets = useSafeAreaInsets();
  const isPresented = router.canGoBack();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Conditions Générales</Text>
        {isPresented && (
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>📜 CONDITIONS GÉNÉRALES D'UTILISATION (CGU)</Text>
        <Text style={styles.dateText}>Date de dernière mise à jour : 22 juin 2025</Text>
        <Text style={styles.bodyText}>
          Bienvenue sur ACTIV, une brique de l'écosystème SANO, dédiée à la promotion de l'activité physique adaptée 🤸‍♀️💪. L'accès et l'utilisation de cette application impliquent l'acceptation sans réserve des présentes CGU.
        </Text>

        <Text style={styles.sectionTitle}>1. Objet de l'application</Text>
        <Text style={styles.bodyText}>
          ACTIV est un outil de prévention santé et d'accompagnement à l'activité physique, basé sur des recommandations scientifiques et un questionnaire afin d'optimiser la pertinence de ces réponses.{'\n\n'}
          • Facilitant l'orientation vers les professionnels et structures locales adaptées{'\n'}
          • Offrant des documents types : ordonnances, certificats, fiches pratiques{'\n\n'}
          Il n'a pas vocation à diagnostiquer, surveiller ou traiter une pathologie. Il ne remplace par l'avis médical et ne constitue pas un dispositif médical au sens du Règlement (UE) 2017/745.
        </Text>

        <Text style={styles.sectionTitle}>2. Informations éditeur</Text>
        <Text style={styles.bodyText}>
          Les informations relatives à l'éditeur, à l'hébergeur HDS et au directeur de publication sont disponibles dans les Mentions légales.
        </Text>

        <Text style={styles.sectionTitle}>3. Accès au service</Text>
        <Text style={styles.bodyText}>
          L'utilisation d'ACTIV est possible par tous. Le questionnaire pour obtenir des conseils personnalisés et protégé par une clé de sécurité.{'\n\n'}
          Les services peuvent évoluer selon les projets de l'écosystème Sano.
        </Text>

        <Text style={styles.sectionTitle}>4. Conditions d'utilisation</Text>
        <Text style={styles.bodyText}>
          Les données sont traitées conformément à notre Politique de confidentialité.
        </Text>

        <Text style={styles.sectionTitle}>5. Propriété intellectuelle</Text>
        <Text style={styles.bodyText}>
          Tous les éléments de l'application ACTIV (textes, images, codes, contenus générés) sont protégés par le droit d'auteur et appartiennent à Sano, sauf mention contraire. Toute reproduction, même partielle, est interdite sans autorisation.
        </Text>

        <Text style={styles.sectionTitle}>6. Données personnelles</Text>
        <Text style={styles.bodyText}>
          Pour tout ce qui concerne vos données personnelles (accès, suppression, droits RGPD), voir notre Politique de confidentialité.
        </Text>

        <Text style={styles.sectionTitle}>7. Limitations de responsabilité</Text>
        <Text style={styles.bodyText}>
          L'éditeur ne peut être tenu pour responsable des décisions prises sur la seule base des conseils fournis par l'application.{'\n\n'}
          Certaines données pratiques (structures locales, adresses, contacts) sont récupérées automatiquement et peuvent être obsolètes (même degré de pertinence que des moteurs de recherche et d'intelligence artificielle classiques).{'\n\n'}
          Les conseils fournis par l'application ACTIV sont générés à l'aide d'un algorithme d'intelligence artificielle s'appuyant sur des données scientifiques fiables (HAS, PubMed, IRBMS, etc.). Ils ne constituent en aucun cas un avis médical personnalisé. En application du règlement européen sur l'intelligence artificielle (IA Act) et des recommandations de la CNIL, toute recommandation générée par ACTIV doit être relue, validée et adaptée par un professionnel de santé qualifié (médecin ou professionnel habilité), avant d'être suivie par le patient. ACTIV met à disposition des outils (PDF, lien sécurisé, export) pour faciliter cette validation.
        </Text>

        <Text style={styles.sectionTitle}>8. Suspension ou interruption du service</Text>
        <Text style={styles.bodyText}>
          L'éditeur peut à tout moment suspendre ou modifier l'application pour maintenance, évolution ou cas de force majeure, sans obligation de préavis.
        </Text>

        <Text style={styles.sectionTitle}>9. Modifications des CGU</Text>
        <Text style={styles.bodyText}>
          Les présentes CGU peuvent être modifiées à tout moment. La version applicable est celle publiée au moment de l'utilisation.
        </Text>

        <Text style={styles.sectionTitle}>💳 CONDITIONS GÉNÉRALES DE VENTE (CGV)</Text>
        
        <Text style={styles.subSectionTitle}>1. Objet</Text>
        <Text style={styles.bodyText}>
          Les CGV régissent les modalités de souscription aux services payants proposés par ACTIV, notamment pour les professionnels (accès complet, ordonnances types, gestion multi-patients, personnalisation).
        </Text>

        <Text style={styles.subSectionTitle}>2. Tarification</Text>
        <Text style={styles.bodyText}>
          L'abonnement à ACTIV est proposé au tarif de 9,99 € par mois, sans engagement.{'\n\n'}
          Une version gratuite de l'application est disponible avec les fonctionnalités de base (évaluer son niveau d'activité physique, ordonnances types, quelques orientations).
        </Text>

        <Text style={styles.subSectionTitle}>3. Modalités de paiement</Text>
        <Text style={styles.bodyText}>
          • Paiement via carte bancaire ou prélèvement automatique{'\n'}
          • Facturation à la souscription puis renouvellement automatique sauf résiliation{'\n'}
          • Une facture est émise à chaque paiement
        </Text>

        <Text style={styles.subSectionTitle}>4. Rétractation</Text>
        <Text style={styles.bodyText}>
          Le droit de rétractation de 14 jours s'annule dès l'accès aux services personnalisés (documents, recommandations...).
        </Text>

        <Text style={styles.subSectionTitle}>5. Résiliation</Text>
        <Text style={styles.bodyText}>
          Résiliation possible à tout moment depuis son espace personnel.{'\n'}
          L'accès premium est interrompu à la fin de la période en cours, sans remboursement partiel.
        </Text>

        <Text style={styles.sectionTitle}>🛡️ Politique de confidentialité</Text>
        <Text style={styles.bodyText}>
          La confidentialité de vos données est notre priorité 🤝{'\n\n'}
          Chez ACTIV, nous nous engageons à protéger vos informations personnelles, en respectant le Règlement Général sur la Protection des Données (RGPD) et les exigences d'hébergement de données de santé (HDS).
        </Text>

        <Text style={styles.subSectionTitle}>1. 📌 Qui est responsable du traitement ?</Text>
        <Text style={styles.bodyText}>
          Le responsable du traitement est :{'\n'}
          SANO SYSTEM{'\n'}
          📧 contact@sano-system.fr
        </Text>

        <Text style={styles.subSectionTitle}>2. 🧾 Quelles données sont collectées ?</Text>
        <Text style={styles.bodyText}>
          Nous collectons uniquement les données nécessaires à votre accompagnement :{'\n'}
          • Données d'identification : âge, sexe, code postal{'\n'}
          • Données de santé : pathologies, limitations, traitements en cours (si vous les renseignez){'\n'}
          • Données d'usage : réponses aux questionnaires, navigation sur l'app
        </Text>

        <Text style={styles.subSectionTitle}>3. 🎯 Pourquoi sont-elles collectées ?</Text>
        <Text style={styles.bodyText}>
          Pour vous proposer :{'\n'}
          • des conseils personnalisés{'\n'}
          • un programme d'activité physique adapté{'\n'}
          • une orientation vers les structures proches de chez vous{'\n'}
          • un suivi de vos progrès
        </Text>

        <Text style={styles.subSectionTitle}>4. 📤 Qui peut y accéder ?</Text>
        <Text style={styles.bodyText}>
          Vos données sont strictement confidentielles.{'\n'}
          🔒 Accès limité à :{'\n'}
          • l'équipe Sano (accès restreint, encadré){'\n'}
          • les professionnels de santé que vous autorisez
        </Text>

        <Text style={styles.subSectionTitle}>5. 📦 Où sont-elles stockées ?</Text>
        <Text style={styles.bodyText}>
          Les données sont hébergées sur des serveurs agréés HDS (Hébergement de Données de Santé), situés en France ou en Europe.
        </Text>

        <Text style={styles.subSectionTitle}>6. ⏳ Combien de temps sont-elles conservées ?</Text>
        <Text style={styles.bodyText}>
          5 ans après votre dernière activité sur l'application.{'\n'}
          Vous pouvez demander leur suppression à tout moment, sans justification.
        </Text>

        <Text style={styles.subSectionTitle}>7. 🧑‍⚖️ Quels sont vos droits ?</Text>
        <Text style={styles.bodyText}>
          Conformément au RGPD, vous disposez de :{'\n'}
          • Droit d'accès : voir vos données{'\n'}
          • Droit de rectification : corriger une erreur{'\n'}
          • Droit d'effacement : supprimer vos données{'\n'}
          • Droit à la portabilité : recevoir vos données{'\n'}
          • Droit d'opposition : refuser un traitement{'\n'}
          📧 Pour exercer vos droits : rgpd@sano-system.fr
        </Text>

        <Text style={styles.sectionTitle}>📍 Mentions légales</Text>
        <Text style={styles.bodyText}>
          Éditeur du site / de l'application{'\n'}
          Le site et l'application ACTIV font partie de l'écosystème Sano, une solution numérique dédiée à la prévention et à la santé pour tous.{'\n\n'}
          Édité par : SANO SYSTEM{'\n'}
          📧 Contact : contact@sano-system.fr{'\n\n'}
          Directeur de la publication{'\n'}
          Dr Baptiste Mazas{'\n'}
          Médecin spécialiste en médecine du sport, nutrition et prévention cardio-métabolique.{'\n\n'}
          Conception et développement{'\n'}
          Jean-Emmanuel — École 42{'\n'}
          Avec le soutien de l'équipe projet Sano.
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontFamily: 'NotoIkea',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'NotoIkea',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 16,
    fontFamily: 'NotoIkea',
    color: '#444',
    marginTop: 15,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  bodyText: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    lineHeight: 20,
    color: '#555',
    marginBottom: 15,
    textAlign: 'justify',
  },
});