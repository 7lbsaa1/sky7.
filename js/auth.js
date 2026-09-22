import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// ترجمة رسائل الخطأ
function getArabicErrorMessage(errorCode) {
    switch(errorCode) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'بيانات تسجيل الدخول غير صحيحة.';
        case 'auth/email-already-in-use':
            return 'هذا البريد الإلكتروني مستخدم بالفعل.';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل.';
        default:
            return 'حدث خطأ، يرجى المحاولة لاحقاً.';
    }
}

// إظهار/إخفاء كلمة المرور
const togglePasswordBtn = document.getElementById('toggle-password');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function() {
        const passwordInput = this.previousElementSibling;
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
    });
}

// تسجيل الدخول
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('error-message');
        const loginBtn = document.getElementById('login-btn');

        loginBtn.disabled = true;
        loginBtn.textContent = 'جاري تسجيل الدخول...';
        errorDiv.textContent = '';

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // التحقق من حالة الحظر
            const userRef = ref(db, 'users/' + user.uid);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.blocked === true) {
                    window.location.href = '/block';
                } else {
                    window.location.href = '/home';
                }
            } else {
                window.location.href = '/home';
            }
        } catch (error) {
            errorDiv.textContent = getArabicErrorMessage(error.code);
            loginBtn.disabled = false;
            loginBtn.textContent = 'تسجيل الدخول';
        }
    });
}

// إنشاء حساب جديد
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('fullname').value;
        const username = document.getElementById('username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const errorDiv = document.getElementById('reg-error-message');
        const registerBtn = document.getElementById('register-btn');

        registerBtn.disabled = true;
        registerBtn.textContent = 'جاري إنشاء الحساب...';
        errorDiv.textContent = '';

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // حفظ بيانات المستخدم في Realtime Database حسب الهيكل المطلوب
            await set(ref(db, 'users/' + user.uid), {
                uid: user.uid,
                name: fullname,
                username: username,
                email: email,
                profileImage: '',
                coverImage: '',
                bio: '',
                verified: false,
                blocked: false,
                createdAt: new Date().toISOString()
            });

            window.location.href = '/profile';
        } catch (error) {
            errorDiv.textContent = getArabicErrorMessage(error.code);
            registerBtn.disabled = false;
            registerBtn.textContent = 'إنشاء الحساب';
        }
    });
}

// منع المستخدم المسجل من رؤية صفحات الدخول والتسجيل
onAuthStateChanged(auth, async (user) => {
    const currentPath = window.location.pathname;
    if (user && (currentPath === '/login' || currentPath === '/registration' || currentPath === '/')) {
        // فحص سريع للحظر قبل التوجيه
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);
        if (snapshot.exists() && snapshot.val().blocked === true) {
            window.location.href = '/block';
        } else {
            window.location.href = '/home';
        }
    }
});
