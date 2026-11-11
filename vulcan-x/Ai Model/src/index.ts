import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env';
import { AiProviderService } from './services/aiProviderService';
import { RagService } from './services/ragService';
import { PhysicsSimulatorService } from './services/physicsSimulatorService';
import { PhysicsEngineService } from './services/physicsEngineService';
import { AiController } from './controllers/aiController';
import { SimulatorController } from './controllers/simulatorController';
import { createMainRouter } from './routes';
import { NASA_PSI_KNOWLEDGE_BASE } from './data/nasa_psi_knowledge_base';

const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Dependency Injection: Initialize Services
const aiProviderService = new AiProviderService();
const ragService = new RagService(aiProviderService);
const physicsSimulatorService = new PhysicsSimulatorService(aiProviderService);
const physicsEngineService = new PhysicsEngineService(aiProviderService);

// Initialize Controllers
const aiController = new AiController(ragService, aiProviderService);
const simulatorController = new SimulatorController(physicsSimulatorService, physicsEngineService);

// Mount Application Routes
const mainRouter = createMainRouter(aiController, simulatorController);
app.route('/', mainRouter);

// Banner
console.log('================================================================');
console.log('🚀 VULCAN-X: AI Combustion Engine & Space Safety Backend');
console.log('🏆 2026 NASA Space Apps Challenge: "Flame in Freefall"');
console.log('================================================================');
console.log(`📡 Server running on: http://localhost:${env.PORT}`);
console.log(`📚 NASA PSI Datasets loaded: ${NASA_PSI_KNOWLEDGE_BASE.length} investigations`);
console.log(`🔑 5 OpenRouter API Key Rotation Pool: Active`);
console.log('----------------------------------------------------------------');
console.log(`• Knowledge & RAG Query : POST http://localhost:${env.PORT}/api/v1/ai/query`);
console.log(`• Habitat Stress Test   : POST http://localhost:${env.PORT}/api/v1/simulator/stress-test`);
console.log(`• Key Pool Health Status: GET  http://localhost:${env.PORT}/api/v1/ai/key-status`);
console.log(`• Datasets Catalog      : GET  http://localhost:${env.PORT}/api/v1/datasets`);
console.log('================================================================\n');

export default {
  port: env.PORT,
  fetch: app.fetch,
};

