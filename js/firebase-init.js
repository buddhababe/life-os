// Firebase configuration — replace with your Firebase project credentials
// 설정 방법: https://console.firebase.google.com > 프로젝트 생성 > 웹 앱 추가
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ⚠️ 아래 설정을 본인의 Firebase 프로젝트 설정으로 교체하세요
const FIREBASE_CONFIG = {
  apiKey: localStorage.getItem('fb_apiKey') || '',
  authDomain: localStorage.getItem('fb_authDomain') || '',
  projectId: localStorage.getItem('fb_projectId') || '',
  storageBucket: localStorage.getItem('fb_storageBucket') || '',
  messagingSenderId: localStorage.getItem('fb_messagingSenderId') || '',
  appId: localStorage.getItem('fb_appId') || ''
};

let app = null, db = null, auth = null;
let currentUser = null;
let isFirebaseReady = false;

function tryInitFirebase() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) return false;
  try {
    app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseReady = true;
    return true;
  } catch(e) { console.warn('Firebase init failed:', e); return false; }
}

tryInitFirebase();

export const FB = {
  isReady: () => isFirebaseReady,
  getUser: () => currentUser,
  
  async signInGoogle() {
    if (!isFirebaseReady) return null;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    return currentUser;
  },
  
  async signOut() {
    if (!isFirebaseReady || !auth) return;
    await signOut(auth);
    currentUser = null;
  },
  
  onAuthChange(callback) {
    if (!isFirebaseReady || !auth) return;
    onAuthStateChanged(auth, user => {
      currentUser = user;
      callback(user);
    });
  },
  
  async save(collection_name, docId, data) {
    if (!isFirebaseReady || !currentUser || !db) return false;
    try {
      const ref = doc(db, 'users', currentUser.uid, collection_name, docId);
      await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
      return true;
    } catch(e) { console.error('FB save error:', e); return false; }
  },
  
  async load(collection_name, docId) {
    if (!isFirebaseReady || !currentUser || !db) return null;
    try {
      const ref = doc(db, 'users', currentUser.uid, collection_name, docId);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch(e) { console.error('FB load error:', e); return null; }
  },
  
  setConfig(cfg) {
    Object.entries(cfg).forEach(([k,v]) => localStorage.setItem('fb_'+k, v));
    FIREBASE_CONFIG.apiKey = cfg.apiKey || '';
    FIREBASE_CONFIG.projectId = cfg.projectId || '';
    FIREBASE_CONFIG.authDomain = cfg.authDomain || '';
    tryInitFirebase();
  }
};

window.FB = FB;
