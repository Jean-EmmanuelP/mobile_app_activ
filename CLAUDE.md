This is my sql schema in Supabase:

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.answers (
  id integer NOT NULL DEFAULT nextval('answers_id_seq'::regclass),
  submission_id uuid,
  question_id integer,
  value text NOT NULL,
  additional_notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT answers_pkey PRIMARY KEY (id),
  CONSTRAINT answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.conversation_messages (
  id integer NOT NULL DEFAULT nextval('conversation_messages_id_seq'::regclass),
  conversation_id uuid,
  sender_type character varying NOT NULL,
  content text NOT NULL,
  sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversation_messages_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  llm_response_id uuid,
  user_id integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT conversations_llm_response_id_fkey FOREIGN KEY (llm_response_id) REFERENCES public.llm_responses(id)
);
CREATE TABLE public.feedback (
  id integer NOT NULL DEFAULT nextval('feedback_id_seq'::regclass),
  llm_response_id uuid,
  user_id integer,
  satisfaction boolean,
  comment text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT feedback_llm_response_id_fkey FOREIGN KEY (llm_response_id) REFERENCES public.llm_responses(id)
);
CREATE TABLE public.llm_responses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  rag_used jsonb,
  response_content jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT llm_responses_pkey PRIMARY KEY (id),
  CONSTRAINT llm_responses_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.questions (
  id integer NOT NULL DEFAULT nextval('questions_id_seq'::regclass),
  section_id integer,
  parent_id integer,
  text text NOT NULL,
  type character varying NOT NULL,
  options jsonb,
  condition jsonb,
  order_index integer DEFAULT 0,
  is_required boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.questions(id),
  CONSTRAINT questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id)
);
CREATE TABLE public.rag_documents (
  id integer NOT NULL DEFAULT nextval('rag_documents_id_seq'::regclass),
  title character varying NOT NULL,
  content text NOT NULL,
  category character varying,
  source_url text,
  created_by_user_id integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT rag_documents_pkey PRIMARY KEY (id),
  CONSTRAINT rag_documents_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sections (
  id integer NOT NULL DEFAULT nextval('sections_id_seq'::regclass),
  name character varying NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sections_pkey PRIMARY KEY (id)
);
CREATE TABLE public.submission_access (
  id integer NOT NULL DEFAULT nextval('submission_access_id_seq'::regclass),
  submission_id uuid,
  user_id integer,
  access_type character varying DEFAULT 'read_write'::character varying,
  granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT submission_access_pkey PRIMARY KEY (id),
  CONSTRAINT submission_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT submission_access_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  secure_key uuid DEFAULT uuid_generate_v4() UNIQUE,
  patient_info jsonb,
  status character varying DEFAULT 'draft'::character varying,
  submitted_by_user_id integer,
  submission_count integer DEFAULT 0,
  locked_by_user_id integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_submitted_by_user_id_fkey FOREIGN KEY (submitted_by_user_id) REFERENCES public.users(id),
  CONSTRAINT submissions_locked_by_user_id_fkey FOREIGN KEY (locked_by_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email character varying NOT NULL UNIQUE,
  role character varying DEFAULT 'doctor'::character varying,
  first_name character varying,
  last_name character varying,
  signature text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

I am coding a mobile application with Expo.