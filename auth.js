// Dink Box demo auth (localStorage only - for school/demo use, not real security)
const USERS_KEY = "dinkBoxUsers";
const SESSION_KEY = "dinkBoxSession";

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

function randomSalt() {
    let bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return Array.from(bytes).map(function(b) {
        return b.toString(16).padStart(2, "0");
    }).join("");
}

async function hashPassword(password, salt) {
    let text = salt + ":" + password;
    if (window.crypto && window.crypto.subtle) {
        let data = new TextEncoder().encode(text);
        let buf = await window.crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(buf)).map(function(b) {
            return b.toString(16).padStart(2, "0");
        }).join("");
    }
    // fallback if crypto.subtle is unavailable (weak, demo only)
    let h = 5381;
    for (let i = 0; i < text.length; i++) {
        h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    }
    return "fallback-" + h;
}

function getCurrentUser() {
    try {
        let session = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (!session) return null;
        return getUsers().find(function(u) {
            return u.email === session.email;
        }) || null;
    } catch (e) {
        return null;
    }
}

async function registerUser(name, mobile, email, password) {
    email = email.trim().toLowerCase();

    if (getUsers().some(function(u) { return u.email === email; })) {
        return { ok: false, message: "An account with this email already exists. Try logging in." };
    }

    let salt = randomSalt();
    let hash = await hashPassword(password, salt);
    let list = getUsers();

    list.push({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email,
        salt: salt,
        hash: hash,
        createdAt: new Date().toISOString()
    });

    saveUsers(list);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: email }));

    return { ok: true };
}

async function loginUser(email, password) {
    email = email.trim().toLowerCase();

    let user = getUsers().find(function(u) { return u.email === email; });

    if (!user) {
        return { ok: false, message: "Incorrect email or password." };
    }

    let hash = await hashPassword(password, user.salt);

    if (hash !== user.hash) {
        return { ok: false, message: "Incorrect email or password." };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: email }));
    return { ok: true };
}

function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
}

// Bookings that belong to the logged-in user
function getUserBookings(user) {
    return getBookings().filter(function(b) {
        return b.userEmail === user.email ||
               (b.email && b.email.toLowerCase() === user.email);
    });
}

// Replace "Login" in the nav with an account dropdown
function updateNav() {
    let user = getCurrentUser();
    let loginLink = document.querySelector('nav a[href="login.html"]');

    if (!user || !loginLink) return;

    let style = document.createElement("style");
    style.textContent =
        ".account-menu{position:relative;margin-left:30px;}" +
        ".account-button{background:none;border:none;color:white;font:inherit;cursor:pointer;padding:6px 0;}" +
        ".account-button:hover,.account-button:focus-visible{color:#d7f34a;outline:none;}" +
        ".account-dropdown{display:none;position:absolute;right:0;top:100%;margin-top:10px;min-width:180px;" +
        "background:white;border-radius:10px;box-shadow:0 5px 20px rgba(0,0,0,0.2);overflow:hidden;z-index:50;}" +
        ".account-dropdown.open{display:block;}" +
        ".account-dropdown .account-email{padding:12px 16px;font-size:13px;color:#666;border-bottom:1px solid #eee;word-break:break-all;}" +
        ".account-dropdown a,.account-dropdown button{display:block;width:100%;margin:0;padding:12px 16px;text-align:left;" +
        "background:none;border:none;font:inherit;font-size:15px;color:#173f35;text-decoration:none;cursor:pointer;}" +
        ".account-dropdown a:hover,.account-dropdown button:hover{background:#edf5e0;color:#173f35;}" +
        ".account-dropdown .logout-item{color:#9b2c2c;border-top:1px solid #eee;}" +
        ".account-dropdown .logout-item:hover{background:#f1dede;color:#9b2c2c;}";
    document.head.appendChild(style);

    let menu = document.createElement("div");
    menu.className = "account-menu";

    let button = document.createElement("button");
    button.type = "button";
    button.className = "account-button";
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Hi, " + user.name.split(" ")[0] + " \u25BE";

    let dropdown = document.createElement("div");
    dropdown.className = "account-dropdown";

    let emailLine = document.createElement("div");
    emailLine.className = "account-email";
    emailLine.textContent = user.email;

    let mine = document.createElement("a");
    mine.href = "my-bookings.html";
    mine.textContent = "My bookings";

    let out = document.createElement("button");
    out.type = "button";
    out.className = "logout-item";
    out.textContent = "Logout";
    out.addEventListener("click", logoutUser);

    dropdown.appendChild(emailLine);
    dropdown.appendChild(mine);
    dropdown.appendChild(out);
    menu.appendChild(button);
    menu.appendChild(dropdown);

    function setOpen(open) {
        dropdown.classList.toggle("open", open);
        button.setAttribute("aria-expanded", String(open));
    }

    button.addEventListener("click", function(e) {
        e.stopPropagation();
        setOpen(!dropdown.classList.contains("open"));
    });

    document.addEventListener("click", function() { setOpen(false); });
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") setOpen(false);
    });

    loginLink.replaceWith(menu);
}

// Prefill checkout details for logged-in users
function prefillCheckout() {
    let user = getCurrentUser();
    if (!user) return;

    let map = { fullName: user.name, mobile: user.mobile, emailAddress: user.email };

    Object.keys(map).forEach(function(id) {
        let el = document.getElementById(id);
        if (el && !el.value) el.value = map[id];
    });
}

// Tag new bookings with the logged-in user's email
if (typeof addBooking === "function") {
    let originalAddBooking = addBooking;

    addBooking = function(booking) {
        let user = getCurrentUser();
        if (user) booking.userEmail = user.email;
        return originalAddBooking(booking);
    };
}

document.addEventListener("DOMContentLoaded", function() {
    updateNav();
    prefillCheckout();
});
