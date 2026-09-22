import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { processAndCompressImage } from './imageCompression.js';
import { showToast } from './toast.js';

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }
    currentUser = user;
});

document.getElementById('verification-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-verify-btn');
    const reason = document.getElementById('verify-reason').value;
    const fileInput = document.getElementById('verify-document');

    if (!fileInput.files[0]) {
        showToast('يرجى إرفاق صورة الإثبات', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري رفع الطلب...';

    try {
        const base64Image = await processAndCompressImage(fileInput.files[0]);
        const requestRef = ref(db, `verificationRequests/${currentUser.uid}`);

        // جلب بيانات المستخدم الأساسية
        const userSnap = await get(ref(db, `users/${currentUser.uid}`));
        const userData = userSnap.exists() ? userSnap.val() : {};

        await set(requestRef, {
            uid: currentUser.uid,
            name: userData.name || 'مستخدم',
            username: userData.username || '',
            reason: reason,
            documentImage: base64Image,
            badgeIcon: '/facebook-verified.png',
            createdAt: new Date().toISOString()
        });

        showToast('تم إرسال طلب التوثيق بنجاح للمراجعة');
        setTimeout(() => {
            window.location.href = '/profile';
        }, 2000);
    } catch (err) {
        showToast('حدث خطأ أثناء الإرسال', 'error');
        btn.disabled = false;
        btn.textContent = 'إرسال طلب التوثيق';
    }
});
