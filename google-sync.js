const CLIENT_ID = "548830746366-sr2e3f0k6lvd1te015gknvnojgoen1st.apps.googleusercontent.com";
let accessToken = null;

let tokenClient = null;
let currentUser = null;

window.addEventListener("load", initGoogle);

// ============================
// Authentication
// ============================

let showLoginToast = false;

function signIn() {
    showLoginToast = true;
    tokenClient.requestAccessToken({
        prompt: ""
    });
}

function initGoogle() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:
            "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",

        callback: async (response) => {
            // Silent sign-in may fail if user has never logged in.
            if (response.error) {
                return;
            }

            try {
                accessToken = response.access_token;
                await loadUserProfile();
                // Show toast only when user explicitly clicked Sign In
                if (showLoginToast) {
                    showToast("Connected to Google Drive.");
                    showLoginToast = false;
                }
            }
            catch (error) {
                console.error(error);
                showToast(error.message, "error");
            }
        }
    });

    document
        .getElementById("googleLoginBtn")
        .addEventListener("click", signIn);
}

async function loadUserProfile() {
    const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        throw new Error("Failed to load user profile");
    }

    currentUser = await response.json();
    // console.log(currentUser);
    updateUserUI();
}

function updateUserUI() {
    document.getElementById("syncStatus").textContent = "🟢 Connected";
    document.getElementById("syncStatus").style.color = "#55d26f"
    document.getElementById("userInfo").style.display = "flex";
    document.getElementById("userName").textContent = currentUser.name;
    document.getElementById("userEmail").textContent = currentUser.email;
    document.getElementById("userPhoto").src = currentUser.picture;
    document.getElementById("googleLoginBtn").style.display = "none";
    document.getElementById("syncBtn").style.display = "block";
    document.getElementById("signOutBtn").style.display = "block";
}

// ============================
// Drive API
// ============================

async function findBackupFile() {

    const url =
        "https://www.googleapis.com/drive/v3/files" +
        "?spaces=appDataFolder" +
        "&fields=files(id,name,modifiedTime)" +
        "&q=name='dsa-tracker-backup.json'";

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Failed to search Drive.");
    }

    const data = await response.json();
    // console.log(data);
    return data.files;
}

async function uploadBackup() {
    const backup = createBackupObject();
    const metadata = {
        name: "dsa-tracker-backup.json",
        parents: ["appDataFolder"]
    };

    const form = new FormData();

    form.append(
        "metadata",
        new Blob(
            [JSON.stringify(metadata)],
            { type: "application/json" }
        )
    );

    form.append(
        "file",
        new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: "application/json" }
        )
    );

    const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            body: form
        }
    );

    if (!response.ok) {
        throw new Error("Failed to upload backup.");
    }
    return await response.json();
}

async function downloadBackup(fileId) {
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        throw new Error("Failed to download backup.");
    }
    return await response.json();
}

async function updateBackup(fileId) {
    const backup = createBackupObject();
    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(backup)
        }
    );

    if (!response.ok) {
        throw new Error("Failed to update backup.");
    }
    return await response.json();
}

// ============================
// Sync Logic
// ============================
let pendingCloudBackup = null;
let pendingFileId = null;

function compareBackups(localBackup, cloudBackup) {
    if (cloudBackup.app !== "DSA Handbook Tracker" || 
        cloudBackup.version !== 1 || 
        !cloudBackup.lastModified ||
        typeof cloudBackup.data !== "object") {
            throw new Error("Invalid cloud backup.");
    }

    const localTime = new Date(localBackup.lastModified).getTime();
    const cloudTime = new Date(cloudBackup.lastModified).getTime();

    if (localTime === cloudTime) {
        return "same";
    }
    if (localTime > cloudTime) {
        return "local";
    }
    return "cloud";
}

async function syncNow() {
    try {
        const localBackup = createBackupObject();
        const files = await findBackupFile();

        if (files.length === 0) {
            await uploadBackup();
            showToast("Backup uploaded successfully.");
            return;
        }

        const file = files[0];

        const cloudBackup = await downloadBackup(file.id);

        const result =
            compareBackups(localBackup, cloudBackup);

        switch(result){

            case "same":
                showToast(
                    "Backup is already up to date."
                );
                break;

            case "cloud":
                pendingCloudBackup = cloudBackup;
                document.getElementById("cloudRestoreModal").classList.add("show");
                break;

            case "local":
                pendingFileId = file.id;
                document.getElementById("cloudUploadModal").classList.add("show");
                break;
        }
    } catch(error) {
        console.error(error);
        showToast(error.message, "error");
    }
}

function signOut() {
    if (!accessToken) return;
    google.accounts.id.disableAutoSelect();
    google.accounts.oauth2.revoke(accessToken, () => {
        accessToken = null;
        currentUser = null;
        document.getElementById("syncStatus").textContent = "⚪ Not Connected";
        document.getElementById("userInfo").style.display = "none";
        document.getElementById("googleLoginBtn").style.display = "block";
        document.getElementById("syncBtn").style.display = "none";
        document.getElementById("signOutBtn").style.display = "none";
        showToast("Signed out.");
    });
}

document
    .getElementById("syncBtn")
    .addEventListener("click", syncNow);

document
    .getElementById("signOutBtn")
    .addEventListener("click", signOut);

document.getElementById("confirmCloudRestore").onclick = () => {
    document.getElementById("cloudRestoreModal")
        .classList.remove("show");

    restoreBackupObject(pendingCloudBackup);
    pendingCloudBackup = null;
    pendingFileId = null;
};

document.getElementById("cancelCloudRestore").onclick = () => {
    pendingCloudBackup = null;
    document.getElementById("cloudRestoreModal")
        .classList.remove("show");
};

document.getElementById("confirmCloudUpload").onclick =
async () => {
    document.getElementById("cloudUploadModal")
        .classList.remove("show");
    try {
        await updateBackup(pendingFileId);
        pendingCloudBackup = null;
        pendingFileId = null;
        showToast("Cloud backup updated.");
    } catch(error){
        console.error(error);
        showToast(error.message,"error");
    }
};

document.getElementById("cancelCloudUpload").onclick = () => {
    pendingCloudBackup = null;
    pendingFileId = null;

    document.getElementById("cloudUploadModal")
        .classList.remove("show");
};