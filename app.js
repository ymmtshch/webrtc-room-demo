// URLの ?以降（クエリ文字列）を取得
const params = new URLSearchParams(window.location.search);

// room パラメータを取得
const roomId = params.get("room");

// デフォルト値（roomが無い場合）
const params = new URLSearchParams(window.location.search);
let room = params.get("room");

if (!room) {
  room = createRoomId();
  location.replace(`?room=${room}`);
}


console.log("Current room:", room);
