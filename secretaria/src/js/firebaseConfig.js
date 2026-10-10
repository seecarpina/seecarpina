// firebaseConfig.js

// 📦 Imports Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ⚙️ Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCl69j1qpqKObNlZFSDOaJY5Ob8arFCr3k",
  authDomain: "see-carpina-2a774.firebaseapp.com",
  projectId: "see-carpina-2a774",
  databaseURL: "https://see-carpina-2a774-default-rtdb.firebaseio.com",
};

// 🔥 Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Exportar para uso nos outros arquivos
export { app, auth, db, rtdb };
