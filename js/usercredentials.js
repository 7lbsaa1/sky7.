<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إدارة طلبات التوثيق - sky7 Admin</title>
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/home.css">
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body>

    <!-- NAVBAR -->
    <nav class="navbar glass-card">
        <div class="nav-container">
            <a href="/home" class="nav-logo">
                <img src="https://cdn-icons-png.flaticon.com/128/7978/7978734.png" alt="sky7 logo">
                <span>sky7 Admin</span>
            </a>
            <div class="nav-menu">
                <a href="/home" class="nav-link">العودة للموقع</a>
                <button id="admin-logout-btn" class="btn-logout">خروج</button>
            </div>
        </div>
    </nav>

    <div class="container main-layout admin-layout">
        
        <!-- ADMIN SIDEBAR -->
        <aside class="sidebar glass-card">
            <ul class="sidebar-links">
                <li><a href="/admin">📊 لوحة القيادة</a></li>
                <li><a href="/users">👥 إدارة المستخدمين</a></li>
                <li><a href="/usercredentials" class="active">✅ طلبات التوثيق</a></li>
                <li><a href="/reports">🚩 البلاغات</a></li>
            </ul>
        </aside>

        <!-- ADMIN MAIN CONTENT -->
        <main class="admin-content">
            <h2 class="admin-page-title">طلبات توثيق الحسابات المعلقة</h2>
            
            <div class="glass-card admin-panel-card">
                <div class="panel-header">
                    <h3>قائمة الطلبات الواردة</h3>
                </div>
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>المستخدم</th>
                                <th>السبب / النبذة</th>
                                <th>صورة الإثبات</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="admin-verification-tbody">
                            <!-- سيتم حقن الطلبات هنا عبر JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>

    <script type="module" src="/js/admin-verification.js"></script>
</body>
</html>
