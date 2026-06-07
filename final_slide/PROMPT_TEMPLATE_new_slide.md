# Prompt template — adding a new slide to the Rabby deck

Use this whenever your friend sends raw content (text/notes) for one of the
"Coming soon" sections, so the new page comes out matching the existing design
system without back-and-forth.

## Copy-paste skeleton

```
Tạo file HTML mới cho slide "<TÊN SECTION>" trong project Rabby Wallet Fraud
Detection Features, thay thế file placeholder <rabby_placeholder_xxx.html>.

YÊU CẦU FORMAT (bắt buộc — phải khớp với 4 slide đã có):
- Dùng đúng hệ theme hiện có: <html lang="en" data-theme="dark">, link tới
  rabby_sidebar.css, và khối CSS variables [data-theme="dark"]/[data-theme="light"]
  với --bg/--bg2/--bg3/--border/--text/--text-muted/--accent(#6c8ef7 / #4361ee)
  /--accent2(#a78bfa / #7c3aed) — copy nguyên khối từ rabby_overview_slide.html.
- Có #topbar (h1 + nút #theme-btn onclick="toggleTheme()") giống các trang khác,
  tiêu đề dạng "Rabby Wallet — <span>Tên section</span>".
- Nội dung chính bọc trong phần tử có id="main", margin-top 84px (chừa chỗ topbar).
- Cuối file: hàm toggleTheme() (copy y nguyên từ slide khác) +
  <script src="rabby_sidebar.js" defer></script> trước </body>.
- KHÔNG đổi tên file/đường dẫn — giữ đúng filename đang khai trong RB_NAV của
  rabby_sidebar.js (xem file đó để lấy tên chính xác).
- Sau khi tạo xong, sửa rabby_sidebar.js: xoá `soon: true` ở mục tương ứng.

NỘI DUNG (do bạn tôi cung cấp — dán nguyên văn notes vào đây):
<DÁN NỘI DUNG/NOTES CỦA BẠN VÀO ĐÂY>

Hãy tự sắp xếp nội dung trên thành cấu trúc slide phù hợp (hero, info cards,
diagram nếu có quy trình, bullet "key points", v.v.), nhưng PHẢI giữ nguyên
bảng màu/spacing/border-radius đã dùng trong các slide kia — không tự sáng tạo
style mới.
```

## Why this works
Giving the model the exact CSS variable names, the `id="topbar"`/`id="main"`
contract, and "copy from existing file X" anchors it to the established system
instead of inventing a new palette — which is what caused the original
inconsistency across the 4 decks.

---

# Lesson for next time: lock the format BEFORE generating any HTML

When a project will need many HTML pages, create a **design-system / style
spec file first** (before asking for any slide), then reference it in every
generation prompt. Two lightweight options:

1. **`DESIGN_SYSTEM.md`** — a short doc listing: color palette (as CSS
   variables, both themes), typography, spacing scale, component patterns
   (topbar, cards, badges), and the shared-component contract (sidebar
   CSS/JS, `id="topbar"`/`id="main"` hooks). Every future "create a slide
   about X" prompt just says "follow DESIGN_SYSTEM.md".

2. **A real boilerplate/template HTML file** (like `rabby_placeholder_template.html`
   already in this folder) — even better, because the model copies real code
   instead of re-deriving it from a description. Generate this ONE file
   carefully first, verify it renders correctly, then every subsequent prompt
   says "based on `template.html`, build a page about X — keep the
   theme/topbar/sidebar wiring identical, only change the content section."

Either approach turns "align 4 already-divergent files" (expensive — lots of
reading + rewriting) into "stamp out new files from one known-good template"
(cheap — mostly content generation, structure is fixed).
