// ============================================================
// AUTH — handles the login/sign-up modal, logging in/out, and
// keeping the nav buttons in sync with the session. Relies on the
// `supabase` client from supabaseClient.js, loaded before this file.
//
// Exposes globally (used by script.js):
//   - currentUser   the logged-in staff member, or null as a guest
//   - initAuth()    call once on startup to restore/watch the session
//   - openLogin()   opens the modal (e.g. when a guest tries to
//                   submit the booking form)
// ============================================================

/** the logged-in staff member, or null if browsing as a guest */
let currentUser = null;

/** "login" or "signup" — which mode the modal form is currently in */
let authMode = "login";

const loginOverlay = document.getElementById("login-overlay");
const openLoginBtn = document.getElementById("open-login");
const logoutBtn = document.getElementById("logout-btn");
const closeLoginBtn = document.getElementById("close-login");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginTitle = document.getElementById("login-title");
const loginSub = document.getElementById("login-sub");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authSwitchText = document.getElementById("auth-switch-text");
const authSwitchBtn = document.getElementById("auth-switch-btn");
const googleLoginBtn = document.getElementById("google-login-btn");

// ============ SESSION HANDLING ============
async function initAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user ?? null;
  } catch (err) {
    console.error("Could not check for a logged-in session:", err.message);
    currentUser = null;
  }
  updateAuthUI();

  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user ?? null;
      updateAuthUI();
      // renderLedger lives in script.js — it only shows "Remove" buttons
      // once someone is logged in, so refresh it whenever auth changes.
      if (typeof renderLedger === "function") renderLedger();
    });
  } catch (err) {
    console.error("Could not watch auth state:", err.message);
  }
}

function updateAuthUI() {
  openLoginBtn.hidden = !!currentUser;
  logoutBtn.hidden = !currentUser;
}

// ============ MODAL OPEN / CLOSE ============
function openLogin() {
  setAuthMode("login");
  loginOverlay.hidden = false;
  document.getElementById("topbar-nav")?.classList.remove("is-open");
  document.getElementById("login-email").focus();
}

function closeLogin() {
  loginOverlay.hidden = true;
  loginError.textContent = "";
  loginForm.reset();
}

function setAuthMode(mode) {
  authMode = mode;
  loginError.textContent = "";

  if (mode === "signup") {
    loginTitle.textContent = "Create your harbor office account";
    loginSub.textContent = "Sign up to add, edit, or remove bookings. Browsing stays open to everyone.";
    authSubmitBtn.textContent = "Sign up";
    authSwitchText.textContent = "Already have an account?";
    authSwitchBtn.textContent = "Log in instead";
  } else {
    loginTitle.textContent = "Log in to the harbor office";
    loginSub.textContent = "Anyone can browse the tide board and ledger. Log in to add, edit, or remove a booking.";
    authSubmitBtn.textContent = "Log in";
    authSwitchText.textContent = "New to 99Yacht?";
    authSwitchBtn.textContent = "Create an account";
  }
}

openLoginBtn.addEventListener("click", openLogin);

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Sign out failed:", err.message);
  } finally {
    logoutBtn.disabled = false;
  }
});

authSwitchBtn.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
  document.getElementById("login-email").focus();
});

// ============ GOOGLE SIGN-IN ============
googleLoginBtn.addEventListener("click", async () => {
  googleLoginBtn.disabled = true;
  loginError.textContent = "";

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // sends the person right back to this same page after Google login
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) {
      loginError.textContent = error.message;
      googleLoginBtn.disabled = false;
    }
    // on success the browser navigates to Google, so nothing else runs here
  } catch (err) {
    loginError.textContent = err.message;
    googleLoginBtn.disabled = false;
  }
});

closeLoginBtn.addEventListener("click", closeLogin);

loginOverlay.addEventListener("click", (e) => {
  if (e.target === loginOverlay) closeLogin();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !loginOverlay.hidden) closeLogin();
});

// ============ LOGIN / SIGN UP FORM SUBMIT ============
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.style.color = "";
  loginError.textContent = "";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || password.length < 6) {
    loginError.textContent = "Enter a valid email and a password of at least 6 characters.";
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = authMode === "signup" ? "Signing up…" : "Logging in…";

  if (authMode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });

    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "Sign up";

    if (error) {
      loginError.textContent = error.message;
      return;
    }

    if (data.session) {
      // project has email confirmation turned off — the new account is
      // signed in immediately
      closeLogin();
    } else {
      // default Supabase behavior — a confirmation email was sent
      loginError.style.color = "#2F7A4D";
      loginError.textContent = "Account created — check your email to confirm it, then log in.";
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "Log in";

    if (error) {
      loginError.textContent = error.message;
      return;
    }
    closeLogin();
  }
});