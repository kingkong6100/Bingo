// firebase-config.js
// Replace with YOUR Firebase config from console
const firebaseConfig = {
  apiKey: "AIzaSyDmDHkBVJmJB9wOct-2hi9NB9cPaEIcfnc",
  authDomain: "bingogame-75ba7.firebaseapp.com",
  databaseURL: "https://bingogame-75ba7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bingogame-75ba7",
  storageBucket: "bingogame-75ba7.firebasestorage.app",
  messagingSenderId: "507934094540",
  appId: "1:507934094540:web:43e204d877731d5aa2fe69"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}