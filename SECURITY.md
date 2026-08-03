# Security Notes

## Personal data

StaffTemplate may contain national ID or passport information. The application parses the workbook inside the user's browser. It does not upload or retain the original workbook. Only the last four alphanumeric characters and a masked value are submitted.

## Access control

- Public users can submit data only through the `submit_access_request` RPC.
- Only authenticated users listed in `admin_users` can read requests or update TIDC card numbers and entry/exit times.
- Row Level Security must remain enabled.
- Never expose a Supabase Service Role Key in frontend files.

## Deployment recommendations

- Use HTTPS.
- Add CAPTCHA or rate limiting before publishing the upload page publicly.
- Set retention and deletion rules for visitor data.
- Use individual admin accounts and audit access.
- Limit accepted files to the official `.xlsx` template and retain the 5 MB size limit unless there is a business need to change it.
