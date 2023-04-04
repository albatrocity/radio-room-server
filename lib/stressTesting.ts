// setInterval(async () => {
//   const content = "Hello! Testing!";
//   const meta = {};
//   sendMessage({
//     user: {
//       username: users[0] ? users[0].username : "system",
//       id: users[0] ? users[0].id : "system",
//       userId: users[0] ? users[0].userId : "system"
//     },
//     content,
//     meta,
//     timestamp: new Date().toISOString()
//   });
// }, 500);
//
// let alt = false;
// setInterval(async () => {
//   io.emit("event", {
//     type: "TYPING",
//     data: { typing: alt ? [] : users[0] ? users[0].userId : null }
//   });
//   alt = !alt;
// }, 2000);
