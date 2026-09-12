import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json"));
const app = initializeApp(config);
const auth = getAuth(app);

async function run() {
  try {
    await sendPasswordResetEmail(auth, "totallyfakeemail123456789@fake.com");
    console.log("FAKE SUCCESS!");
  } catch(e) {
    console.error("FAKE ERROR:", e);
  }
  process.exit(0);
}
run();
