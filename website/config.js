// OhmNote — where accounts and sync live. Leave empty to build OhmNote without accounts.
// The anon key is public by design: every table and file is protected by row level security
// (see supabase/migrations). Forks can point this at their own Supabase project.
'use strict';
window.OHM_CLOUD = {
  url: 'https://tnblmgwvsgtszwhvgcnp.supabase.co',
  anonKey: 'sb_publishable_r1_d54NZ4AdXf8ni-LrIpw_piqlUgnB',
  // where password-reset and sign-up confirmation links lead (the website's account page)
  accountPage: 'https://benceandrastoth-ply.github.io/ohmnote/account.html',
};
