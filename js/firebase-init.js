// Firebase configuration — life-os-be1e0
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

const firebaseConfig = {
  apiKey: "AIzaSyCOnFGSxz9G62JStorc4T4FFidimIrllMA",
  authDomain: "life-os-be1e0.firebaseapp.com",
  projectId: "life-os-be1e0",
  storageBucket: "life-os-be1e0.firebasestorage.app",
  messagingSenderId: "750419818481",
  appId: "1:750419818481:web:8d9deebdafeb3e5e6bf650",
  measurementId: "G-Z08QKY261H"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let messaging = null;

try { messaging = getMessaging(app); } catch(e) { console.warn('FCM not available:', e); }

let currentUser = null;

onAuthStateChanged(auth, user => { currentUser = user; });

export const FB = {
  isReady: () => true,
  getUser: () => currentUser,

  async signInGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    return currentUser;
  },

  async signOut() {
    await signOut(auth);
    currentUser = null;
  },

  onAuthChange(cb) { onAuthStateChanged(auth, user => { currentUser = user; cb(user); }); },

  async save(col, docId, data) {
    if (!currentUser) return false;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, col, docId), { ...data, _ts: Date.now() }, { merge: true });
      return true;
    } catch(e) { console.error('FB save:', e); return false; }
  },

  async load(col, docId) {
    if (!currentUser) return null;
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid, col, docId));
      return snap.exists() ? snap.data() : null;
    } catch(e) { console.error('FB load:', e); return null; }
  },

  // FCM 푸시 알림 토큰 등록
  async registerFCM() {
    if (!messaging || !currentUser) return null;
    try {
      // VAPID key는 Firebase Console > 프로젝트 설정 > Cloud Messaging > 웹 푸시 인증서에서 생성
      const token = await getToken(messaging, {
        vapidKey: 'BJbvsOUYn3pzXqqz0avLlQqrbBuDVOK01IAdYtxzvCmmIP7gJfCgBHfSAnPBNFatog8ezPt4d30Mu4fVc_i1qao'
      });
      if (token) {
        await this.save('meta', 'fcm', { token, updatedAt: Date.now() });
        console.log('FCM token registered');
      }
      return token;
    } catch(e) { console.warn('FCM token failed:', e); return null; }
  },

  onMessage(cb) {
    if (!messaging) return;
    onMessage(messaging, cb);
  }
};

window.FB = FB;
