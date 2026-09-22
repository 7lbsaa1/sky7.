import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, update, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showToast } from './toast.js';

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }

    // التحقق من صلاحيات المدير
    const userRef = ref(db, 'users/' + user.uid);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
        const userData = snapshot.val();
        if (!userData.isAdmin) {
            window.location.href = '/home';
            return;
        }
        loadVerificationRequests();
    }
});

async function loadVerificationRequests() {
    const tbody = document.getElementById('admin-verification-tbody');
    try {
        const reqSnap = await get(ref(db, 'verificationRequests'));
        
        if (!reqSnap.exists()) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">لا توجد طلبات توثيق معلقة حالياً.</td></tr>';
            return;
        }

        const requestsObj = reqSnap.val();
        tbody.innerHTML = '';

        for (const requestId of Object.keys(requestsObj)) {
            const req = requestsObj[requestId];
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; display:flex; align-items:center; gap:5px;">
                        ${req.name} 
                        <img src="${req.badgeIcon || '/facebook-verified.png'}" style="width:16px; height:16px;" alt="Verified">
                    </div>
                    <div style="font-size:12px; color:var(--text-muted);">@${req.username}</div>
                </td>
                <td>
                    <div style="font-size:13px; max-width: 250px; line-height: 1.4;">${req.reason}</div>
                    <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">${new Date(req.createdAt).toLocaleDateString('ar-EG')}</div>
                </td>
                <td>
                    <a href="${req.documentImage}" target="_blank" style="color: var(--accent-blue); font-size: 13px;">عرض مستند الإثبات</a>
                </td>
                <td>
                    <button class="action-btn success" onclick="approveVerification('${req.uid}', '${requestId}')">قبول وتوثيق</button>
                    <button class="action-btn danger" onclick="rejectVerification('${requestId}')">رفض وحذف</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    } catch (err) {
        console.error("خطأ في جلب طلبات التوثيق:", err);
    }
}

// دالة قبول التوثيق وتحديث الحقل verified: true في مسار المستخدم
window.approveVerification = async function(uid, requestId) {
    if (confirm('هل أنت متأكد من قبول طلب التوثيق ومنح المستخدم شارة التوثيق الزرقاء؟')) {
        try {
            // تحديث حقل التوثيق في حساب المستخدم
            await update(ref(db, 'users/' + uid), { verified: true });
            
            // حذف الطلب من قائمة الطلبات المعلقة
            await remove(ref(db, 'verificationRequests/' + requestId));
            
            showToast('تم قبول التوثيق وتفعيل الشارة بنجاح');
            loadVerificationRequests();
        } catch (err) {
            showToast('حدث خطأ أثناء تنفيذ الإجراء', 'error');
        }
    }
};

// دالة رفض الطلب وحذفه
window.rejectVerification = async function(requestId) {
    if (confirm('هل أنت متأكد من رفض وحذف هذا الطلب؟')) {
        try {
            await remove(ref(db, 'verificationRequests/' + requestId));
            showToast('تم رفض الطلب وحذفه');
            loadVerificationRequests();
        } catch (err) {
            showToast('حدث خطأ', 'error');
        }
    }
};

document.getElementById('admin-logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '/login';
    });
});
