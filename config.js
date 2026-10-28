// Supabase 連線設定。
// 這兩個值可以公開放在 GitHub：anon key 只能做資料庫權限規則允許的事（訪客只能讀取）。
// 還沒設定時，網站會改讀 data/seed.json 顯示預設內容。
window.SITE_CONFIG = {
  supabaseUrl: "",      // 例：https://abcdefgh.supabase.co
  supabaseAnonKey: ""   // Supabase → Project Settings → API → anon public
};
