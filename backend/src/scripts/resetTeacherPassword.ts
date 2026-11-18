// `npm run reset-teacher-password -- --email "santos@school.ph"`
// Gives the Teacher a new temporary password (printed ONCE), signs out old logins
// (tokenVersion + 1) and clears the "too many wrong tries" lock.
import { runResetAccountPassword } from "./accountScripts";

runResetAccountPassword("teacher");
