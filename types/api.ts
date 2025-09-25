export type CreateSubmissionBody = {
  questionnaire_slug: string;
  patient_info: {
    first_name: string;
    last_name: string;
  };
};

export type CreateSubmissionResponse = {
  submission_id: string;
  secure_key: string;
  questionnaire_version_id: string;
};