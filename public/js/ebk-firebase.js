/* EBK · Firebase client (compat SDK, self-loading). Exposes window.EBKF. */
(function () {
  "use strict";
  if (window.EBKF) return;

  var CONFIG = {
    apiKey: "FIREBASE_WEB_KEY_REMOVED",
    authDomain: "nfl-higher-lower-game.firebaseapp.com",
    projectId: "nfl-higher-lower-game",
    storageBucket: "nfl-higher-lower-game.firebasestorage.app",
    messagingSenderId: "82450457447",
    appId: "1:82450457447:web:5a303331dcc0e7285d45c2",
  };
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

  var EBKF = (window.EBKF = { user: undefined, auth: null, db: null, _cbs: [] });

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  EBKF.ready = (async function () {
    try {
      if (!window.firebase) await load(SDK + "firebase-app-compat.js");
      await load(SDK + "firebase-auth-compat.js");
      await load(SDK + "firebase-firestore-compat.js");
      firebase.initializeApp(CONFIG);
      EBKF.auth = firebase.auth();
      EBKF.db = firebase.firestore();
      try { await EBKF.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
      EBKF.auth.onAuthStateChanged(function (u) {
        EBKF.user = u;
        EBKF._cbs.forEach(function (cb) { try { cb(u); } catch (e) {} });
      });
      return EBKF;
    } catch (e) {
      console.warn("EBKF init failed", e);
      EBKF.user = null;
      EBKF._cbs.forEach(function (cb) { try { cb(null); } catch (e) {} });
      throw e;
    }
  })();

  EBKF.onChange = function (cb) {
    EBKF._cbs.push(cb);
    if (EBKF.user !== undefined) cb(EBKF.user);
  };

  function saveUser(u, name) {
    return EBKF.db.collection("users").doc(u.uid)
      .set({ name: name || u.displayName || "Player", updated: Date.now() }, { merge: true })
      .catch(function () {});
  }

  EBKF.signUp = async function (email, pw, name) {
    await EBKF.ready;
    var c = await EBKF.auth.createUserWithEmailAndPassword(email, pw);
    if (name) await c.user.updateProfile({ displayName: name });
    await saveUser(c.user, name);
    return c.user;
  };
  EBKF.signIn = async function (email, pw) {
    await EBKF.ready;
    return (await EBKF.auth.signInWithEmailAndPassword(email, pw)).user;
  };
  EBKF.signInGoogle = async function () {
    await EBKF.ready;
    var p = new firebase.auth.GoogleAuthProvider();
    var c = await EBKF.auth.signInWithPopup(p);
    await saveUser(c.user, c.user.displayName);
    return c.user;
  };
  EBKF.signOut = async function () { await EBKF.ready; return EBKF.auth.signOut(); };

  // record a finished run: keep best + running totals per (sport, game)
  EBKF.recordScore = async function (sport, game, score) {
    try {
      await EBKF.ready;
      var u = EBKF.user;
      if (!u || score == null || isNaN(score)) return;
      var ref = EBKF.db.collection("scores").doc(u.uid + "_" + sport + "_" + game);
      await EBKF.db.runTransaction(async function (tx) {
        var d = await tx.get(ref);
        var p = d.exists ? d.data() : { best: 0, plays: 0, sumScore: 0 };
        tx.set(ref, {
          uid: u.uid, name: u.displayName || "Player", sport: sport, game: game,
          best: Math.max(p.best || 0, score), plays: (p.plays || 0) + 1,
          sumScore: (p.sumScore || 0) + score, updated: Date.now(),
        }, { merge: true });
      });
    } catch (e) { console.warn("recordScore failed", e); }
  };

  // read helpers
  EBKF.leaderboard = async function (sport, game, n) {
    await EBKF.ready;
    var q = await EBKF.db.collection("scores")
      .where("sport", "==", sport).where("game", "==", game)
      .orderBy("best", "desc").limit(n || 100).get();
    return q.docs.map(function (d) { return d.data(); });
  };
  EBKF.myScores = async function () {
    await EBKF.ready;
    if (!EBKF.user) return [];
    var q = await EBKF.db.collection("scores").where("uid", "==", EBKF.user.uid).get();
    return q.docs.map(function (d) { return d.data(); });
  };
})();
