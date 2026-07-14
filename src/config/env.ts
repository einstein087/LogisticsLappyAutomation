import dotenv from "dotenv";

// Load sample defaults first so local runs work even when only .env.example is populated.
dotenv.config({ path: ".env.example" });

// Load real environment values last so they override defaults from .env.example.
dotenv.config({ override: true });
