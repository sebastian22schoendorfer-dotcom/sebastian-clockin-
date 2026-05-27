-- Foundational extensions. Schema, tables, and RLS land in Milestone 1.
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "postgis";
create extension if not exists "citext";
