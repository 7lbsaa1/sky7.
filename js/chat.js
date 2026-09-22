import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, set, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showToast } from './toast.js';

let currentUser = null;
let activeRecipientId = null;
let messagesListener = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }
    currentUser = user;
    loadConversations();
});

// توليد معرف فريد ومستقر للمحادثة بين مستخدمين بناءً على الـ UID الخاص بكل منهما
function getChatRoomId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

async function loadConversations() {
    const listContainer = document.getElementById('conversations-list');
    try {
        const usersSnap = await get(ref(db, 'users'));
        if (!usersSnap.exists()) return;

        const usersObj = usersSnap.val();
        listContainer.innerHTML = '';

        Object.keys(usersObj).forEach(uid => {
            if (uid !== currentUser.uid && !usersObj[uid].blocked) {
                const user = usersObj[uid];
                const avatar = user.profileImage || 'https://cdn-icons-png.flaticon.com/128/847/847969.png';

                const item = document.createElement('div');
                item.className = 'conversation-item';
                item.innerHTML = `
                    <img src="${avatar}" alt="Avatar">
                    <div>
                        <h4 style="font-size: 14px;">${user.name}</h4>
                        <span style="font-size: 12px; color: var(--text-muted);">@${user.username}</span>
                    </div>
                `;

                item.addEventListener('click', () => {
                    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    openChat(uid, user);
                });

                listContainer.appendChild(item);
            }
        });
    } catch (err) {
        console.error("خطأ في جلب المحادثات:", err);
    }
}

function openChat(recipientId, recipientData) {
    activeRecipientId = recipientId;
    document.getElementById('no-chat-selected').style.display = 'none';
    document.getElementById('active-chat-box').style.display = 'flex';

    document.getElementById('active-user-name').textContent = recipientData.name;
    document.getElementById('active-user-avatar').src = recipientData.profileImage || 'https://cdn-icons-png.flaticon.com/128/847/847969.png';

    const feed = document.getElementById('chat-messages-feed');
    feed.innerHTML = '';

    const roomId = getChatRoomId(currentUser.uid, recipientId);
    const messagesRef = ref(db, `chats/${roomId}`);

    // جلب واستماع للرسائل الجديدة
    onChildAdded(messagesRef, (snapshot) => {
        const msg = snapshot.val();
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msg.senderId === currentUser.uid ? 'outgoing' : 'incoming'}`;
        bubble.textContent = msg.text;
        feed.appendChild(bubble);
        feed.scrollTop = feed.scrollHeight;
    });
}

document.getElementById('chat-input-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-message-input');
    const text = input.value.trim();

    if (!text || !activeRecipientId) return;

    const roomId = getChatRoomId(currentUser.uid, activeRecipientId);
    const messagesRef = ref(db, `chats/${roomId}`);

    try {
        await push(messagesRef, {
            senderId: currentUser.uid,
            text: text,
            createdAt: new Date().toISOString()
        });
        input.value = '';
    } catch (err) {
        showToast('فشل إرسال الرسالة', 'error');
    }
});
