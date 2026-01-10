import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySocketIO from 'fastify-socket.io';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const fastify = Fastify({
    logger: true,
});


// Register Plugins
await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

await fastify.register(fastifySocketIO, {
    cors: {
        origin: '*',
    }
});


import authRoutes from './routes/auth.js';


import electionRoutes from './routes/elections.js';
import voterRoutes from './routes/voters.js';
import publicRoutes from './routes/public.js';

fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(electionRoutes, { prefix: '/api/elections' });
fastify.register(voterRoutes, { prefix: '/api/elections' }); // Mounts on /api/elections/:id/voters
fastify.register(publicRoutes, { prefix: '/api/public' });





// Basic Health Check
fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
});

// Socket.io Connection
fastify.ready().then(() => {
    fastify.io.on('connection', (socket) => {
        fastify.log.info(`Socket connected: ${socket.id}`);

        socket.on('disconnect', () => {
            fastify.log.info(`Socket disconnected: ${socket.id}`);
        });

        // Join logic can go here (e.g. join room based on election ID)
        socket.on('join_election', (electionId) => {
            socket.join(`election:${electionId}`);
        });
    });
});

import { startScheduler } from './utils/scheduler.js';

// Start Server
const start = async () => {
    try {
        // Start Scheduler
        startScheduler();

        const PORT = process.env.PORT || 3000;
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
