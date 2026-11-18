// `npm run reset-admin-password -- --email "carlo@kiddex.test"`
// Gives the admin a new temporary password (printed ONCE), signs out old logins
// (tokenVersion + 1) and clears the "too many wrong tries" lock.
import { runResetAccountPassword } from "./accountScripts";

runResetAccountPassword("admin");
