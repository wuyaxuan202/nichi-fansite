# 趙妮綺非官方粉絲站

整理演員趙妮綺的作品、訪談與近況的粉絲網站。本站為粉絲自製，與本人及經紀公司無關。

- **前端**：GitHub Pages（純靜態網頁，免費）
- **後端**：Supabase（資料庫、圖片空間、管理員登入，免費方案就夠用）

還沒接上 Supabase 前，網站會讀 `data/seed.json` 顯示預設內容，所以推上 GitHub 後馬上就能看到畫面。

---

## 一、開啟 GitHub Pages

1. 到這個 repo 的 **Settings → Pages**
2. Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 Save
3. 等一兩分鐘，網址會是 `https://<你的帳號>.github.io/<repo 名稱>/`

## 二、建立 Supabase 後端

1. 到 <https://supabase.com> 註冊並按 **New project**（地區建議選 Northeast Asia (Tokyo)）
2. 專案建好後，左側選 **SQL Editor → New query**，把 `supabase/schema.sql` 整份貼上，按 **Run**
3. 建立管理員帳號：左側 **Authentication → Users → Add user → Create new user**，輸入 Email 和密碼，勾選 *Auto Confirm User*
4. 回到 SQL Editor，執行下面這行（換成剛剛的 Email），把這個帳號加進管理員名單：
   ```sql
   insert into public.admins (email) values ('你的email@example.com');
   ```
   之後要加其他管理員，重複步驟 3、4 即可。
5. 左側 **Project Settings → API**，複製 **Project URL** 和 **anon public** key

## 三、把網站接上後端

打開 `config.js`，填入上一步複製的兩個值，存檔並推上 GitHub：

```js
window.SITE_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseAnonKey: "eyJhbGciOi..."
};
```

anon key 本來就是設計給前端公開使用的。資料庫已設好權限：訪客只能讀，只有管理員名單裡的帳號能修改。**不要**把 `service_role` key 放進來。

## 四、日常更新

1. 打開網站，按最下方的「管理員登入」（或網址後面加 `#admin`）
2. 登入後右上角出現「管理模式」，打開就能在每個區塊新增、編輯、刪除，也能上傳照片
3. 存檔後重新整理頁面，所有訪客就會看到新內容

## 注意事項

- Supabase 免費方案的專案如果一週都沒有任何使用，可能會被暫停，到 Supabase 後台按一下 *Restore* 就能恢復。
- 圖片上限 5MB，支援 JPG、PNG、WebP、GIF。請只上傳你有權使用的照片。
- 訪談摘要請用自己的話寫，並附上原文連結。

## 檔案說明

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 網頁本體 |
| `style.css` | 兔子主題樣式 |
| `app.js` | 讀取資料、管理員登入與編輯 |
| `config.js` | Supabase 連線設定 |
| `data/seed.json` | 尚未接後端時的預設內容 |
| `supabase/schema.sql` | 資料表、權限與初始內容 |
