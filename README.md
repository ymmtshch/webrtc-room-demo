Overview
This repository provides a minimal WebRTC room demo that runs entirely as a static site on GitHub Pages.
A “room” is represented purely by a URL parameter (e.g. ?room=abc123).
Users who open the same URL automatically join the same peer‑to‑peer session.
The project intentionally avoids any always‑on backend services.
All real‑time communication is established directly between browsers using WebRTC, while GitHub Pages is used only for static file hosting.

Key Features


✅ Serverless architecture
No EC2, no API Gateway, no persistent backend.


✅ Free hosting with HTTPS
Runs on GitHub Pages with built‑in TLS.


✅ Peer-to-peer communication
Media and data are exchanged directly between browsers via WebRTC.


✅ Room-based sessions via URL
A room is simply a shared URL parameter.


✅ Minimal attack surface
No user database, no login system, no stored personal data.


✅ Near-zero operating cost
Designed for demos, prototypes, academic use, and exhibitions.



Security Model (Important)

All signaling and page delivery occurs over HTTPS.
All peer-to-peer communication uses WebRTC’s mandatory DTLS/SRTP encryption.
The application does not implement user authentication or identity verification.
Access control is URL-based (“shared secret” model).

This project is suitable for:

Research demos
Prototyping and PoCs
Workshops and exhibitions
Education and experimentation

It is not intended for:

Handling personal or confidential information
Authenticated or access-controlled environments
Production services requiring strong identity management


Why This Project Exists
Many WebRTC examples rely on backend servers that significantly increase operational cost and complexity—even for small demos.
This repository demonstrates that:

A useful WebRTC application can be built with only static hosting
Modern browsers already provide strong encryption by default
For many non-production scenarios, serverless + P2P is the simplest and safest option


Technology Stack

Frontend: HTML / JavaScript
Hosting: GitHub Pages
Real-time communication: WebRTC (P2P)
Signaling: Lightweight, demo-oriented (replaceable)
