fetch("https://eonet.gsfc.nasa.gov/api/v3/events")
  .then(res => res.json())
  .then(data => {
    var list = document.getElementById("disaster-list");
    list.innerHTML = "";

    var seaLakeIce = data.events.filter(function (event) {
      return event.categories[0].id === "seaLakeIce";
    });

    seaLakeIce = seaLakeIce.slice(0, 20);

    // tạo card để hiển thị các sự kiện
    seaLakeIce.forEach(function (ev) {
      var geo = ev.geometry[0];
      var coords = geo.coordinates; // [lng, lat]
      var lat = coords[1];
      var lng = coords[0];

      var dateText = new Date(geo.date).toLocaleString("vi-VN");
      var mapLink = "https://www.google.com/maps?q=" + lat + "," + lng;

      var li = document.createElement("li");
      li.className = "disaster-card";

      li.innerHTML =
        '<div class="disaster-banner">' +
        '<span class="disaster-badge">Wildfires</span>' +
        "</div>" +
        '<div class="disaster-content">' +
        '<h3 class="disaster-title">' +
        ev.title +
        "</h3>" +
        '<p class="disaster-meta"><strong>Thời gian:</strong> ' +
        dateText +
        "</p>" +
        '<div class="disaster-actions">' +
        '<a href="' +
        mapLink +
        '" target="_blank" rel="noopener">Xem trên bản đồ</a>' +
        "</div>" +
        "</div>";

      list.appendChild(li);
    });
  })
  .catch((err) => console.error(err));
