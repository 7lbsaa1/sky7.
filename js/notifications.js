import { auth, db } from './firebase.js';
import { ref, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showToast } from './toast.js';

export function initNotifications(userId) {
    if (!userId) return;

    const notifRef = ref(db, `notifications/${userId}`);

    // الاستماع لأي إشعار جديد يتم إضافته في قاعدة البيانات
    onChildAdded(notifRef, (snapshot) => {
        const notif = snapshot.val();
        if (notif && !notif.read) {
            showToast(notif.message || 'لديك إشعار جديد');
        }
    });
}
