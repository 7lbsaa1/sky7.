import { auth, db } from './firebase.js';
import { ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { processAndCompressImage } from './imageCompression.js';
import { currentUserData } from './home.js';

// التحكم في المودال
const modal = document.getElementById('upload-modal');
const openModalBtn = document.getElementById('open-post-modal');
const closeModalBtn = document.getElementById('close-upload-modal');
const cancelBtn = document.getElementById('cancel-post-btn');
const fileInput = document.getElementById('post-image-input');
const dropArea = document.getElementById('drop-area');
const imagePreview = document.getElementById('image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');

function openModal() { modal.classList.add('active'); }
function closeModal() { 
    modal.classList.remove('active'); 
    document.getElementById('post-form').reset();
    imagePreview.style.display = 'none';
    uploadPlaceholder.style.display = 'block';
}

if(openModalBtn) openModalBtn.addEventListener('click', openModal);
if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
if(dropArea) dropArea.addEventListener('click', () => fileInput.click());

// معاينة الصورة المختارة
let selectedFile = null;
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(selectedFile);
    }
});

// رفع المنشور
const postForm = document.getElementById('post-form');
if (postForm) {
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const caption = document.getElementById('post-caption').value;
        const submitBtn = document.getElementById('submit-post-btn');

        if (!selectedFile) {
            alert('يرجى اختيار صورة أولاً.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري ضغط ومعالجة الصورة...';

        try {
            // المعالجة الكاملة: ضغط + Resize + Base64
            const base64Image = await processAndCompressImage(selectedFile);

            submitBtn.textContent = 'جاري نشر الصور...';

            const newPostRef = push(ref(db, 'posts'));
            await push(ref(db, 'posts'), {
                id: newPostRef.key,
                userId: auth.currentUser.uid,
                userName: currentUserData.name,
                userUsername: currentUserData.username,
                userAvatar: currentUserData.profileImage || '',
                verified: currentUserData.verified || false,
                caption: caption,
                imageBase64: base64Image,
                createdAt: new Date().toISOString(),
                likesCount: 0,
                commentsCount: 0,
                sharesCount: 0
            });

            closeModal();
            selectedFile = null;
        } catch (error) {
            alert("خطأ أثناء المعالجة: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'نشر الآن';
        }
    });
}

// عرض Feed المنشورات لحظياً
const postsFeed = document.getElementById('posts-feed');
const postsRef = ref(db, 'posts');

onValue(postsRef, (snapshot) => {
    postsFeed.innerHTML = '';
    if (!snapshot.exists()) {
        postsFeed.innerHTML = '<div class="glass-card post-card" style="text-align:center;">لا توجد منشورات حتى الآن، كن أول من يشارك صورة للسماء!</div>';
        return;
    }

    const postsObj = snapshot.val();
    const postsArray = Object.keys(postsObj).map(key => ({
        id: key,
        ...postsObj[key]
    })).reverse(); // ترتيب الحديث أولاً

    postsArray.forEach(post => {
        const postElement = createPostCardElement(post);
        postsFeed.appendChild(postElement);
    });
});

function createPostCardElement(post) {
    const card = document.createElement('div');
    card.className = 'glass-card post-card';

    const verifiedBadgeHTML = post.verified 
        ? `<img src="https://cdn-icons-png.flaticon.com/128/10629/10629607.png" class="verified-badge" title="حساب موثق">` 
        : '';

    const avatarSrc = post.userAvatar || 'https://cdn-icons-png.flaticon.com/128/847/847969.png';

    card.innerHTML = `
        <div class="post-header">
            <div class="post-user-info">
                <img src="${avatarSrc}" class="avatar-md" alt="Avatar">
                <div>
                    <strong>${post.userName} ${verifiedBadgeHTML}</strong>
                    <div class="post-time">@${post.userUsername} • ${new Date(post.createdAt).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            </div>
        </div>
        
        <div class="post-caption">${post.caption}</div>
        
        <div class="post-image-container">
            <img src="${post.imageBase64}" alt="Sky post image" loading="lazy">
        </div>

        <div class="post-actions-bar">
            <button class="post-action-btn">❤️ إعجاب</button>
            <button class="post-action-btn">💬 تعليق</button>
            <button class="post-action-btn">🔖 حفظ الصورة</button>
            <button class="post-action-btn" onclick="downloadImage('${post.imageBase64}', 'sky7-${post.id}.jpg')">⬇️ تنزيل</button>
        </div>
    `;

    return card;
}

// دالة تنزيل الصورة مباشرة بدون روابط خارجية
window.downloadImage = function(base64Data, filename) {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
