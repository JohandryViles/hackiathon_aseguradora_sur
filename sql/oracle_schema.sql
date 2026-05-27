-- Relational reference schema for a future Oracle/PostgreSQL deployment.
-- The live prototype uses Convex, but these tables mirror the hackathon data model.

CREATE TABLE insureds (
  customer_id VARCHAR2(40) PRIMARY KEY,
  segment VARCHAR2(40) NOT NULL,
  tenure_months NUMBER NOT NULL,
  city VARCHAR2(80) NOT NULL,
  policies_count NUMBER NOT NULL,
  claims_last_12_months NUMBER NOT NULL,
  delinquent NUMBER(1) NOT NULL,
  customer_score_simulated NUMBER NOT NULL
);

CREATE TABLE vehicles (
  vehicle_id VARCHAR2(40) PRIMARY KEY,
  customer_id VARCHAR2(40) NOT NULL,
  license_plate_hash VARCHAR2(80) NOT NULL,
  chassis_hash VARCHAR2(80) NOT NULL,
  engine_hash VARCHAR2(80) NOT NULL,
  make VARCHAR2(80) NOT NULL,
  model VARCHAR2(80) NOT NULL,
  vehicle_year NUMBER NOT NULL
);

CREATE TABLE policies (
  policy_id VARCHAR2(40) PRIMARY KEY,
  customer_id VARCHAR2(40) NOT NULL,
  line_of_business VARCHAR2(40) NOT NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  premium NUMBER(12, 2) NOT NULL,
  sum_insured NUMBER(12, 2) NOT NULL,
  deductible NUMBER(12, 2) NOT NULL,
  sales_channel VARCHAR2(40) NOT NULL,
  city VARCHAR2(80) NOT NULL,
  status VARCHAR2(40) NOT NULL
);

CREATE TABLE providers (
  provider_id VARCHAR2(40) PRIMARY KEY,
  provider_type VARCHAR2(40) NOT NULL,
  city VARCHAR2(80) NOT NULL,
  associated_claims NUMBER NOT NULL,
  average_claim_amount NUMBER(12, 2) NOT NULL,
  observed_case_rate NUMBER(6, 4) NOT NULL,
  tenure_months NUMBER NOT NULL,
  in_watchlist NUMBER(1) NOT NULL
);

CREATE TABLE claims (
  claim_number VARCHAR2(40) PRIMARY KEY,
  policy_id VARCHAR2(40) NOT NULL,
  customer_id VARCHAR2(40) NOT NULL,
  vehicle_id VARCHAR2(40),
  driver_id VARCHAR2(40),
  provider_id VARCHAR2(40),
  line_of_business VARCHAR2(40),
  coverage VARCHAR2(80),
  claim_type VARCHAR2(40) NOT NULL,
  channel VARCHAR2(40) NOT NULL,
  city VARCHAR2(80) NOT NULL,
  branch VARCHAR2(80),
  claim_amount NUMBER(12, 2) NOT NULL,
  estimated_damage_amount NUMBER(12, 2) NOT NULL,
  paid_amount NUMBER(12, 2),
  claim_status VARCHAR2(40),
  sum_insured NUMBER(12, 2),
  days_since_policy_start NUMBER NOT NULL,
  days_until_policy_end NUMBER,
  days_between_occurrence_report NUMBER,
  incidents_last_18_months NUMBER,
  documents_complete NUMBER(1),
  documents_inconsistent NUMBER(1),
  provider_observed_cases NUMBER,
  provider_in_watchlist NUMBER(1),
  narrative_similarity_max NUMBER(6, 4),
  fraud_label_simulated NUMBER(1),
  fraud_probability NUMBER(6, 4),
  ml_risk_score NUMBER,
  model_version VARCHAR2(80)
);

CREATE TABLE claim_documents (
  document_id VARCHAR2(80) PRIMARY KEY,
  claim_number VARCHAR2(40) NOT NULL,
  document_type VARCHAR2(80) NOT NULL,
  delivered NUMBER(1) NOT NULL,
  legible NUMBER(1) NOT NULL,
  issued_at TIMESTAMP NOT NULL,
  inconsistency_detected NUMBER(1) NOT NULL,
  observation VARCHAR2(400)
);

CREATE INDEX idx_claims_customer ON claims (customer_id);
CREATE INDEX idx_claims_provider ON claims (provider_id);
CREATE INDEX idx_claims_model_score ON claims (ml_risk_score);
CREATE INDEX idx_documents_claim ON claim_documents (claim_number);
