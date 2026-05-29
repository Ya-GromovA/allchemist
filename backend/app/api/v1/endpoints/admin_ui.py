from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


@router.get("/admin/ui", response_class=HTMLResponse, tags=["admin"])
async def admin_ui() -> str:
    return """<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Алхимик Админ-панель</title>
  <style>
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "PT Sans", sans-serif;
      background: radial-gradient(circle at 90% -5%, #d9f1ff 0, transparent 35%), #f3f8fb;
      color: #1f2f35;
    }
    .wrap {
      max-width: 760px;
      margin: 40px auto;
      background: #ffffff;
      border: 1px solid #cbdde6;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(20, 63, 88, 0.08);
    }
    h1 { margin: 0 0 10px; }
    p { color: #48606b; line-height: 1.5; }
    a {
      display: inline-block;
      margin-top: 10px;
      background: linear-gradient(120deg, #0f7f91, #1d5f8f);
      color: #fff;
      text-decoration: none;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 600;
    }
    .small { margin-top: 12px; font-size: 13px; color: #647f89; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Алхимик Админ-панель</h1>
    <p>Этот адрес переведен в режим совместимости.</p>
    <p>Для работы используйте новый web-кабинет с обновленным интерфейсом и полным набором операций.</p>
    <a href="/api/v1/admin/web">Открыть новый web-кабинет</a>
    <div class="small">Переход: legacy /admin/ui -> /admin/web.</div>
  </div>
</body>
</html>"""
