-- Create the sequence
CREATE SEQUENCE requisition_seq
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

-- Drop the sequence (for rollback)
DROP SEQUENCE requisition_seq;