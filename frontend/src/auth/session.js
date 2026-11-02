async function login(event) {
  event.preventDefault();
  setNotice("loginError");
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const token = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("email").value.trim(), password: $("password").value }),
    });
    sessionStorage.setItem("wuf.session", JSON.stringify({ accessToken: token.access_token }));
    const user = await api("/auth/me");
    $("password").value = "";
    enterApp(user, HOME[user.rol]);
  } catch (cause) {
    setNotice("loginError", cause.message, "error");
  } finally {
    button.disabled = false;
  }
  return false;
}

function logout(message = "") {
  sessionStorage.removeItem("wuf.session");
  currentUser = null;
  alertItems = [];
  updateAlertBadge(0);
  history.replaceState(history.state, "", location.pathname + location.search);
  $("app").style.display = "none";
  $("appBoot").style.display = "none";
  $("login").style.display = "flex";
  setNotice("loginError", message, message ? "error" : "");
}

function showLoginScreen() {
  $("appBoot").style.display = "none";
  $("app").style.display = "none";
  $("login").style.display = "flex";
}

function enterApp(user, view) {
  currentUser = user;
  $("appBoot").style.display = "none";
  $("login").style.display = "none";
  $("app").style.display = "block";
  $("roleHint").textContent = ROLE_LABELS[user.rol] || user.rol;
  $("whoName").textContent = user.nombre;
  $("whoRole").textContent = user.email;
  $("avatarTxt").textContent = user.nombre.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  if ($("cfgNombre")) $("cfgNombre").value = user.nombre;
  if ($("cfgEmail")) $("cfgEmail").value = user.email;
  document.querySelectorAll("[data-roles]").forEach((element) => {
    element.classList.toggle("hidden", !element.dataset.roles.split(" ").includes(user.rol));
  });
  showView(view || HOME[user.rol]);
  refreshAlertBadge();
}

function updateCurrentUser(user) {
  // Mantiene el nombre, el avatar y la ficha de configuración sincronizados tras editar el perfil.
  currentUser = user;
  $("whoName").textContent = user.nombre;
  $("whoRole").textContent = user.email;
  $("avatarTxt").textContent = user.nombre.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  $("cfgNombre").value = user.nombre;
  $("cfgEmail").value = user.email;
}

async function saveProfileName(event) {
  event.preventDefault();
  const name = $("cfgNombre").value.trim();
  if (name === currentUser?.nombre?.trim()) {
    setNotice("profileMessage", "El nombre ingresado es igual al actual.", "warning");
    return;
  }

  const button = $("saveProfileButton");
  button.disabled = true;
  setNotice("profileMessage", "Guardando el nombre…", "loading");
  try {
    const user = await api("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ nombre: name }),
    });
    updateCurrentUser(user);
    setNotice("profileMessage", "Nombre actualizado.", "success");
  } catch (cause) {
    setNotice("profileMessage", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function changeAccountPassword(event) {
  event.preventDefault();
  const button = $("changePasswordButton");
  const newPassword = $("cfgPass1").value;
  if (newPassword !== $("cfgPass2").value) {
    setNotice("passwordMessage", "La confirmación no coincide con la nueva contraseña.", "error");
    return;
  }
  button.disabled = true;
  setNotice("passwordMessage", "Actualizando la contraseña…", "loading");
  try {
    await api("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: $("cfgCurrentPassword").value,
        new_password: newPassword,
        confirm_password: $("cfgPass2").value,
      }),
    });
    $("passwordForm").reset();
    setNotice("passwordMessage", "Contraseña actualizada.", "success");
  } catch (cause) {
    setNotice("passwordMessage", cause.message, "error");
  } finally {
    button.disabled = false;
  }
}

export { login, logout, enterApp, showLoginScreen, updateCurrentUser, saveProfileName, changeAccountPassword };
