# Registration document privacy and retention

- Identity documents are stored under `backend/private_uploads/verification` and are never mounted as public static files.
- Only an authenticated administrator can retrieve a document through the account-verification API.
- Documents are used only to compare submitted registration details with trusted college records or other reliable evidence. Uploading a document never automatically approves an account.
- Pending documents remain available until an administrator makes a decision.
- Approved-account documents remain available while the account is active so authorized administrators can investigate identity disputes.
- Rejected-account documents are retained for 90 days by default so the applicant can correct and resubmit. The admin cleanup operation deletes the file after that period while preserving the decision history. Configure `REJECTED_DOCUMENT_RETENTION_DAYS` to change this period.
- Unverified registrations older than 24 hours and their private documents are removed by the admin cleanup operation.
- Database backups must use the same access controls and deletion schedule as the live private-document directory.
