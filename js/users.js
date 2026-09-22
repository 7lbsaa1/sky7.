import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showToast } from './toast.js';

let currentAuthUser = null;
let allUsersCache = [];

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }
    currentAuthUser = user;
    await fetchAllUsers();
});

async function fetchAllUsers() {
    const gridContainer = document.getElementById('users-grid-container');
    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            gridContainer.innerHTML = '<div class="glass-card" style="grid-column: 1/-1; text-align:center; padding:20px;">لا يوجد مستخدمون مسجلون حالياً.</div>';
            return;
        }

        const usersObj = snapshot.val();
        allUsersCache = [];

        // جلب علاقات المتابعة الخاصة بالمستخدم الحالي
        const followingRef = ref(db, `friends/${currentAuthUser.uid}`);
        const followingSnap = await get(followingRef);
        const followingMap = followingSnap.exists() ? followingSnap.val() : {};

        Object.keys(usersObj).forEach(uid => {
            // استثناء المستخدم الحالي من القائمة
            if (uid !== currentAuthUser.uid && !usersObj[uid].blocked) {
                allUsersCache.push({
                    uid: uid,
                    ...usersObj[uid],
                    isFollowing: !!followingMap[uid]
                });
            }
        });

        renderUsers(allUsersCache);
    } catch (err) {
        console.error("خطأ في جلب المستخدمين:", err);
        gridContainer.innerHTML = '<div class="glass-card" style="grid-column: 1/-1; text-align:center; color:var(--accent-red); padding:20px;">حدث خطأ أثناء تحميل المستخدمين.</div>';
    }
}

function renderUsers(usersList) {
    const gridContainer = document.getElementById('users-grid-container');
    gridContainer.innerHTML = '';

    if (usersList.length === 0) {
        gridContainer.innerHTML = '<div class="glass-card" style="grid-column: 1/-1; text-align:center; padding:20px;">لا توجد نتائج مطابقة للبحث.</div>';
        return;
    }

    usersList.forEach(user => {
        const avatar = user.profileImage || 'https://cdn-icons-png.flaticon.com/128/847/847969.png';
        const verifiedBadge = user.verified ? '<img src="https://cdn-icons-png.flaticon.com/128/10629/10629607.png" class="verified-badge" style="width:16px; height:16px;" alt="Verified">' : '';
        
        const card = document.createElement('div');
        card.className = 'glass-card user-card';
        card.innerHTML = `
            <img src="${avatar}" class="user-avatar" alt="Avatar">
            <div class="user-name-line">
                <h3>${user.name}</h3>
                ${verifiedBadge}
            </div>
            <span class="user-handle">@${user.username}</span>
            <p class="user-bio">${user.bio || 'لا توجد نبذة شخصية.'}</p>
            <div class="user-card-actions">
                <button class="${user.isFollowing ? 'btn-unfollow' : 'btn-follow'}" data-uid="${user.uid}">
                    ${user.isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                </button>
            </div>
        `;

        // ربط أحداث أزرار المتابعة
        const actionBtn = card.querySelector('button');
        actionBtn.addEventListener('click', async () => {
            await toggleFollowStatus(user.uid, actionBtn);
        });

        gridContainer.appendChild(card);
    });
}

// تبديل حالة المتابعة
async function toggleFollowStatus(targetUid, buttonElement) {
    const isCurrentlyFollowing = buttonElement.classList.contains('btn-unfollow');
    const relationRef = ref(db, `friends/${currentAuthUser.uid}/${targetUid}`);

    try {
        if (isCurrentlyFollowing) {
            await remove(relationRef);
            buttonElement.classList.remove('btn-unfollow');
            buttonElement.classList.add('btn-follow');
            buttonElement.textContent = 'متابعة';
            showToast('تم إلغاء المتابعة');
        } else {
            await set(relationRef, {
                followedAt: new Date().toISOString()
            });
            buttonElement.classList.remove('btn-follow');
            buttonElement.classList.add('btn-unfollow');
            buttonElement.textContent = 'إلغاء المتابعة';
            showToast('تمت المتابعة بنجاح');
        }
    } catch (err) {
        showToast('حدث خطأ، يجدر المحاولة لاحقاً', 'error');
    }
}

// نظام البحث المباشر
document.getElementById('users-search-input').addEventListener('input', (e) => {
    const queryTerm = e.target.value.trim().toLowerCase();
    
    const filtered = allUsersCache.filter(u => 
        u.name.toLowerCase().includes(queryTerm) || 
        u.username.toLowerCase().includes(queryTerm)
    );

    renderUsers(filtered);
});
