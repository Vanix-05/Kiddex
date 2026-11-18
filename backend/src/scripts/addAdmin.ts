// `npm run add-admin -- --name "Carlo" --email "carlo@kiddex.test"`
// Makes an admin account for the Admin page (/admin). Run from your laptop.
// Prints a temporary password ONCE.
import { runAddAccount } from "./accountScripts";

runAddAccount("admin");
