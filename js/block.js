import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }

    try {
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            // إذا كان المستخدم غير محظور، أعده إلى الرئيسية فوراً
            if (userData.blocked !== true) {
                window.location.href = '/home';
            }
        } else {
            window.location.href = '/login';
        }
    } catch (err) {
        console.error("خطأ في جلب بيانات الحظر:", err);
    }
});

document.getElementById('block-logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '/login';
    });
});
