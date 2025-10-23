import { execSync } from 'child_process';
import { join } from 'path';

async function startDatabase() {
  console.log('Starting PostgreSQL database with Docker...');
  
  try {
    // Start the database using docker-compose
    execSync('docker-compose up -d postgres', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('Database started successfully');
    
    // Wait a bit for the database to be ready
    console.log('Waiting for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return true;
  } catch (error) {
    console.error('Error starting database:', error);
    return false;
  }
}

async function runMigrations() {
  console.log('Running Prisma migrations...');
  
  try {
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Run migrations
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('Migrations completed successfully');
    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
}

async function seedDatabase() {
  console.log('Seeding database with Kamino data...');
  
  try {
    // Import and run the seed script
    const { seedKaminoData } = await import('./seed-kamino-data');
    await seedKaminoData();
    
    console.log('Database seeding completed successfully');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}

async function main() {
  console.log('Setting up database and seeding with Kamino data...');
  
  try {
    // Step 1: Start database
    const dbStarted = await startDatabase();
    if (!dbStarted) {
      throw new Error('Failed to start database');
    }
    
    // Step 2: Run migrations
    const migrationsCompleted = await runMigrations();
    if (!migrationsCompleted) {
      throw new Error('Failed to run migrations');
    }
    
    // Step 3: Seed database
    const seedingCompleted = await seedDatabase();
    if (!seedingCompleted) {
      throw new Error('Failed to seed database');
    }
    
    console.log('Database setup and seeding completed successfully!');
    console.log('You can now connect to the database at localhost:5432');
    console.log('Database: ai_strategies');
    console.log('User: postgres');
    console.log('Password: postgres123');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { main as setupDatabase };
