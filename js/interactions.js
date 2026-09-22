import { auth, db } from './firebase.js';
import { ref, set, remove, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showToast } from './toast.js';

// حفظ المنشور في المفضلة
export async function toggleFavorite(postId, postData) {
    const user = auth.currentUser;
    if (!user) return;

    const favRef = ref(db, `favorites/${user.uid}/${postId}`);
    
    try {
        const snapshot = await get(favRef);
        if (snapshot.exists()) {
            // إزالة من المفضلة
            await remove(favRef);
            showToast('تمت إزالة الصورة من المحفوظات');
        } else {
            // إضافة للمفضلة
            await set(favRef, {
                savedAt: new Date().toISOString(),
                postRef: postId // يمكن حفظ الـ ID فقط أو بيانات المنشور الأساسية
            });
            showToast('تم حفظ الصورة في المحفوظات بنجاح');
        }
    } catch (error) {
        showToast('حدث خطأ أثناء الحفظ', 'error');
    }
}

// إضافة تعليق
export async function addComment(postId, commentText, userData) {
    const user = auth.currentUser;
    if (!user || !commentText.trim()) return;

    const commentId = Date.now().toString(); // توليد ID بسيط
    const commentRef = ref(db, `comments/${postId}/${commentId}`);
    
    try {
        await set(commentRef, {
            userId: user.uid,
            userName: userData.name,
            userAvatar: userData.profileImage,
            verified: userData.verified,
            text: commentText,
            createdAt: new Date().toISOString()
        });
        showToast('تمت إضافة التعليق');
    } catch (error) {
        showToast('حدث خطأ أثناء إضافة التعليق', 'error');
    }
}
