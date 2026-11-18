// `npm run add-teacher -- --name "Ms. Santos" --email "santos@school.ph"`
// Makes a Teacher account (there is no Register page). Prints a temporary password ONCE.
// The Admin page (/admin) does the same from a phone.
import { runAddAccount } from "./accountScripts";

runAddAccount("teacher");
