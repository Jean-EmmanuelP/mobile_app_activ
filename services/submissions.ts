import { supabase } from '@/lib/supabase';

export interface PatientInfo {
  first_name: string;
  last_name: string;
}

export async function createSubmissionWithPatientInfo(patientInfo: PatientInfo) {
  const { data: newSubmission, error: submissionError } = await supabase
    .from('submissions')
    .insert({
      status: 'draft',
      submission_count: 0,
      patient_info: patientInfo,
    })
    .select()
    .single();

  if (submissionError) throw submissionError;

  return newSubmission;
}