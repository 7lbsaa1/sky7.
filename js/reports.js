import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
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
        loadReportsTable();
    }
});

async function loadReportsTable() {
    const tbody = document.getElementById('admin-reports-tbody');
    try {
        const reportsSnap = await get(ref(db, 'reports'));
        
        if (!reportsSnap.exists()) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">لا توجد بلاغات مسجلة حالياً.</td></tr>';
            return;
        }

        const reportsObj = reportsSnap.val();
        tbody.innerHTML = '';

        for (const reportId of Object.keys(reportsObj)) {
            const report = reportsObj[reportId];
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;">${report.reporterName || 'مستخدم'}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${new Date(report.createdAt).toLocaleDateString('ar-EG')}</div>
                </td>
                <td>
                    <span class="badge badge-danger">${report.reason || 'محتوى مخالف'}</span>
                    <div style="font-size:13px; margin-top:4px;">${report.description || 'بدون تفاصيل'}</div>
                </td>
                <td>
                    <a href="/home" target="_blank" style="color:var(--accent-blue); font-size:13px;">عرض العنصر المبلغ عنه</a>
                </td>
                <td>
                    <button class="action-btn danger" onclick="deleteReportedPost('${reportId}', '${report.postId}')">حذف المحتوى</button>
                    <button class="action-btn" onclick="dismissReport('${reportId}')">تجاهل</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    } catch (err) {
        console.error("خطأ في جلب البلاغات:", err);
    }
}

// حذف المنشور المخالف وإزالة البلاغ
window.deleteReportedPost = async function(reportId, postId) {
    if (confirm('هل أنت متأكد من حذف هذا المحتوى المخالف؟')) {
        try {
            if (postId) {
                await remove(ref(db, 'posts/' + postId));
            }
            await remove(ref(db, 'reports/' + reportId));
            showToast('تم حذف المحتوى وإغلاق البلاغ بنجاح');
            loadReportsTable();
        } catch (err) {
            showToast('حدث خطأ أثناء تنفيذ الإجراء', 'error');
        }
    }
};

// تجاهل البلاغ وحذفه من قائمة المراجعة
window.dismissReport = async function(reportId) {
    try {
        await remove(ref(db, 'reports/' + reportId));
        showToast('تم تجاهل البلاغ');
        loadReportsTable();
    } catch (err) {
        showToast('حدث خطأ', 'error');
    }
};

document.getElementById('admin-logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '/login';
    });
});
