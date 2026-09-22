import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, update, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { processAndCompressImage } from './imageCompression.js';

let currentUser = null;
let newCoverBase64 = null;
let newAvatarBase64 = null;

// التحقق من حالة الدخول وجلب بيانات المستخدم
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }

    currentUser = user;
    await loadUserProfile(user.uid);
    await loadUserPosts(user.uid);
});

async function loadUserProfile(uid) {
    const userRef = ref(db, 'users/' + uid);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        const data = snapshot.val();

        if (data.blocked === true) {
            window.location.href = '/block';
            return;
        }

        // تحديث الواجهة
        document.getElementById('nav-username').textContent = data.name;
        document.getElementById('profile-full-name').textContent = data.name;
        document.getElementById('profile-user-handle').textContent = '@' + data.username;
        document.getElementById('profile-bio-text').textContent = data.bio || 'لا توجد نبذة شخصية حتى الآن.';

        if (data.profileImage) {
            document.getElementById('nav-avatar').src = data.profileImage;
            document.getElementById('profile-avatar-img').src = data.profileImage;
            document.getElementById('edit-avatar-preview').src = data.profileImage;
        }

        if (data.coverImage) {
            document.getElementById('profile-cover-img').src = data.coverImage;
            document.getElementById('edit-cover-preview').src = data.coverImage;
        }

        if (data.verified) {
            document.getElementById('profile-verified-badge').style.display = 'inline-block';
        }

        // إعداد بيانات المودال
        document.getElementById('edit-name').value = data.name;
        document.getElementById('edit-bio').value = data.bio || '';
        document.getElementById('bio-char-count').textContent = (data.bio || '').length;
    }
}

// جلب منشورات المستخدم الخاصة فقط
async function loadUserPosts(uid) {
    const postsFeed = document.getElementById('user-posts-feed');
    const postsRef = ref(db, 'posts');

    const snapshot = await get(postsRef);
    postsFeed.innerHTML = '';

    if (!snapshot.exists()) {
        postsFeed.innerHTML = '<div class="glass-card post-card" style="text-align:center;">لم تقم بنشر أي صور بعد.</div>';
        document.getElementById('stat-posts-count').textContent = '0';
        document.getElementById('stat-photos-count').textContent = '0';
        return;
    }

    const postsObj = snapshot.val();
    const userPosts = Object.keys(postsObj)
        .map(key => ({ id: key, ...postsObj[key] }))
        .filter(post => post.userId === uid)
        .reverse();

    document.getElementById('stat-posts-count').textContent = userPosts.length;
    document.getElementById('stat-photos-count').textContent = userPosts.length;

    if (userPosts.length === 0) {
        postsFeed.innerHTML = '<div class="glass-card post-card" style="text-align:center;">لم تقم بنشر أي صور بعد.</div>';
        return;
    }

    userPosts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'glass-card post-card';
        postCard.innerHTML = `
            <div class="post-header">
                <strong>${post.userName}</strong>
                <span class="post-time">${new Date(post.createdAt).toLocaleDateString('ar-EG')}</span>
            </div>
            <p class="post-caption">${post.caption}</p>
            <div class="post-image-container">
                <img src="${post.imageBase64}" alt="Post Image">
            </div>
        `;
        postsFeed.appendChild(postCard);
    });
}

// المودال وإدارة الأحداث
const editModal = document.getElementById('edit-profile-modal');
document.getElementById('open-edit-profile-btn').addEventListener('click', () => editModal.classList.add('active'));
document.getElementById('close-edit-modal').addEventListener('click', () => editModal.classList.remove('active'));
document.getElementById('cancel-edit-btn').addEventListener('click', () => editModal.classList.remove('active'));

// عداد أحرف الـ Bio
document.getElementById('edit-bio').addEventListener('input', (e) => {
    document.getElementById('bio-char-count').textContent = e.target.value.length;
});

// تغيير صورة الغلاف وصورة البروفايل عبر Base64
document.getElementById('change-cover-btn').addEventListener('click', () => document.getElementById('edit-cover-input').click());
document.getElementById('change-avatar-btn').addEventListener('click', () => document.getElementById('edit-avatar-input').click());

document.getElementById('edit-cover-input').addEventListener('change', async (e) => {
    if (e.target.files[0]) {
        newCoverBase64 = await processAndCompressImage(e.target.files[0]);
        document.getElementById('edit-cover-preview').src = newCoverBase64;
    }
});

document.getElementById('edit-avatar-input').addEventListener('change', async (e) => {
    if (e.target.files[0]) {
        newAvatarBase64 = await processAndCompressImage(e.target.files[0]);
        document.getElementById('edit-avatar-preview').src = newAvatarBase64;
    }
});

// حفظ التعديلات على Firebase
document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'جاري الحفظ...';

    const updatedData = {
        name: document.getElementById('edit-name').value,
        bio: document.getElementById('edit-bio').value
    };

    if (newCoverBase64) updatedData.coverImage = newCoverBase64;
    if (newAvatarBase64) updatedData.profileImage = newAvatarBase64;

    try {
        await update(ref(db, 'users/' + currentUser.uid), updatedData);
        editModal.classList.remove('active');
        await loadUserProfile(currentUser.uid);
    } catch (err) {
        alert("حدث خطأ أثناء حفظ البيانات: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ التغييرات';
    }
});
