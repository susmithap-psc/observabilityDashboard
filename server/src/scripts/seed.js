import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Project from '../models/Project.js';
import Event from '../models/Event.js';
import crypto from 'crypto';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Project.deleteMany({});
    await Event.deleteMany({});
    console.log('Cleared existing data');

    // Create demo user
    const user = await User.create({
      name: 'Demo User',
      email: 'demo@pulseboard.io',
      password: 'password123',
    });
    console.log('Created demo user: demo@pulseboard.io / password123');

    // Create workspace
    const workspace = await Workspace.create({
      name: 'Acme Startup',
      slug: 'acme-startup',
      description: 'Main workspace for Acme Startup engineering team',
      members: [{ user: user._id, role: 'owner' }],
      createdBy: user._id,
    });
    console.log('Created workspace: Acme Startup');

    // Create projects
    const projects = await Project.insertMany([
      {
        name: 'Frontend App',
        description: 'Main React frontend application',
        workspace: workspace._id,
        status: 'healthy',
        createdBy: user._id,
        integrations: {
          github: { enabled: true, repoOwner: 'acme', repoName: 'frontend-app' },
          sentry: { enabled: true, projectSlug: 'frontend-app', organizationSlug: 'acme' },
          uptimeRobot: { enabled: true, monitorId: 'mon-001' },
        },
      },
      {
        name: 'API Server',
        description: 'Node.js backend API service',
        workspace: workspace._id,
        status: 'degraded',
        createdBy: user._id,
        integrations: {
          github: { enabled: true, repoOwner: 'acme', repoName: 'api-server' },
          sentry: { enabled: true, projectSlug: 'api-server', organizationSlug: 'acme' },
          uptimeRobot: { enabled: true, monitorId: 'mon-002' },
        },
      },
      {
        name: 'Payment Service',
        description: 'Stripe payment processing microservice',
        workspace: workspace._id,
        status: 'healthy',
        createdBy: user._id,
        integrations: {
          github: { enabled: true, repoOwner: 'acme', repoName: 'payment-service' },
          sentry: { enabled: true, projectSlug: 'payment-service', organizationSlug: 'acme' },
        },
      },
    ]);
    console.log('Created 3 projects');

    // Seed events
    const eventTypes = [
      { type: 'deploy_success', severity: 'info', source: 'github' },
      { type: 'deploy_failed', severity: 'critical', source: 'github' },
      { type: 'ci_success', severity: 'info', source: 'github' },
      { type: 'ci_failure', severity: 'warning', source: 'github' },
      { type: 'error_new', severity: 'warning', source: 'sentry' },
      { type: 'error_spike', severity: 'critical', source: 'sentry' },
      { type: 'error_regression', severity: 'warning', source: 'sentry' },
      { type: 'downtime_started', severity: 'critical', source: 'uptimerobot' },
      { type: 'downtime_resolved', severity: 'info', source: 'uptimerobot' },
    ];

    const titles = {
      deploy_success: ['🚀 Deploy: v2.4.1 success', '🚀 Deploy: hotfix-auth success', '🚀 Deploy: feature-dashboard success'],
      deploy_failed: ['💥 Deploy: v2.5.0-beta failed', '💥 Deploy: staging-build failed'],
      ci_success: ['✅ CI: Unit Tests — passed', '✅ CI: E2E Tests — passed', '✅ CI: Lint & Build — passed'],
      ci_failure: ['❌ CI: Integration Tests — failed', '❌ CI: Build — compilation error'],
      error_new: ['🐛 TypeError: Cannot read property of undefined', '🐛 ReferenceError: stripe is not defined'],
      error_spike: ['🐛 Spike: 500 errors increased by 340%', '🐛 Spike: Auth endpoint timeout errors'],
      error_regression: ['🐛 Regression: Payment processing null pointer'],
      downtime_started: ['🔴 Uptime: api.acme.io is DOWN', '🔴 Uptime: payments.acme.io is DOWN'],
      downtime_resolved: ['🟢 Uptime: api.acme.io is UP', '🟢 Uptime: payments.acme.io is UP (after 12min)'],
    };

    const events = [];
    const now = Date.now();

    for (let i = 0; i < 80; i++) {
      const eventDef = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const project = projects[Math.floor(Math.random() * projects.length)];
      const titleOptions = titles[eventDef.type];
      const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
      const hoursAgo = Math.floor(Math.random() * 168); // Last 7 days

      events.push({
        fingerprint: crypto.randomBytes(16).toString('hex'),
        type: eventDef.type,
        severity: eventDef.severity,
        source: eventDef.source,
        project: project._id,
        workspace: workspace._id,
        title,
        description: `Auto-generated seed event for demo purposes.`,
        metadata: { seeded: true, index: i },
        status: Math.random() > 0.7 ? 'acknowledged' : 'open',
        occurredAt: new Date(now - hoursAgo * 60 * 60 * 1000),
      });
    }

    await Event.insertMany(events);
    console.log('Created 80 seed events');

    console.log('\n✅ Seed complete!');
    console.log('Login: demo@pulseboard.io / password123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
