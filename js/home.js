import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, set, push, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { processAndCompressImage } from './imageCompression.js';
import { toggleFavorite, addComment } from './interactions.js';
import { initNotifications } from './notifications.js';
import { showToast } from './toast.js';

let currentUserData = null;
let selectedImageBase64 = null;

// التحقق من حالة المستخدم عند تحميل الصفحة
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }

    // جلب بيانات المستخدم الحالي من قاعدة البيانات
    const userRef = ref(db, 'users/' + user.uid);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        currentUserData = { uid: user.uid, ...snapshot.val() };

        // التحقق مما إذا كان المستخدم محظوراً
        if (currentUserData.blocked === true) {
            window.location.href = '/block';
            return;
        }

        // تحديث واجهة المستخدم في الشريط العلوي
        document.getElementById('nav-username').textContent = currentUserData.name;
        if (currentUserData.profileImage) {
            document.getElementById('nav-avatar').src = currentUserData.profileImage;
        }

        // تفعيل نظام الإشعارات الفورية
        initNotifications(user.uid);
    }

    // تحميل المنشورات في الصفحة الرئيسية
    loadPosts();
});

// التعامل مع رفع واختيار الصور للمنشور الجديد
const imageInput = document.getElementById('post-image-input');
const imagePreviewBox = document.getElementById('image-preview-box');
const previewImg = document.getElementById('preview-img');

document.getElementById('attach-image-btn').addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            showToast('جاري معالجة وضغط الصورة...');
            selectedImageBase64 = await processAndCompressImage(file);
            previewImg.src = selectedImageBase64;
            imagePreviewBox.style.display = 'block';
        } catch (err) {
            showToast('فشل تحميل الصورة', 'error');
        }
    }
});

document.getElementById('remove-preview-btn').addEventListener('click', () => {
    selectedImageBase64 = null;
    imageInput.value = '';
    imagePreviewBox.style.display = 'none';
    previewImg.src = '';
});

// نشر منشور جديد
document.getElementById('create-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const caption = document.getElementById('post-caption-input').value.trim();
    const publishBtn = document.getElementById('publish-post-btn');

    if (!caption && !selectedImageBase64) {
        showToast('يرجى كتابة نص أو إرفاق صورة على الأقل', 'error');
        return;
    }

    publishBtn.disabled = true;
    publishBtn.textContent = 'جاري النشر...';

    try {
        const postsRef = ref(db, 'posts');
        await push(postsRef, {
            userId: currentUserData.uid,
            userName: currentUserData.name,
            userAvatar: currentUserData.profileImage || '',
            verified: currentUserData.verified || false,
            caption: caption,
            imageBase64: selectedImageBase64 || '',
            createdAt: new Date().toISOString()
        });

        // إعادة ضبط النموذج
        document.getElementById('post-caption-input').value = '';
        selectedImageBase64 = null;
        imageInput.value = '';
        imagePreviewBox.style.display = 'none';
        previewImg.src = '';

        showToast('تم نشر المنشور بنجاح');
        loadPosts();
    } catch (err) {
        showToast('حدث خطأ أثناء النشر', 'error');
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = 'نشر';
    }
});

// جلب وعرض المنشورات في الخلاصة (Feed)
async function loadPosts() {
    const feedContainer = document.getElementById('posts-feed-container');
    const postsRef = ref(db, 'posts');

    try {
        const snapshot = await get(postsRef);
        feedContainer.innerHTML = '';

        if (!snapshot.exists()) {
            feedContainer.innerHTML = '<div class="glass-card post-card" style="text-align:center;">لا توجد منشورات متاحة حالياً.</div>';
            return;
        }

        const postsObj = snapshot.val();
        const postsArray = Object.keys(postsObj).map(key => ({
            id: key,
            ...postsObj[key]
        })).reverse(); // عرض أحدث المنشورات أولاً

        postsArray.forEach(post => {
            const postCard = createPostElement(post);
            feedContainer.appendChild(postCard);
        });

    } catch (err) {
        feedContainer.innerHTML = '<div class="glass-card post-card" style="text-align:center; color: var(--accent-red);">فشل تحميل المنشورات.</div>';
    }
}

// إنشاء عنصر المنشور بترميز HTML وزجاجي
function createPostElement(post) {
    const card = document.createElement('div');
    card.className = 'glass-card post-card';

    const avatar = post.userAvatar || 'https://cdn-icons-png.flaticon.com/128/847/847969.png';
    const verifiedBadge = post.verified ? `<img src="https://cdn-icons-png.flaticon.com/128/10629/10629607.png" class="verified-badge" alt="Verified">` : '';

    card.innerHTML = `
        <div class="post-header">
            <div class="post-user-info">
                <img src="${avatar}" class="avatar-md" alt="Avatar">
                <div>
                    <strong>${post.userName}</strong>
                    ${verifiedBadge}
                    <span class="post-time">${new Date(post.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
            </div>
        </div>
        <div class="post-caption">${post.caption || ''}</div>
        ${post.imageBase64 ? `
            <div class="post-image-container">
                <img src="${post.imageBase64}" alt="Post Image" loading="lazy">
            </div>
        ` : ''}
        <div class="post-actions-bar">
            <button class="post-action-btn save-fav-btn" data-id="${post.id}">🔖 حفظ</button>
            <button class="post-action-btn report-btn" data-id="${post.id}" data-userid="${post.userId}">🚩 إبلاغ</button>
        </div>
    `;

    // ربط زر حفظ المنشور في المفضلة
    card.querySelector('.save-fav-btn').addEventListener('click', async () => {
        await toggleFavorite(post.id, post);
    });

    // ربط زر الإبلاغ عن المنشور
    card.querySelector('.report-btn').addEventListener('click', async () => {
        const reason = prompt('الرجاء كتابة سبب الإبلاغ عن هذا المنشور:');
        if (reason) {
            try {
                await push(ref(db, 'reports'), {
                    postId: post.id,
                    reportedUserId: post.userId,
                    reporterId: currentUserData.uid,
                    reporterName: currentUserData.name,
                    reason: reason,
                    createdAt: new Date().toISOString()
                });
                showToast('تم إرسال البلاغ بنجاح للإدارة');
            } catch (err) {
                showToast('فشل إرسال البلاغ', 'error');
            }
        }
    });

    return card;
}

// زر تسجيل الخروج
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = '/login';
        });
    });
}
