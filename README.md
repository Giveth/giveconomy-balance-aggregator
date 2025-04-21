# Giveconomy Balance Aggregator

## 1. Project Overview

### Purpose
The Giveconomy Balance Aggregator is a NestJS-based service that aggregates and manages token balances across the Giveth ecosystem. It serves as a central component for tracking and managing token balances across different networks and protocols.

### Key Features
- Token balance tracking and aggregation
- Multi-network support
- Real-time balance updates
- Subgraph integration for blockchain data
- Database persistence for historical data

### Live Links
- Production: [Coming Soon]
- Staging: [Coming Soon]

## 2. Architecture Overview

### System Diagram
```mermaid
graph TD
    A[Balance Aggregator] --> B[Token Balance Module]
    A --> C[Fetch State Module]
    A --> D[Subgraph Module]
    A --> E[Data Fetcher Module]
    B --> F[Database]
    C --> F
    D --> F
    E --> F
```

### Tech Stack
- **Backend Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **API Documentation**: Swagger
- **Testing**: Jest
- **Containerization**: Docker

### Data Flow
1. Data is fetched from various sources including subgraphs and blockchain networks
2. Data is processed and normalized in the respective modules
3. Processed data is stored in the PostgreSQL database
4. API endpoints provide access to the aggregated data

## 3. Getting Started

### Prerequisites
- Node.js 18.x
- PostgreSQL 12+
- Docker (optional)
- npm or yarn

### Installation Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/giveth/giveconomy-balance-aggregator.git
   cd giveconomy-balance-aggregator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   # Create a PostgreSQL database
   createdb giveconomy_balance_aggregator
   ```

### Configuration
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/giveconomy_balance_aggregator
PORT=3000
```

## 4. Usage Instructions

### Running the Application
- Development mode:
  ```bash
  npm run start:dev
  ```
- Production mode:
  ```bash
  npm run build
  npm run start:prod
  ```

### Testing
- Run all tests:
  ```bash
  npm test
  ```
- Run tests with coverage:
  ```bash
  npm run test:cov
  ```
- Run e2e tests:
  ```bash
  npm run test:e2e
  ```

### Common Tasks
- Database migrations:
  ```bash
  npm run typeorm migration:run
  ```
- Code formatting:
  ```bash
  npm run format
  ```
- Linting:
  ```bash
  npm run lint
  ```

## 5. Deployment Process

### Environments
- Development
- Staging
- Production

### Deployment Steps
1. Build the Docker image:
   ```bash
   docker build -t giveconomy-balance-aggregator .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 giveconomy-balance-aggregator
   ```

### CI/CD Integration
The project uses GitHub Actions for CI/CD. Workflows are defined in the `.github/workflows` directory.

## 6. Troubleshooting

### Common Issues
1. **Database Connection Issues**
   - Verify database credentials in `.env`
   - Check if PostgreSQL is running
   - Ensure database exists and is accessible

2. **Build Failures**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript compilation errors
   - Verify all environment variables are set

### Logs and Debugging
- Development logs are available in the console
- Production logs can be accessed through Docker:
  ```bash
  docker logs <container_id>
  ```
- Enable debug mode:
  ```bash
  npm run start:debug
  ```

## License
This project is licensed under the terms specified in the LICENSE file.
