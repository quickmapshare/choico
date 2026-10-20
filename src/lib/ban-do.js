// Link mở Google Maps cho một chợ. Chỉ là liên kết tới Google Maps, không lấy dữ liệu từ đó.
// Có tọa độ (lat, lng khác 0) thì dùng tọa độ. Không có thì tìm theo "Chợ <tên>, <phường>, <tỉnh>".
// Không dùng địa chỉ tự do vì dễ lệch sang nơi khác cùng tên.
export function linkGoogleMaps(cho) {
  const coToaDo = Boolean(cho.lat) && Boolean(cho.lng); // PocketBase trả 0 khi chưa nhập
  const truyVan = coToaDo
    ? `${cho.lat},${cho.lng}`
    : encodeURIComponent([`Chợ ${cho.ten}`, cho.khu?.ten, cho.khu?.tinh?.ten].filter(Boolean).join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${truyVan}`;
}
