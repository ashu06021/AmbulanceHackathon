import { io } from "socket.io-client";

// Connect to backend server
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  auth: {
    token: localStorage.getItem("token"), // your JWT token (already stored when login)
  },
});

export default socket;
