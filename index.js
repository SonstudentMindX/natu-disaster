/* eonet.js
   NASA EONET v3 demo (no async/await)
   Cách dùng: trên trang chi tiết, tạo <div id="resultArea"></div>
   và set category bằng data-category hoặc query param ?category=
*/

(function () {
  var EONET_BASE = "https://eonet.gsfc.nasa.gov/api/v3/events";

  // Map “slug” theo folder của bạn → category gợi ý
  // Bạn có thể đổi lại tuỳ bạn.
  var CATEGORY_BY_PAGE = {
    dongdat: "earthquakes",
    lulut: "floods",
    nuilua: "volcanoes",
    // [Chưa xác minh] EONET có category "tsunami" hay không ở mọi thời điểm.
    // Nếu bạn muốn Sóng thần chuẩn nhất, thường dùng NOAA/USGS.
    songthan: ""
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(isoString) {
    if (!isoString) return "N/A";
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("vi-VN");
  }

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function inferPageKeyFromPath() {
    var path = window.location.pathname.toLowerCase();
    // ví dụ: /lulut/lulut.html -> "lulut"
    var parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    return parts[parts.length - 2] || ""; // lấy folder ngay trước file html
  }

  function getCategory() {
    // Ưu tiên 1: query param ?category=floods
    var q = getQueryParam("category");
    if (q) return q;

    // Ưu tiên 2: data-category trên <body data-category="floods">
    var bodyCat = document.body && document.body.getAttribute("data-category");
    if (bodyCat) return bodyCat;

    // Ưu tiên 3: suy ra từ folder name
    var pageKey = inferPageKeyFromPath();
    return CATEGORY_BY_PAGE[pageKey] || "";
  }

  function buildUrl(category, limit) {
    limit = limit || 20;

    // EONET v3: filter theo category thường dùng dạng:
    // /events?category=floods&limit=20
    // (Nếu API thay đổi, bạn chỉ cần chỉnh chỗ này)
    var url = EONET_BASE + "?limit=" + encodeURIComponent(limit);

    if (category) {
      url += "&category=" + encodeURIComponent(category);
    }

    // sort gần đây trước (nếu API hỗ trợ orderby, còn không thì vẫn ok)
    // EONET v3 có thể không hỗ trợ orderby theo kiểu USGS. Nếu không có tác dụng thì bỏ cũng được.
    return url;
  }

  function renderLoading(el) {
    el.innerHTML = '<div class="result-area"><p>Đang tải dữ liệu từ NASA EONET...</p></div>';
  }

  function renderError(el, message) {
    el.innerHTML =
      '<div class="result-area"><p class="error">' + escapeHtml(message) + "</p></div>";
  }

  function renderNoteForTsunami(el) {
    el.innerHTML =
      '<div class="result-area">' +
      "<p><strong>Sóng thần:</strong> NASA EONET có thể không có category “tsunami” ổn định để demo theo cách này.</p>" +
      "<p>Gợi ý: bạn có thể dùng USGS (động đất) hoặc NOAA (cảnh báo sóng thần) để làm trang này.</p>" +
      "</div>";
  }

  function renderEvents(el, data, category) {
    var events = (data && data.events) ? data.events : [];
    var title = category ? ("Kết quả: " + category) : "Kết quả: Natural Events";

    if (!events.length) {
      el.innerHTML =
        '<div class="result-area"><h3>' + escapeHtml(title) + "</h3><p>Không có dữ liệu.</p></div>";
      return;
    }

    var html = '';
    html += '<div class="result-area">';
    html += "<h3>" + escapeHtml(title) + "</h3>";
    html += "<p>Hiển thị " + events.length + " sự kiện gần đây.</p>";

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var evTitle = ev.title || "Untitled";
      var evLink = (ev.sources && ev.sources[0] && ev.sources[0].url) ? ev.sources[0].url : "";
      var evTime = "";
      // EONET v3: “geometry” chứa mốc thời gian + tọa độ
      if (ev.geometry && ev.geometry.length) {
        evTime = ev.geometry[0].date || "";
      }

      // Lấy toạ độ (nếu Point)
      var latLngText = "N/A";
      if (ev.geometry && ev.geometry.length && ev.geometry[0].coordinates) {
        var coords = ev.geometry[0].coordinates;
        // Nếu Point: [lng, lat]
        if (typeof coords[0] === "number" && typeof coords[1] === "number") {
          latLngText = "Lat " + coords[1] + ", Lng " + coords[0];
        }
      }

      html += '<div class="result-box">';
      html += "<div><strong>" + escapeHtml(evTitle) + "</strong></div>";
      html += "<div>Thời gian: " + escapeHtml(formatDate(evTime)) + "</div>";
      html += "<div>Toạ độ: " + escapeHtml(latLngText) + "</div>";

      if (evLink) {
        html += '<div><a href="' + escapeHtml(evLink) + '" target="_blank" rel="noopener">Xem nguồn</a></div>';
      }
      html += "</div>";
    }

    html += "</div>";
    el.innerHTML = html;
  }

  function init() {
    var mount = $("resultArea");
    if (!mount) return; // trang không cần hiển thị kết quả thì thôi

    var category = getCategory();

    // Nếu đang ở trang songthan và không có category -> show note
    var pageKey = inferPageKeyFromPath();
    if (pageKey === "songthan" && !category) {
      renderNoteForTsunami(mount);
      return;
    }

    renderLoading(mount);

    var url = buildUrl(category, 20);

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " - " + res.statusText);
        return res.json();
      })
      .then(function (data) {
        renderEvents(mount, data, category);
      })
      .catch(function (err) {
        renderError(mount, "Không tải được dữ liệu EONET. Chi tiết: " + (err && err.message ? err.message : err));
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
