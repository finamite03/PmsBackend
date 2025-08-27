// // utils/auth.ts
// import { jwtDecode } from "jwt-decode";

// interface JWTPayload {
//   id: number;
//   email: string;
//   role: string;
//   iat?: number; // issued at
//   exp?: number; // expiry
// }

// export function decodeToken(token: string): JWTPayload | null {
//   try {
//     return jwtDecode<JWTPayload>(token);
//   } catch (e) {
//     console.error("Invalid token:", e);
//     return null;
//   }
// }


// Login.tsx
// import { decodeToken } from "../utils/auth";

// async function handleLogin() {
//   const res = await fetch("http://localhost:5000/api/user/login", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ email, password }),
//   });

//   const data = await res.json();

//   if (data.token) {
//     // Save token (localStorage or cookies)
//     localStorage.setItem("authToken", data.token);

//     // Decode payload
//     const decoded = decodeToken(data.token);
//     console.log("Logged in as:", decoded);

//     // Example: store in React state/context
//     setUser(decoded);
//   } else {
//     alert(data.error || "Login failed");
//   }
// }
