-- Initialize database for AI Strategies
CREATE DATABASE ai_strategies;

-- Enable pgvector extension
\c ai_strategies;

CREATE EXTENSION IF NOT EXISTS vector;