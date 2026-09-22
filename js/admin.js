import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/admin';
        return;
    }

    // التحقق من صلاحيات الإدارة (تعتمد على حقل isAdmin في الداتابيز كمرحلة Frontend)
    const userRef = ref(db, 'users/' + user.uid);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
        const userData = snapshot.val();
        if (!userData.isAdmin) {
            window.location.href = '/admin';
            return;
        }
        // المستخدم مدير، قم بتحميل اللوحة
        loadDashboardStats();
        loadUsersTable();
    }
});

async function loadDashboardStats() {
    try {
        const usersSnap = await get(ref(db, 'users'));
        const postsSnap = await get(ref(db, 'posts'));
        
        let totalUsers = 0;
        let verifiedUsers = 0;
        let blockedUsers = 0;
        let totalPosts = 0;

        if (usersSnap.exists()) {
            const users = usersSnap.val();
            totalUsers = Object.keys(users).length;
            Object.values(users).forEach(u => {
                if (u.verified) verifiedUsers++;
                if (u.blocked) blockedUsers++;
            });
        }

        if (postsSnap.exists()) {
            totalPosts = Object.keys(postsSnap.val()).length;
        }

        document.getElementById('total-users-count').textContent = totalUsers;
        document.getElementById('verified-users-count').textContent = verifiedUsers;
        document.getElementById('blocked-users-count').textContent = blockedUsers;
        document.getElementById('total-posts-count').textContent = totalPosts;

    } catch (err) {
        console.error("خطأ في جلب الإحصائيات:", err);
    }
}

async function loadUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    try {
        const usersSnap = await get(ref(db, 'users'));
        if (!usersSnap.exists()) return;

        const users = usersSnap.val();
        tbody.innerHTML = '';

        // تحويل الكائن إلى مصفوفة لسهولة العرض
        Object.values(users).reverse().forEach(u => {
            const avatar = u.profileImage || 'https://cdn-icons-png.flaticon.com/128/847/847969.png';
            const statusBadge = u.blocked 
                ? '<span class="badge badge-danger">محظور</span>' 
                : '<span class="badge badge-success">نشط</span>';
            
            const verifyBtnText = u.verified ? 'إلغاء التوثيق' : 'توثيق';
            const verifyBtnClass = u.verified ? '' : 'success';
            const blockBtnText = u.blocked ? 'إلغاء الحظر' : 'حظر';
            const blockBtnClass = u.blocked ? '' : 'danger';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="user-cell">
                        <img src="${avatar}" alt="user">
                        <div>
                            <strong>${u.name}</strong> ${u.verified ? '✔️' : ''}
                            <div style="font-size:12px; color:var(--text-muted)">@${u.username}</div>
                        </div>
                    </div>
                </td>
                <td style="font-size:13px;">${u.email}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn ${verifyBtnClass}" onclick="toggleVerification('${u.uid}', ${u.verified})">${verifyBtnText}</button>
                    <button class="action-btn ${blockBtnClass}" onclick="toggleBlock('${u.uid}', ${u.blocked})">${blockBtnText}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("خطأ في جلب المستخدمين:", err);
    }
}

// جعل الوظائف متاحة في النطاق العام (Global Scope) لاستدعائها من HTML inline onclick
window.toggleBlock = async function(uid, currentStatus) {
    if (confirm(`هل أنت متأكد من ${currentStatus ? 'إلغاء حظر' : 'حظر'} هذا المستخدم؟`)) {
        await update(ref(db, 'users/' + uid), { blocked: !currentStatus });
        loadDashboardStats();
        loadUsersTable();
    }
};

window.toggleVerification = async function(uid, currentStatus) {
    await update(ref(db, 'users/' + uid), { verified: !currentStatus });
    loadDashboardStats();
    loadUsersTable();
};

document.getElementById('admin-logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '/admin';
    });
});
