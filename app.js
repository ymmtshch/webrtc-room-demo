// URLの ?以降（クエリ文字列）を取得
const params = new URLSearchParams(window.location.search);

// room パラメータを取得
const roomId = params.get("room");

// デフォルト値（roomが無い場合）
const room = roomId || "default";

console.log("Current room:", room);
