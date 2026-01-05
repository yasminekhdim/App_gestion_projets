const TOKEN_KEY = "app_token";
const USER_KEY = "app_user";
const REMEMBER_KEY = "remember_me";

export const saveAuth = (token, user, rememberMe = false) => {
  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  storage.setItem(REMEMBER_KEY, rememberMe);

  // Supprimer les données de l'autre stockage
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem(TOKEN_KEY);
  otherStorage.removeItem(USER_KEY);
  otherStorage.removeItem(REMEMBER_KEY);
};

export const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  const data =
    localStorage.getItem(USER_KEY) ||
    sessionStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const getAuth = () => {
  const token = getToken();
  const user = getUser();
  return token && user ? { token, user } : null;
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(REMEMBER_KEY);
};
