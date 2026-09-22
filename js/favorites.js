import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { toggleFavorite } from './interactions.js'; // استدعاء دالة الإزالة

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }
    loadFavorites(user.uid);
});

async function loadFavorites(uid) {
    const favFeed = document.getElementById('favorites-feed');
    const favRef = ref(db, `favorites/${uid}`);
    
    try {
        const favSnapshot = await get(favRef);
        
        if (!favSnapshot.exists()) {
            favFeed.innerHTML = '<div class="glass-card post-card" style="text-align:center;">لم تقم بحفظ أي صور بعد.</div>';
            return;
        }

        const favData = favSnapshot.val();
        const postIds = Object.keys(favData);
        favFeed.innerHTML = ''; // تفريغ الحاوية

        for (const postId of postIds) {
            const postRef = ref(db, `posts/${postId}`);
            const postSnapshot = await get(postRef);
            
            if (postSnapshot.exists()) {
                const post = { id: postId, ...postSnapshot.val() };
                const postElement = createFavPostElement(post);
                favFeed.appendChild(postElement);
            }
        }
    } catch (error) {
        favFeed.innerHTML = '<div class="glass-card post-card" style="text-align:center; color: var(--accent-red);">حدث خطأ أثناء جلب المحفوظات.</div>';
    }
}

function createFavPostElement(post) {
    const card = document.createElement('div');
    card.className = 'glass-card post-card';
    card.id = `fav-post-${post.id}`;

    const avatarSrc = post.userAvatar || 'https://cdn-icons-png.flaticon.com/128/847/847969.png';
    const verifiedBadge = post.verified ? `<img src="https://cdn-icons-png.flaticon.com/128/10629/10629607.png" class="verified-badge">` : '';

    card.innerHTML = `
        <div class="post-header">
            <div class="post-user-info">
                <img src="${avatarSrc}" class="avatar-md" alt="Avatar">
                <div>
                    <strong>${post.userName} ${verifiedBadge}</strong>
                </div>
            </div>
        </div>
        <div class="post-caption">${post.caption}</div>
        <div class="post-image-container">
            <img src="${post.imageBase64}" alt="Saved Image" loading="lazy">
        </div>
        <div class="post-actions-bar">
            <button class="post-action-btn remove-fav-btn" data-postid="${post.id}">❌ إزالة من المحفوظات</button>
            <button class="post-action-btn" onclick="downloadFavImage('${post.imageBase64}', 'sky7-fav-${post.id}.jpg')">⬇️ تنزيل الصورة</button>
        </div>
    `;

    // ربط زر الإزالة
    const removeBtn = card.querySelector('.remove-fav-btn');
    removeBtn.addEventListener('click', async (e) => {
        const pId = e.target.getAttribute('data-postid');
        await toggleFavorite(pId, null);
        document.getElementById(`fav-post-${pId}`).remove(); // حذف الكارت من الواجهة فوراً
    });

    return card;
}

window.downloadFavImage = function(base64Data, filename) {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
